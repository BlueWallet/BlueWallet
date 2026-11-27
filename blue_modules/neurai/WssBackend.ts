import { assertNoDuplicateJsonKeys, parseRpcJson, stringifyRpcJson } from '@neuraiproject/neurai-rpc';
import { parseRawSats, parseMoneySats, satsToXna } from './amounts';
/**
 * Backend for neurai-wallet-services.
 *
 * The service speaks a JSON-RPC-like protocol over WebSocket at `/push`:
 * `hello`, `ping`, `address.get_state`, `tx.broadcast`, plus pushed events.
 * This adapter maps that protocol onto the wallet's `NeuraiBackend` surface.
 */

import { AddressDelta, BackendConfig, FeeEstimate, MempoolEntry, NeuraiBackend, NeuraiUtxo } from './NeuraiBackend';
import { CHAIN_PARAMS, type NeuraiChainType } from './networkConfig';
import { LOCAL_FEE_RATE_XNA_PER_KB } from './feePolicy';

// Existing service methods preserve DePIN protocol-2 authentication and quotas.
const DEPIN_METHODS: Record<string, string> = {
  checkdepinvalidity: 'depin.check_validity',
  listdepinholders: 'depin.list_holders',
  listdepinaddresses: 'depin.list_addresses',
  getpubkey: 'depin.get_pubkey',
  depingetancestorrecipients: 'depin.ancestor_recipients',
  depingetmsginfo: 'depin.msg_info',
  depinpoolstats: 'depin.pool_stats',
  depinmcpstatus: 'depin.mcp_status',
  depinchallenge: 'depin.challenge',
  depinreceivemsg: 'depin.receive_msg',
  depinreceiveseq: 'depin.receive_seq',
  depinsubmitmsg: 'depin.submit_msg',
  depinlistsections: 'depin.sections',
  depinclearmsg: 'depin.clear_msg',
};

const WIRE_PROTOCOL = 'wss';
const APP_PROTOCOL = 'wss/2';
const CLIENT_NAME = 'NeuraiWallet';
const REQUEST_TIMEOUT_MS = 15_000;

type WebSocketLike = {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data?: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: (() => void) | null;
};

type WebSocketCtor = new (url: string, protocols?: string | string[]) => WebSocketLike;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

type WssError = {
  code?: number;
  message?: string;
  [key: string]: unknown;
};

type WssResponse<T> = {
  id?: number | string | null;
  result?: T;
  error?: WssError;
  method?: string;
  params?: unknown;
};

type WssHello = {
  service_id?: string;
  genesis_hash?: string;
  network?: string;
  protocol?: string;
  exact_amounts?: boolean;
  amounts?: string;
  wallet_rpc?: { methods?: string[]; amounts?: string; numeric_encoding?: string };
  tip_height?: number | null;
  tip_hash?: string | null;
};

type WssBalance = {
  confirmed?: bigint | string | number;
  unconfirmed?: bigint | string | number;
};

type WssHistory = {
  txid: string;
  height: number;
  tx_index?: number;
  asset?: string;
  satoshis?: bigint | string | number;
  block_time?: number;
};

type WssUtxo = {
  txid: string;
  vout: number;
  satoshis: bigint | string | number;
  height?: number;
  asset?: string;
};

type WssMempool = {
  txid: string;
  satoshis?: bigint | string | number;
  prev_txid?: string | null;
  prev_vout?: number | null;
};

type PageInfo = {
  has_more?: boolean;
  next_cursor?: string | null;
};

type WssAddressState = {
  address: string;
  balance?: WssBalance;
  mempool?: WssMempool[];
  history?: WssHistory[];
  utxos?: WssUtxo[];
  asset_utxos?: WssUtxo[];
  page?: PageInfo;
  utxo_page?: PageInfo;
};

function getWebSocketCtor(): WebSocketCtor {
  const ctor = (globalThis as unknown as { WebSocket?: WebSocketCtor }).WebSocket;
  if (!ctor) throw new Error('WebSocket is not available in this runtime');
  return ctor;
}

function responseError(error: WssError): Error {
  const err = new Error(error.message || 'WSS request failed') as Error & { code?: number; nodeCode?: number; data?: unknown; details?: WssError };
  err.code = error.code;
  err.details = error;
  if(typeof error.node_code === "number") err.nodeCode=error.node_code;
  if(error.data !== undefined) err.data=error.data;
  return err;
}

function isOpen(ws: WebSocketLike | null): boolean {
  return !!ws && ws.readyState === 1;
}

/** Payload of an `address.changed` server push. Mirrors the protocol doc. */
export type AddressChangedEvent = {
  address: string;
  status?: string;
  reason?: 'block' | 'mempool' | 'resync' | 'manual';
  height?: number;
  balance?: { confirmed?: bigint | string | number; unconfirmed?: bigint | string | number };
  delta?: {
    added_txids?: string[];
    confirmed_txids?: string[];
    removed_txids?: string[];
    touched_assets?: string[];
  };
};

export type AddressChangedListener = (event: AddressChangedEvent) => void;

export class WssBackend implements NeuraiBackend {
  readonly kind = 'wss' as const;
  readonly chain: NeuraiChainType;

  private readonly url: string;
  private exactAmounts = false;
  private readonly expectedNetwork: string;
  private readonly expectedGenesisHash?: string;
  private hello?: WssHello;
  private staleAddresses = new Set<string>();
  private pendingSubscriptions = new Set<string>();
  private syncListeners = new Set<() => void>();

  getServiceStatus(): 'stale' | 'legacy' | 'exact' {
    if (!isOpen(this.ws) || this.staleAddresses.size) return 'stale';
    return this.exactAmounts ? 'exact' : 'legacy';
  }

  onSyncStatus(listener: () => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private syncChanged(): void {
    for (const listener of this.syncListeners) listener();
  }

  private setStale(address: string, stale: boolean): void {
    if (this.staleAddresses.has(address) === stale) return;
    if (stale) this.staleAddresses.add(address);
    else this.staleAddresses.delete(address);
    this.syncChanged();
  }

  private readonly authToken?: string;
  private ws: WebSocketLike | null = null;
  private connectPromise: Promise<void> | null = null;
  private resumePromise: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<number | string, PendingRequest>();
  private tipHeight = 0;
  /** Addresses the wallet wants the server to push events for. Mirrored to
   * the server via `address.subscribe.bulk` on every (re)connect. */
  private subscribedAddresses = new Set<string>();
  /** Last status hash the server reported per address. Used to suppress
   * spurious refetches on focus when nothing actually changed since the
   * previous session. Seeded from persisted wallet state via
   * `seedKnownStatuses` and updated on every subscribe.bulk response and
   * address.changed push. */
  private knownStatuses = new Map<string, string>();
  /** Listeners notified when the server pushes `address.changed`. The wallet
   * uses this to drive re-fetches without periodic client polling. */
  private addressChangedListeners = new Set<AddressChangedListener>();
  /** Listeners notified when the server pushes `chain.tip` (a new block). */
  private chainTipListeners = new Set<(height: number) => void>();

  constructor(config: Omit<BackendConfig, 'kind'>) {
    this.chain = config.chain;
    this.expectedNetwork = config.expectedNetwork ?? CHAIN_PARAMS[this.chain].network;
    this.expectedGenesisHash = config.expectedGenesisHash;
    if (this.expectedNetwork === 'regtest' && !this.expectedGenesisHash) throw new Error('Regtest requires an explicit genesis hash');
    this.url = config.url;
    this.authToken = config.authToken || config.password;
  }

  /**
   * Replace the address set the server pushes events for. Idempotent —
   * passing the same set is a no-op; passing a different one triggers a
   * `subscribe.bulk` (and an `unsubscribe.bulk` for dropped addresses) on
   * the live socket if connected. On future reconnects the latest set is
   * resubscribed automatically.
   *
   * Also auto-connects: callers don't need to issue a separate request to
   * establish the WebSocket; this method establishes it and runs the
   * subscribe handshake. The promise resolves once the server has accepted
   * the subscription (or rejects if the connection fails), so the wallet
   * knows when push events will start flowing.
   */
  async setSubscribedAddresses(addresses: string[]): Promise<void> {
    const next = new Set(addresses.filter(a => typeof a === 'string' && a.length > 0));
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    // A requested subscription can have failed (including a per-address
    // error in an otherwise successful batch). Retry those on screen focus.
    for (const a of next) {
      if ((!this.subscribedAddresses.has(a) || this.staleAddresses.has(a)) && !this.pendingSubscriptions.has(a)) toAdd.push(a);
    }
    for (const a of this.subscribedAddresses) if (!next.has(a)) toRemove.push(a);
    this.subscribedAddresses = next;
    // Notify only when the stale set really moved. A failed address is retried
    // on every call, so announcing each retry made every screen focus emit a
    // wallet change — a full save and re-render — that changed nothing.
    const staleBefore = this.staleAddresses.size;
    for (const address of toRemove) this.staleAddresses.delete(address);
    for (const address of toAdd) this.staleAddresses.add(address);
    if (this.staleAddresses.size !== staleBefore) this.syncChanged();
    // Establish the WS if needed. ensureConnected runs the full subscribe.bulk
    // for all currently-subscribed addresses on first connect, so we only
    // need to handle the diff path when the socket is already open.
    if (!isOpen(this.ws)) {
      if (next.size === 0) return;
      try {
        await this.ensureConnected();
      } catch (err) {
        console.debug('WssBackend.setSubscribedAddresses: connect failed', err);
      }
      return;
    }
    try {
      if (toRemove.length > 0) {
        for (const a of toRemove) this.knownStatuses.delete(a);
        await this.sendRequest('address.unsubscribe.bulk', { addresses: toRemove });
      }
      if (toAdd.length > 0) {
        await this.subscribeAddresses(toAdd);
      }
    } catch (err) {
      console.debug('WssBackend.setSubscribedAddresses: subscribe diff failed', err);
    }
  }

  private async subscribeAddresses(addresses: string[]): Promise<void> {
    for (const address of addresses) this.pendingSubscriptions.add(address);
    try {
      const result = await this.sendRequest<{
        results?: Array<{ address: string; status?: string; balance?: WssBalance; height?: number }>;
      }>('address.subscribe.bulk', { addresses });
      this._processSubscribeResults(result?.results);
    } finally {
      for (const address of addresses) this.pendingSubscriptions.delete(address);
    }
  }

  /** Seed the per-address status cache from persisted wallet state so the
   * first subscribe.bulk after app cold start can suppress refetches when
   * nothing changed while the app was closed. */
  seedKnownStatuses(statuses: Record<string, string>): void {
    for (const [addr, status] of Object.entries(statuses || {})) {
      if (typeof addr === 'string' && typeof status === 'string') {
        this.knownStatuses.set(addr, status);
      }
    }
  }

  /** Snapshot of the current per-address status cache. The wallet persists
   * this to disk so the next app launch can suppress redundant refetches. */
  getKnownStatuses(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [addr, status] of this.knownStatuses) out[addr] = status;
    return out;
  }

  /** Register a listener for server-pushed `address.changed` events. Returns
   * an unsubscribe function. */
  onAddressChanged(listener: AddressChangedListener): () => void {
    this.addressChangedListeners.add(listener);
    return () => this.addressChangedListeners.delete(listener);
  }

  /** Register a listener for server-pushed `chain.tip` events, one per new
   * block. Returns an unsubscribe function. */
  onChainTip(listener: (height: number) => void): () => void {
    this.chainTipListeners.add(listener);
    return () => this.chainTipListeners.delete(listener);
  }

  /**
   * Walk the `address.subscribe.bulk` response and, for every address whose
   * `status` doesn't match what we have cached, synthesize an
   * `address.changed` event so listeners refetch. Addresses whose status
   * matches the cache are silently ignored — that's the whole point of the
   * status-diff design: opening the wallet while nothing changed costs one
   * subscribe round-trip, not a full history refetch.
   */
  private _processSubscribeResults(
    results: Array<{ address: string; status?: string; balance?: WssBalance; height?: number }> | undefined,
  ): void {
    if (!Array.isArray(results)) return;
    let diffs = 0;
    for (const r of results) {
      if (!r || typeof r.address !== 'string' || typeof r.status !== 'string') continue;
      if (r.balance) {
        this.rawAmount(r.balance.confirmed);
        this.rawAmount(r.balance.unconfirmed);
      }
      this.setStale(r.address, false);
      const prev = this.knownStatuses.get(r.address);
      if (prev === r.status) continue;
      diffs++;
      const event: AddressChangedEvent = {
        address: r.address,
        status: r.status,
        reason: 'resync',
        height: r.height,
        balance: r.balance
          ? { confirmed: this.rawAmount(r.balance.confirmed), unconfirmed: this.rawAmount(r.balance.unconfirmed) }
          : undefined,
      };
      this.knownStatuses.set(r.address, r.status);
      for (const listener of this.addressChangedListeners) {
        try {
          listener(event);
        } catch (err) {
          console.debug('WssBackend subscribe-diff listener threw', err);
        }
      }
    }
    if (diffs > 0) console.log('[WssBackend]', this.chain, 'subscribe.bulk diffs=', diffs, 'of', results.length);
  }

  async rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
    await this.ensureConnected();
    if (!this.exactAmounts) throw new Error('Wallet operations require exact amounts (wss/2)');
    if (method === 'sendrawtransaction') return (await this.broadcast(params[0] as string)) as T;
    if (Object.prototype.hasOwnProperty.call(DEPIN_METHODS, method)) return this.serviceRequest<T>(DEPIN_METHODS[method], { args: params });
    const capability = this.hello?.wallet_rpc;
    if (
      capability?.amounts !== 'rpc-native-units' ||
      capability.numeric_encoding !== 'safe-number-or-string' ||
      !Array.isArray(capability.methods) ||
      !capability.methods.includes(method)
    ) {
      throw new Error(`Wallet service must support ${method} over WSS; update neurai-wallet-services`);
    }
    return this.serviceRequest<T>('rpc.call', { method, params });
  }

  private rawAmount(value: unknown): bigint {
    const raw = parseRawSats(value);
    if (!this.exactAmounts && (raw > BigInt(Number.MAX_SAFE_INTEGER) || raw < -BigInt(Number.MAX_SAFE_INTEGER))) {
      throw new Error('This wallet service must support exact amounts (wss/2) to read this balance');
    }
    return raw;
  }

  async getTipHeight(): Promise<number> {
    await this.ensureConnected();
    return this.tipHeight;
  }

  async getBalance(addresses: string[]): Promise<bigint> {
    if (addresses.length === 0) return 0n;
    const states = await Promise.all(addresses.map(address => this.fetchAddressState(address, false, false)));
    const sats = states.reduce((sum, state) => sum + parseMoneySats(this.rawAmount(state.balance?.confirmed)), 0n);
    return sats;
  }

  async getAddressHistory(addresses: string[]): Promise<AddressDelta[]> {
    if (addresses.length === 0) return [];
    const batches = await Promise.all(addresses.map(address => this.fetchFullHistory(address)));
    return batches.flat();
  }

  async getUtxos(addresses: string[]): Promise<NeuraiUtxo[]> {
    if (addresses.length === 0) return [];
    const batches = await Promise.all(addresses.map(address => this.fetchFullUtxos(address)));
    return batches.flat();
  }

  async getMempool(addresses: string[]): Promise<MempoolEntry[]> {
    if (addresses.length === 0) return [];
    const batches = await Promise.all(
      addresses.map(async address => {
        const state = await this.fetchAddressState(address, false, false);
        return (state.mempool || []).map((m, index) => this.toMempoolEntry(address, m, index));
      }),
    );
    return batches.flat();
  }

  async broadcast(rawTxHex: string): Promise<string> {
    const response = await this.serviceRequest<{ txid: string }>('tx.broadcast', { rawtx: rawTxHex });
    return response.txid;
  }

  async estimateFee(targetBlocks: number): Promise<FeeEstimate> {
    return { targetBlocks, feeRateXnaPerKb: LOCAL_FEE_RATE_XNA_PER_KB };
  }

  async getBlockTimes(_heights: number[]): Promise<Record<number, number>> {
    return {};
  }

  async ping(): Promise<boolean> {
    try {
      const pong = await this.serviceRequest<string>('ping', {});
      return pong === 'pong';
    } catch {
      return false;
    }
  }

  private async fetchHistoryPage(address: string, withAssets: boolean): Promise<AddressDelta[]> {
    const out: AddressDelta[] = [];
    let cursor: string | null = null;
    do {
      const extra = withAssets ? { cursor, assets: true } : { cursor };
      const state = await this.fetchAddressState(address, true, false, extra);
      out.push(...(state.history || []).map(item => this.toAddressDelta(address, item)));
      cursor = state.page?.has_more ? state.page.next_cursor || null : null;
    } while (cursor);
    return out;
  }

  private async fetchFullHistory(address: string): Promise<AddressDelta[]> {
    // `assets: true` makes the service include non-native asset deltas in the
    // history (it switches `getaddressdeltas` to the `assetName: "*"` call).
    // Some nodes/services reject that wildcard and the service then returns an
    // EMPTY history — which would silently hide all XNA transactions. So when
    // the asset-aware call comes back empty, fall back to the native-only call
    // so XNA history still shows.
    const withAssets = await this.fetchHistoryPage(address, true);
    if (withAssets.length > 0) return withAssets;
    const nativeOnly = await this.fetchHistoryPage(address, false);
    if (nativeOnly.length > 0) {
      console.warn(
        '[Neurai] history fallback (assets wildcard returned empty):',
        JSON.stringify({ address: address.slice(0, 14), nativeOnly: nativeOnly.length }),
      );
    }
    return nativeOnly;
  }

  private async fetchFullUtxos(address: string, assetName?: string): Promise<NeuraiUtxo[]> {
    const wantsAssets = assetName === '*';
    const state = await this.fetchAddressState(address, false, true, {
      assets: wantsAssets ? true : undefined,
      utxo_limit: 0,
    });
    const native = (state.utxos || []).map(item => this.toUtxo(address, item, 'XNA'));
    if (!assetName) return native;
    const assets = (state.asset_utxos || []).map(item => this.toUtxo(address, item, item.asset || ''));
    if (assetName === '*') return [...native, ...assets];
    return assets.filter(u => u.assetName === assetName);
  }

  private async fetchAddressState(
    address: string,
    includeHistory: boolean,
    includeUtxos: boolean,
    extra?: Record<string, unknown>,
  ): Promise<WssAddressState> {
    await this.ensureConnected();
    const connection = this.ws;
    try {
      const state = await this.sendRequest<WssAddressState>('address.get_state', {
        address,
        include_history: includeHistory,
        include_utxos: includeUtxos,
        ...extra,
      });
      parseMoneySats(this.rawAmount(state.balance?.confirmed));
      this.rawAmount(state.balance?.unconfirmed);
      for (const rows of [state.history, state.mempool, state.utxos, state.asset_utxos]) {
        for (const row of rows || []) this.rawAmount(row.satoshis);
      }
      if (this.ws === connection) this.setStale(address, false);
      return state;
    } catch (error) {
      // An interrupted background request must not mark the new session stale.
      if (this.ws === connection) this.setStale(address, true);
      throw error;
    }
  }

  private toAddressDelta(address: string, item: WssHistory): AddressDelta {
    const index = typeof item.tx_index === 'number' ? item.tx_index : 0;
    return {
      address,
      assetName: item.asset || 'XNA',
      blockindex: index,
      height: item.height,
      index,
      satoshis: this.rawAmount(item.satoshis),
      txid: item.txid,
      ...(typeof item.block_time === 'number' ? { time: item.block_time } : {}),
    };
  }

  private toUtxo(address: string, item: WssUtxo, assetName: string): NeuraiUtxo {
    return {
      address,
      assetName: assetName || 'XNA',
      height: item.height,
      outputIndex: item.vout,
      script: '',
      satoshis: parseMoneySats(this.rawAmount(item.satoshis)),
      txid: item.txid,
      value: satsToXna(this.rawAmount(item.satoshis)),
    };
  }

  private toMempoolEntry(address: string, item: WssMempool, index: number): MempoolEntry {
    return {
      address,
      assetName: 'XNA',
      txid: item.txid,
      index,
      satoshis: this.rawAmount(item.satoshis),
      timestamp: Math.floor(Date.now() / 1000),
      prevtxid: item.prev_txid || '',
      prevout: item.prev_vout ?? 0,
    };
  }

  private async ensureConnected(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;
    if (isOpen(this.ws)) return;
    const attempt = this.openConnection(APP_PROTOCOL).catch(error => {
      if (error?.code !== 1001) throw error;
      // Legacy services close the socket after rejecting wss/2. Negotiate v1
      // on a fresh connection, sharing the retry with all concurrent callers.
      return this.openConnection('wss/1');
    });
    this.connectPromise = attempt;
    try {
      await attempt;
    } finally {
      if (this.connectPromise === attempt) this.connectPromise = null;
    }
  }

  private openConnection(protocol: string): Promise<void> {
    const protocols = this.authToken ? [WIRE_PROTOCOL, `auth.${this.authToken}`] : [WIRE_PROTOCOL];
    const ws = new (getWebSocketCtor())(this.url, protocols);
    this.ws = ws;
    for (const address of this.subscribedAddresses) this.staleAddresses.add(address);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`WSS connection timeout: ${this.url}`));
        if (this.ws === ws) this.close();
      }, REQUEST_TIMEOUT_MS);

      ws.onmessage = event => {
        if (this.ws === ws) this.handleMessage(event.data);
      };
      ws.onerror = event => {
        reject(new Error(`WSS connection failed: ${String(event)}`));
      };
      ws.onclose = () => {
        clearTimeout(timer);
        // Settle an interrupted handshake even after close() detached this socket.
        reject(new Error('WSS connection closed'));
        if (this.ws !== ws) return;
        this.rejectPending(new Error('WSS connection closed'));
        this.ws = null;
        this.exactAmounts = false;
        this.syncChanged();
      };
      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.sendRequest<WssHello>('hello', {
          client: CLIENT_NAME,
          network: this.expectedNetwork,
          protocol,
        })
          .then(async hello => {
            this.hello = hello;
            if (hello.network && hello.network !== this.expectedNetwork) throw new Error('Wallet service network mismatch');
            if (this.expectedGenesisHash && hello.genesis_hash && hello.genesis_hash !== this.expectedGenesisHash)
              throw new Error('Wallet service genesis mismatch');
            this.exactAmounts = hello.protocol === 'wss/2' && hello.exact_amounts === true && hello.amounts === 'string-sats';
            if (hello.protocol === 'wss/2' && !this.exactAmounts) throw new Error('Wallet service did not confirm exact amounts');
            clearTimeout(timer);
            if (typeof hello.tip_height === 'number') this.tipHeight = hello.tip_height;
            // Re-subscribe to any addresses the wallet asked for in a previous
            // session. The server uses this to push address.changed events
            // back to us — no client-side polling. The response carries the
            // current per-address status hash; we compare with the cached
            // value and fire synthetic address.changed events only for
            // addresses where something actually changed while the app was
            // closed, so opening the wallet is cheap when nothing happened.
            if (this.subscribedAddresses.size > 0) {
              try {
                await this.subscribeAddresses(Array.from(this.subscribedAddresses));
              } catch (err) {
                console.debug('[WssBackend] subscribe.bulk failed', err);
              }
            }
            this.syncChanged();
            resolve();
          })
          .catch(err => {
            clearTimeout(timer);
            reject(err);
            if (this.ws === ws) this.close();
          });
      };
    });
  }

  private async serviceRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
    await this.ensureConnected();
    return this.sendRequest<T>(method, params);
  }

  private sendRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const ws = this.ws;
    if (!isOpen(ws)) return Promise.reject(new Error('WSS connection is not open'));
    const openWs = ws as WebSocketLike;

    const id = this.nextId++;
    const payload = stringifyRpcJson({ id, method, params });
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`WSS request timeout: ${method}`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
      openWs.send(payload);
    });
  }

  private handleMessage(data: unknown): void {
    const text = typeof data === 'string' ? data : String(data ?? '');
    let msg: WssResponse<unknown>;
    try {
      assertNoDuplicateJsonKeys(text);
      msg = parseRpcJson(text) as WssResponse<unknown>;
    } catch {
      return;
    }

    if (msg.method) {
      this.handleEvent(msg.method, msg.params);
      return;
    }

    if (msg.id == null) return;
    const pending = this.pending.get(msg.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(msg.id);
    if (msg.error) pending.reject(responseError(msg.error));
    else pending.resolve(msg.result);
  }

  private handleEvent(method: string, params: unknown): void {
    if (method === 'address.sync_status') {
      const event = params as { address?: unknown; stale?: unknown };
      if (event && typeof event.address === 'string' && typeof event.stale === 'boolean') this.setStale(event.address, event.stale);
      return;
    }
    if (method === 'chain.tip') {
      const tip = params as { height?: unknown };
      if (typeof tip.height !== 'number') return;
      this.tipHeight = tip.height;
      for (const listener of this.chainTipListeners) {
        try {
          listener(tip.height);
        } catch (err) {
          console.debug('WssBackend chain.tip listener threw', err);
        }
      }
      return;
    }
    if (method === 'address.changed') {
      const event = params as AddressChangedEvent;
      if (!event || typeof event.address !== 'string') return;
      if (event.balance) {
        try {
          event.balance = { confirmed: this.rawAmount(event.balance.confirmed), unconfirmed: this.rawAmount(event.balance.unconfirmed) };
        } catch (error) {
          console.warn('Invalid wallet service amount', error);
          return;
        }
      }
      this.setStale(event.address, false);
      if (typeof event.status === 'string') {
        const prev = this.knownStatuses.get(event.address);
        this.knownStatuses.set(event.address, event.status);
        if (prev === event.status) return; // duplicate push, nothing to do
      }
      // Fan out to listeners. They typically re-fetch the address's state
      // and update the wallet's persisted history/balance.
      for (const listener of this.addressChangedListeners) {
        try {
          listener(event);
        } catch (err) {
          console.debug('WssBackend address.changed listener threw', err);
        }
      }
    }
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  /** Android may leave a suspended socket reporting OPEN. Start a fresh
   * session on foreground entry, including entry through a notification.
   */
  async resumeConnection(): Promise<void> {
    if (this.resumePromise) return this.resumePromise;
    const previous = this.connectPromise;
    this.close();
    const attempt = (async () => {
      await previous?.catch(() => undefined);
      await this.ensureConnected();
    })();
    this.resumePromise = attempt;
    try {
      await attempt;
    } finally {
      if (this.resumePromise === attempt) this.resumePromise = null;
    }
  }

  disconnect(): void {
    this.close();
  }

  private close(): void {
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
    this.exactAmounts = false;
    this.rejectPending(new Error('WSS connection closed'));
    this.syncChanged();
  }
}
