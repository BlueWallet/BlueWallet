import { parseRawSats, parseMoneySats, satsToXna, xnaToSats, compareSats, amountFromInput } from '../../blue_modules/neurai/amounts';
/**
 * External-signing Neurai hardware wallet (NeuraiHW / ESP32 over USB).
 *
 * Watch-only wallet over a device that holds the keys; the app never has a
 * mnemonic or private key. Two modes, by the device's `key_type`:
 *
 *  - **pq** (ML-DSA-44 / AuthScript): a SINGLE reused address (`nq1…`/`tnq1…`).
 *    The device exposes one pubkey; signing uses `sign_tx` (raw transaction).
 *
 *  - **legacy** (ECDSA P2PKH): a full **HD account** imported from the device's
 *    account xpub (`get_bip32_pubkey`, `m/44'/coin'/0'`). The app derives
 *    receive (`0/i`) and change (`1/i`) addresses from the xpub, discovers used
 *    ones by gap limit, and watches them all. Signing builds a PSBT with
 *    per-input derivation paths and uses `sign_psbt` (the device signs each
 *    input from its root key via the embedded paths).
 *
 * Balance / history / UTXOs are fetched per-address through the normal backend
 * (no engine bootstrap).
 */

import NeuraiJsWallet from '@neuraiproject/neurai-jswallet';
import { Buffer } from 'buffer';
import { HARDWARE_WALLET_TYPE_READABLE } from '../../blue_modules/neurai-hw/walletLabel';
import { Transaction } from 'bitcoinjs-lib';
import {
  buildAssetTransferDisplayMetadata,
  buildPSBTFromRawTransaction,
  encodeDestinationScript,
  finalizeSignedPSBT,
  normalizeDeviceAuthScriptAddress,
} from '@neuraiproject/neurai-sign-esp32/react-native';
import type {
  IAddressResponse,
  IBip32PubkeyResponse,
  IDeviceInfo,
  IPQSignInput,
  IPSBTInputMetadata,
  ISigningDisplayMetadata,
  NetworkType,
  NeuraiESP32,
} from '@neuraiproject/neurai-sign-esp32/react-native';
import { createStandardAssetTransferTransaction, createPaymentTransaction } from '@neuraiproject/neurai-create-transaction';

import { markerForChain } from '../../blue_modules/neurai/assetMarker';

import { chainFor, NeuraiChainType, WalletKind } from '../../blue_modules/neurai';
import { emitWalletChanged } from '../../blue_modules/neurai/eventBus';
import { getAssetType } from '../../blue_modules/neurai/assetUtils';
import { estimateNeuraiFeeSats } from '../../blue_modules/neurai/feeEstimate';
import { dustThresholdSats } from '../../blue_modules/neurai/dust';
import { AbstractNeuraiWallet, type NeuraiAddressEntry } from './abstract-neurai-wallet';
import { walletIdV2 } from './wallet-id';
import { withDevice } from '../../blue_modules/neurai-hw/deviceQueue';
import { assertSignedMatchesDraft } from '../../blue_modules/neurai-hw/verifySignedTx';
import { deriveLegacyAddress } from '../../blue_modules/neurai-hw/xpubDerivation';

/** Minimal UTXO shape returned by `getaddressutxos`. */
interface HwUtxo {
  txid: string;
  outputIndex: number;
  satoshis: bigint;
  address: string;
  assetName?: string;
  script: string;
}

/** Greedy selection: accumulate UTXOs until `needed` (sats / asset raw) is covered. */
function pickUtxos<T extends { satoshis: bigint }>(utxos: T[], needed: bigint): T[] {
  const out: T[] = [];
  let sum = 0n;
  for (const u of utxos) {
    if (sum >= needed) break;
    out.push(u);
    sum += u.satoshis;
  }
  if (sum < needed) throw new Error(`Insufficient funds — need ${needed}, have ${sum}`);
  return out;
}

/** Gap limit for HD address discovery (consecutive unused before stopping). */
const GAP_LIMIT = 20;
/** Reuse a discovery result for this long to coalesce the balance/history/utxo burst. */
const DISCOVERY_TTL_MS = 8000;
/** Drop change below this many satoshis into the fee (at least the node's dust for the change type). */
const CHANGE_DUST_SATS = 1000n;
const changeDustSats = (address: string): bigint => {
  const dust = dustThresholdSats(address);
  return dust > CHANGE_DUST_SATS ? dust : CHANGE_DUST_SATS;
};

interface AddrMeta {
  change: 0 | 1;
  index: number;
  pubkeyHex: string;
  /** Full BIP32 path, e.g. m/44'/1900'/0'/0/5. */
  path: string;
}

/** Unsigned send staged for the device. Shape depends on the key type. */
export interface NeuraiHwUnsignedSend {
  keyType: WalletKind;
  /** Computed fee in satoshis. */
  feeSats: bigint;
  /** Value (in sats) actually sent to the recipient. For a send-max this is
   * `totalInputs − fee`; the net wallet debit is `amountSats + feeSats`. */
  amountSats: bigint;
  /** PQ: raw unsigned transaction hex + per-input metadata for `sign_tx`. */
  rawTxHex?: string;
  inputs?: IPQSignInput[];
  /** Legacy: base64 PSBT for `sign_psbt`. */
  psbtBase64?: string;
  /** Present for an asset transfer: the token name and amount (full units). */
  asset?: { name: string; amount: string };
  /** Device display metadata — drives what the NeuraiHW screen shows. For an
   * asset transfer this makes the device show the token name and amount. */
  display?: ISigningDisplayMetadata;
}

function chainForDevice(network: string | undefined, keyType: WalletKind): NeuraiChainType {
  const isTestnet = (network ?? '').toLowerCase().includes('test');
  return chainFor(isTestnet ? 'testnet' : 'mainnet', keyType);
}

export class NeuraiHardwareWallet extends AbstractNeuraiWallet {
  static readonly type = 'NeuraiHardware';
  static readonly typeReadable = HARDWARE_WALLET_TYPE_READABLE;
  // @ts-ignore: override
  public readonly type = NeuraiHardwareWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = NeuraiHardwareWallet.typeReadable;

  /** Device key type: `pq` or `legacy`. Persisted. */
  keyType: WalletKind;
  /** Primary address: the PQ address (pq) or the current receive address (legacy). Persisted. */
  address: string;
  /** Device public key (hex): raw ML-DSA-44 (pq) or compressed secp256k1 of the primary address (legacy). Persisted. */
  pubkey: string;
  /** PQ only: 32-byte AuthScript commitment (hex). Persisted. */
  commitment: string;
  /** PQ only: AuthScript witnessScript hex. Persisted. */
  witnessScript: string;
  /** PQ only: AuthScript auth type. Persisted. */
  authType: number;
  /** Device leaf derivation path (pq) / primary receive path (legacy). Persisted. */
  hwPath: string;
  /** Device master fingerprint (hex). Persisted; identity check + PSBT bip32. */
  hwFingerprint: string;
  /** Legacy only: account extended public key (`m/44'/coin'/0'`). Persisted. */
  xpub: string;
  /** Legacy only: account derivation path, e.g. `m/44'/1900'/0'`. Persisted. */
  accountPath: string;

  // Runtime-only HD caches (non-enumerable: never serialized).
  private _addrMeta!: Map<string, AddrMeta>;
  private _watched!: string[];
  private _receiveAddr!: string;
  private _changeAddr!: string;
  private _discoveredAt!: number;

  constructor() {
    super();
    this.keyType = 'pq';
    this.address = '';
    this.pubkey = '';
    this.commitment = '';
    this.witnessScript = '51';
    this.authType = 1;
    this.hwPath = '';
    this.hwFingerprint = '';
    this.xpub = '';
    this.accountPath = '';
    this.use_with_hardware_wallet = true;
    this.secret = '';
    this.network = chainFor('testnet', 'pq');

    Object.defineProperty(this, '_addrMeta', { writable: true, enumerable: false, value: new Map() });
    Object.defineProperty(this, '_watched', { writable: true, enumerable: false, value: [] });
    Object.defineProperty(this, '_receiveAddr', { writable: true, enumerable: false, value: '' });
    Object.defineProperty(this, '_changeAddr', { writable: true, enumerable: false, value: '' });
    Object.defineProperty(this, '_discoveredAt', { writable: true, enumerable: false, value: 0 });
  }

  /** A PQ device address saved as `nq1p…` / `tnq1p…` is re-encoded; the script is unchanged. */
  static fromJson(obj: string): NeuraiHardwareWallet {
    const wallet = super.fromJson(obj) as unknown as NeuraiHardwareWallet;
    if (wallet.keyType === 'pq' && wallet.address) wallet.address = normalizeDeviceAuthScriptAddress(wallet.address);
    return wallet;
  }

  get walletKind(): WalletKind {
    return this.keyType;
  }

  /**
   * A device wallet has no words (`secret` is empty), so the legacy ID was the
   * derivation path alone and two devices on the same path collided. The ID is
   * network + key type + master fingerprint + path; records saved before the
   * fingerprint was stored fall back to the device public key.
   */
  getID(): string {
    const fingerprint = (this.hwFingerprint || '').toLowerCase();
    const pubkey = (this.pubkey || '').toLowerCase();
    const device = fingerprint ? 'fp:' + fingerprint : pubkey ? 'pk:' + pubkey : '';
    if (!device) return super.getID();
    return walletIdV2([this.type, this.network, this.keyType, device, this.hwPath || '']);
  }

  allowSweepFromWif(): boolean {
    return false;
  }

  allowSend(): boolean {
    return true;
  }

  // ---------- no local engine ------------------------------------------------------

  protected async ensureEngine(): Promise<never> {
    throw new Error('NeuraiHardwareWallet has no local engine; signing happens on the device');
  }

  protected async _walletAddresses(): Promise<string[]> {
    if (this.keyType === 'pq') return this.address ? [this.address] : [];
    await this._ensureDiscovered();
    return this._watched.length ? this._watched : this.address ? [this.address] : [];
  }

  protected async _walletBaseCurrency(): Promise<string> {
    return NeuraiJsWallet.getBaseCurrencyByNetwork(this.network);
  }

  // ---------- address surface ------------------------------------------------------

  getAddress(): string | false {
    return this.address || false;
  }

  async getAddressAsync(): Promise<string | false> {
    return this.getReceiveAddressAsync();
  }

  async getReceiveAddressAsync(): Promise<string> {
    if (this.keyType === 'pq') return this.address;
    await this._ensureDiscovered();
    return this._receiveAddr || this.address;
  }

  async getStaticReceiveAddress(): Promise<string> {
    return this.getReceiveAddressAsync();
  }

  /**
   * The address the device signs messages with. `sign_message` on the
   * firmware has no path argument: it always uses the account key, which for
   * a legacy device is the leaf `m/44'/coin'/0'/0/0`, and answers with that
   * leaf's address. Exposing the first unused receive address to Connect
   * would work only until the wallet receives its first funds; after that the
   * device's signature would no longer verify against the session address.
   * PQ devices have a single address, so the two notions coincide.
   */
  async getConnectAddressAsync(): Promise<string> {
    if (this.keyType === 'pq') return this.address;
    return this._legacyIndexZeroAddress() ?? this.address;
  }

  async getChangeAddressAsync(): Promise<string> {
    if (this.keyType === 'pq') return this.address;
    await this._ensureDiscovered();
    return this._changeAddr || this._receiveAddr || this.address;
  }

  async getAddressesAsync(): Promise<string[]> {
    return this._walletAddresses();
  }

  getCachedAddresses(): string[] {
    if (this.keyType === 'pq') return this.address ? [this.address] : [];
    return this._watched.length ? this._watched : this.address ? [this.address] : [];
  }

  getAllExternalAddresses(): string[] {
    return this.getCachedAddresses();
  }

  /** The device's address, or the discovered window of a Legacy device: receive addresses, then change. */
  getAddressEntries(): NeuraiAddressEntry[] {
    return this.getCachedAddresses().map(address => {
      const meta = this._addrMeta.get(address);
      return { address, index: meta?.index ?? 0, change: meta?.change === 1 };
    });
  }

  /** The window is the gap-limit scan's; there is no engine to derive more. */
  canDeriveMoreAddresses(): boolean {
    return false;
  }

  async loadAddresses(): Promise<void> {
    if (this.keyType === 'legacy') await this._ensureDiscovered();
  }

  weOwnAddress(address: string): boolean {
    if (this.keyType === 'pq') return !!this.address && address === this.address;
    // Index 0 is what Connect sessions are settled on; it must be recognised
    // before HD discovery has run (a session request can arrive at any time).
    return this._addrMeta.has(address) || address === this.address || address === this._legacyIndexZeroAddress();
  }

  async prewarmEngine(): Promise<void> {
    /* no-op: hardware wallet has no engine */
  }

  /**
   * Asset (token) balances for the hardware wallet. There is no local engine
   * here, so instead of `engine.getAssets()` we sum the wallet's asset UTXOs:
   * `getaddressutxos` with `assetName: "*"` (the WSS backend supports the param
   * on its rpc passthrough) returns native + asset outputs across all watched
   * addresses; grouping the non-XNA ones by name gives the spendable balance
   * per token.
   */
  async refreshHeldAssets(): Promise<void> {
    const addresses = await this._walletAddresses();
    if (addresses.length === 0) return;
    let utxos: Array<{ assetName?: string; satoshis?: string | number | bigint }> = [];
    try {
      utxos = await this.getBackend().rpc('getaddressutxos', [{ addresses, assetName: '*' }]);
    } catch (err) {
      console.debug('NeuraiHardwareWallet: asset utxo fetch failed', err);
      return;
    }
    const byAsset: Record<string, bigint> = {};
    for (const u of utxos ?? []) {
      const name = u.assetName;
      if (!name || name === 'XNA' || !u.satoshis) continue;
      byAsset[name] = (byAsset[name] ?? 0n) + parseRawSats(u.satoshis);
    }
    this._heldAssets = Object.entries(byAsset)
      .filter(([, sats]) => sats > 0)
      .map(([name, sats]) => ({ name, type: getAssetType(name), amount: satsToXna(sats) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    emitWalletChanged(this.getID());
  }

  // ---------- HD discovery (legacy) ------------------------------------------------

  /** Memo of `m/44'/coin'/0'/0/0`, keyed by the xpub it was derived from. */
  private _indexZero?: { xpub: string; address: string };

  /**
   * The legacy leaf at index 0 of the receive branch: the key the device's
   * `sign_message` uses. Derived from the persisted xpub, never read from
   * `this.address`, which discovery overwrites with the first unused address.
   */
  private _legacyIndexZeroAddress(): string | undefined {
    if (this.keyType !== 'legacy' || !this.xpub) return undefined;
    if (this._indexZero?.xpub !== this.xpub) {
      this._indexZero = { xpub: this.xpub, address: this._deriveAndCache(0, 0).address };
    }
    return this._indexZero.address;
  }

  /** Derive a legacy address + cache its metadata. */
  private _deriveAndCache(change: 0 | 1, index: number): { address: string; pubkeyHex: string } {
    const d = deriveLegacyAddress(this.xpub, this.network, change, index);
    this._addrMeta.set(d.address, {
      change,
      index,
      pubkeyHex: d.pubkeyHex,
      path: `${this.accountPath}/${change}/${index}`,
    });
    return { address: d.address, pubkeyHex: d.pubkeyHex };
  }

  /** Gap-limit scan one branch; returns the watched addresses and first-unused index. */
  private async _scanBranch(change: 0 | 1): Promise<{ addresses: string[]; firstUnusedIndex: number }> {
    const backend = this.getBackend();
    const addresses: string[] = [];
    let index = 0;
    let firstUnusedIndex = 0;
    let firstUnusedFound = false;
    let consecutiveUnused = 0;

    while (consecutiveUnused < GAP_LIMIT) {
      const batch: string[] = [];
      for (let i = 0; i < GAP_LIMIT; i++) batch.push(this._deriveAndCache(change, index + i).address);

      const deltas = await backend.getAddressHistory(batch);
      const used = new Set(deltas.map(d => d.address));
      for (let i = 0; i < batch.length; i++) {
        addresses.push(batch[i]);
        if (used.has(batch[i])) {
          consecutiveUnused = 0;
        } else {
          if (!firstUnusedFound) {
            firstUnusedIndex = index + i;
            firstUnusedFound = true;
          }
          consecutiveUnused++;
        }
      }
      index += GAP_LIMIT;
    }
    return { addresses, firstUnusedIndex };
  }

  /** Discover and cache the watched address window for the HD account. */
  private async _ensureDiscovered(): Promise<void> {
    if (this.keyType !== 'legacy' || !this.xpub) return;
    if (this._watched.length && Date.now() - this._discoveredAt < DISCOVERY_TTL_MS) return;

    const [external, internal] = await Promise.all([this._scanBranch(0), this._scanBranch(1)]);
    this._watched = [...external.addresses, ...internal.addresses];
    this._receiveAddr = this._deriveAndCache(0, external.firstUnusedIndex).address;
    this._changeAddr = this._deriveAndCache(1, internal.firstUnusedIndex).address;
    this.address = this._receiveAddr;
    this._discoveredAt = Date.now();
  }

  // ---------- device link ----------------------------------------------------------

  /**
   * Populate this wallet from device responses.
   * @param info  `getInfo()` — network, master fingerprint, key type.
   * @param addr  `getAddress()` — the leaf address/pubkey (and PQ commitment).
   * @param bip32 `get_bip32_pubkey()` — required for legacy: the account xpub.
   */
  setFromDeviceInfo(info: IDeviceInfo, addr: IAddressResponse, bip32?: IBip32PubkeyResponse): void {
    this.keyType = (addr.type ?? info.key_type ?? 'legacy') === 'pq' ? 'pq' : 'legacy';
    this.network = chainForDevice(info.network, this.keyType);
    // Old firmware reports the generic AuthScript v1 address as `nq1p…` /
    // `tnq1p…`; nodes and libraries only accept the `nc1p…` / `tnc1p…` form.
    const deviceAddress = addr.address || info.address;
    this.address = this.keyType === 'pq' && deviceAddress ? normalizeDeviceAuthScriptAddress(deviceAddress) : deviceAddress;
    this.pubkey = addr.pubkey || info.pubkey;
    this.commitment = addr.commitment ?? '';
    this.witnessScript = addr.witnessScript ?? (this.keyType === 'pq' ? '51' : '');
    this.authType = addr.authType ?? 1;
    this.hwPath = addr.path || info.path || '';
    this.hwFingerprint = info.master_fingerprint || bip32?.master_fingerprint || '';
    const fp = parseInt(this.hwFingerprint, 16);
    this.masterFingerprint = Number.isNaN(fp) ? 0 : fp;
    this._derivationPath = this.hwPath;

    if (this.keyType === 'legacy') {
      this.xpub = bip32?.bip32_pubkey ?? '';
      this.accountPath = bip32?.path ?? '';
    }

    if (!this.label) this.setLabel(NeuraiHardwareWallet.typeReadable);
    this._addressStatus = { [this.address]: '' };
  }

  // ---------- device-signed spending ----------------------------------------------

  async buildUnsignedSend(
    toAddress: string,
    amountSats: bigint,
    opts?: { feeRate?: number; sendMax?: boolean },
  ): Promise<NeuraiHwUnsignedSend> {
    const sendMax = opts?.sendMax === true;
    if (this.amountsStale) throw new Error('Refresh this wallet before sending');
    parseMoneySats(amountSats);
    if (!sendMax && amountSats <= 0n) throw new Error('Invalid amount');
    const rate = await this._resolveFeeRate(opts?.feeRate);

    if (this.keyType === 'pq') return this._buildPqSend(toAddress, amountSats, rate, sendMax);
    return this._buildLegacySend(toAddress, amountSats, rate, sendMax);
  }

  private async _buildPqSend(toAddress: string, amountSats: bigint, rate: number, sendMax: boolean): Promise<NeuraiHwUnsignedSend> {
    if (!this.address) throw new Error('Hardware wallet has no address');
    const rawUtxos = await this._spendableUtxos([this.address]);
    const xnaUtxos = rawUtxos.filter(u => u.assetName === 'XNA' && u.satoshis > 0);
    if (xnaUtxos.length === 0) throw new Error('No spendable XNA UTXOs for this address');

    const selected: HwUtxo[] = [];
    for (const u of xnaUtxos.sort((a, b) => compareSats(b.satoshis, a.satoshis))) {
      selected.push(u);
      if (
        !sendMax &&
        selected.reduce((sum, input) => sum + input.satoshis, 0n) >=
          amountSats + this._estimatePqFee(selected.length, [toAddress, this.address], rate)
      )
        break;
    }
    if (selected.length > 4) throw new Error('The hardware PQ signer supports at most four inputs');
    const totalIn = selected.reduce((sum, u) => sum + u.satoshis, 0n);
    let feeSats = this._estimatePqFee(selected.length, sendMax ? [toAddress] : [toAddress, this.address], rate);
    const outputValue = sendMax ? totalIn - feeSats : amountSats;
    if (outputValue <= 0n) throw new Error('Balance too low to cover the network fee');
    let change = totalIn - outputValue - feeSats;
    if (change < 0n) throw new Error('Insufficient funds including fee');
    if (change < changeDustSats(this.address)) {
      feeSats += change;
      change = 0n;
    }
    const payments = [{ address: toAddress, valueSats: outputValue }];
    if (change > 0n) payments.push({ address: this.address, valueSats: change });
    const { rawTx } = createPaymentTransaction({ inputs: selected.map(u => ({ txid: u.txid, vout: u.outputIndex })), payments });
    // SDK 0.6.1 preserves integer strings and encodes safe amounts as numbers
    // at the device boundary, without rounding large prevouts.
    const inputs: IPQSignInput[] = selected.map((u, index) => ({ index, amount: u.satoshis.toString(), script_pub_key: u.script }));
    return { keyType: 'pq', rawTxHex: rawTx, inputs, feeSats, amountSats: outputValue };
  }

  private _estimatePqFee(inputs: number, outputs: string[], rate: number): bigint {
    return estimateNeuraiFeeSats(Array(inputs).fill('5120'), outputs, rate / 100_000);
  }

  private async _buildLegacySend(toAddress: string, amountSats: bigint, rate: number, sendMax: boolean): Promise<NeuraiHwUnsignedSend> {
    await this._ensureDiscovered();
    const rawUtxos = await this._spendableUtxos(this._watched);
    const utxos = rawUtxos
      .filter(u => u.assetName === 'XNA' && u.satoshis > 0 && this._addrMeta.has(u.address))
      .sort((a, b) => compareSats(b.satoshis, a.satoshis));
    if (utxos.length === 0) throw new Error('No spendable XNA UTXOs');

    const changeAddr = await this.getChangeAddressAsync();
    let selected: typeof utxos;
    let inSats: bigint;
    let fee: bigint;
    let amountToSend: bigint;
    let changeSats: bigint;
    if (sendMax) {
      // Spend every UTXO into a single output; no change.
      selected = utxos;
      inSats = utxos.reduce((s, u) => s + u.satoshis, 0n);
      fee = this._estimateLegacyFee(selected.length, [toAddress], rate);
      amountToSend = inSats - fee;
      if (amountToSend <= 0) throw new Error('Balance too low to cover the network fee');
      changeSats = 0n;
    } else {
      // Greedy coin selection; fee grows with the input count.
      selected = [];
      inSats = 0n;
      fee = 0n;
      for (const u of utxos) {
        selected.push(u);
        inSats += u.satoshis;
        fee = this._estimateLegacyFee(selected.length, [toAddress, changeAddr], rate);
        if (inSats >= amountSats + fee) break;
      }
      if (inSats < amountSats + fee) throw new Error('Insufficient funds (including fee)');
      amountToSend = amountSats;
      changeSats = inSats - amountSats - fee;
    }

    // Build the unsigned raw transaction.
    const tx = new Transaction();
    tx.version = 2;
    for (const u of selected) tx.addInput(Buffer.from(u.txid, 'hex').reverse(), u.outputIndex);
    tx.addOutput(encodeDestinationScript(toAddress), BigInt(amountToSend));
    if (!sendMax && changeSats >= changeDustSats(changeAddr)) {
      tx.addOutput(encodeDestinationScript(changeAddr), BigInt(changeSats));
    } else {
      changeSats = 0n; // dust or send-max → fold into fee
    }
    const rawUnsignedTransaction = tx.toHex();

    // Per-input metadata so the device can derive each signing key.
    const inputs: IPSBTInputMetadata[] = [];
    for (const u of selected) {
      const meta = this._addrMeta.get(u.address)!;

      const rawTxHex = await this._fetchRawTx(u.txid);
      inputs.push({
        txid: u.txid,
        vout: u.outputIndex,
        rawTxHex,
        pubkey: meta.pubkeyHex,
        masterFingerprint: this.hwFingerprint,
        derivationPath: meta.path,
      });
    }

    const psbtBase64 = buildPSBTFromRawTransaction({
      network: this.network as NetworkType,
      rawUnsignedTransaction,
      inputs,
    });
    return { keyType: 'legacy', psbtBase64, feeSats: inSats - amountToSend - changeSats, amountSats: amountToSend };
  }

  // ---------- device-signed asset transfer -----------------------------------------

  /**
   * Build an unsigned asset (token) transfer for the device to sign. Mirrors the
   * software asset send (`createStandardAssetTransferTransaction`) but stages the
   * result for the NeuraiHW: the device shows the asset name/amount via the
   * `buildAssetTransferDisplayMetadata` display payload, and the fee is paid in
   * XNA. `amount` is in full asset units.
   */
  async buildUnsignedAssetSend(toAddress: string, assetName: string, amount: string): Promise<NeuraiHwUnsignedSend> {
    if (this.amountsStale) throw new Error('Refresh this wallet before sending');
    amount = amountFromInput(amount);
    const feeRateXnaPerKb = await this.estimateFeeRate();
    if (this.keyType === 'pq') return this._buildPqAssetSend(toAddress, assetName, amount, feeRateXnaPerKb);
    return this._buildLegacyAssetSend(toAddress, assetName, amount, feeRateXnaPerKb);
  }

  /** Use the selected node endpoint for complete scripts and exclude pending spends. */
  private async _spendableUtxos(addresses: string[], assets = false): Promise<HwUtxo[]> {
    const backend = this.getBackend();
    const [raw, mempool] = await Promise.all([
      backend.rpc<HwUtxo[]>('getaddressutxos', [{ addresses, ...(assets ? { assetName: '*' } : {}) }]),
      backend.rpc<Array<{ prevtxid?: string; prevout?: number }>>('getaddressmempool', [{ addresses }]),
    ]);
    const spent = new Set(mempool.map(m => `${m.prevtxid}:${m.prevout}`));
    return raw
      .map(u => ({ ...u, satoshis: parseMoneySats(u.satoshis) }))
      .filter(u => u.satoshis > 0n && addresses.includes(u.address) && !spent.has(`${u.txid}:${u.outputIndex}`));
  }

  /** Fetch the wallet's asset UTXOs (for `assetName`) and native XNA UTXOs. */
  private async _fetchAssetAndXnaUtxos(addresses: string[], assetName: string): Promise<{ assetUtxos: HwUtxo[]; xnaUtxos: HwUtxo[] }> {
    const all = await this._spendableUtxos(addresses, true);
    return {
      assetUtxos: all.filter(u => u.assetName === assetName),
      xnaUtxos: all.filter(u => !u.assetName || u.assetName === 'XNA'),
    };
  }

  private async _buildPqAssetSend(
    toAddress: string,
    assetName: string,
    amount: string,
    feeRateXnaPerKb: number,
  ): Promise<NeuraiHwUnsignedSend> {
    if (!this.address) throw new Error('Hardware wallet has no address');
    const { assetUtxos, xnaUtxos } = await this._fetchAssetAndXnaUtxos([this.address], assetName);
    if (assetUtxos.length === 0) throw new Error(`No spendable ${assetName} to send`);
    if (xnaUtxos.length === 0) throw new Error('No spendable XNA to cover the network fee');

    const amountRaw = xnaToSats(amount);
    if (assetUtxos.reduce((s, u) => s + u.satoshis, 0n) < amountRaw) throw new Error(`Insufficient ${assetName} balance`);
    const selectedAsset = pickUtxos(assetUtxos, amountRaw);
    const assetChangeRaw = selectedAsset.reduce((s, u) => s + u.satoshis, 0n) - amountRaw;

    // PQ-sized fee: the WSS UTXO scripts aren't populated, so feed synthetic
    // `5120` (AuthScript) prefixes to the estimator. Local fee policy.
    const outAddrs = (xnaChange: boolean) => [
      { address: toAddress, assetName },
      ...(assetChangeRaw > 0 ? [{ address: this.address, assetName }] : []),
      ...(xnaChange ? [this.address] : []),
    ];
    const pqScripts = (n: number) => Array.from({ length: n }, () => '5120');
    let selectedXna = [xnaUtxos[0]];
    let feeSats = estimateNeuraiFeeSats(pqScripts(selectedAsset.length + selectedXna.length), outAddrs(true), feeRateXnaPerKb);
    selectedXna = pickUtxos(xnaUtxos, feeSats + changeDustSats(this.address));
    feeSats = estimateNeuraiFeeSats(pqScripts(selectedAsset.length + selectedXna.length), outAddrs(true), feeRateXnaPerKb);
    const xnaIn = selectedXna.reduce((s, u) => s + u.satoshis, 0n);
    let xnaChangeSats = xnaIn - feeSats;
    if (xnaChangeSats < 0) throw new Error('Balance too low to cover the network fee');
    if (xnaChangeSats > 0 && xnaChangeSats < changeDustSats(this.address)) {
      feeSats += xnaChangeSats;
      xnaChangeSats = 0n;
    }

    const transfers: { address: string; assetName: string; amountRaw: bigint }[] = [
      { address: toAddress, assetName, amountRaw: BigInt(amountRaw) },
    ];
    if (assetChangeRaw > 0) transfers.push({ address: this.address, assetName, amountRaw: BigInt(assetChangeRaw) });
    const payments: { address: string; valueSats: bigint }[] = [];
    if (xnaChangeSats > 0) payments.push({ address: this.address, valueSats: BigInt(xnaChangeSats) });

    const allInputs = [...selectedAsset, ...selectedXna];
    if (this.keyType === 'pq' && allInputs.length > 4) throw new Error('The hardware PQ signer supports at most four inputs');
    const built = createStandardAssetTransferTransaction({
      inputs: allInputs.map(u => ({ txid: u.txid, vout: u.outputIndex })),
      payments,
      transfers,
      // NIP-040. Omitting it is not a compile error: the library keeps `rvn`
      // and the chain rejects the transaction with
      // bad-txns-legacy-asset-marker-after-nip040.
      assetMarker: markerForChain(this.network),
    });

    // Asset-wrapped prevouts carry 0 XNA, so their sighash amount is 0; XNA fee
    // inputs use their real value.
    const inputs: IPQSignInput[] = allInputs.map((u, index) => ({
      index,
      amount: u.assetName && u.assetName !== 'XNA' ? 0 : u.satoshis.toString(),
      script_pub_key: u.script,
    }));

    const display = buildAssetTransferDisplayMetadata({
      assetName,
      assetAmount: amount,
      destinationAddress: toAddress,
      changeAddress: this.address,
      inputAddresses: [this.address],
      feeAmount: satsToXna(feeSats),
      baseCurrency: 'XNA',
    });

    return { keyType: 'pq', rawTxHex: built.rawTx, inputs, feeSats, amountSats: 0n, asset: { name: assetName, amount }, display };
  }

  private async _buildLegacyAssetSend(
    toAddress: string,
    assetName: string,
    amount: string,
    feeRateXnaPerKb: number,
  ): Promise<NeuraiHwUnsignedSend> {
    await this._ensureDiscovered();
    const { assetUtxos, xnaUtxos } = await this._fetchAssetAndXnaUtxos(this._watched, assetName);
    const ownedAsset = assetUtxos.filter(u => this._addrMeta.has(u.address));
    const ownedXna = xnaUtxos.filter(u => this._addrMeta.has(u.address));
    if (ownedAsset.length === 0) throw new Error(`No spendable ${assetName} to send`);
    if (ownedXna.length === 0) throw new Error('No spendable XNA to cover the network fee');

    const amountRaw = xnaToSats(amount);
    if (ownedAsset.reduce((s, u) => s + u.satoshis, 0n) < amountRaw) throw new Error(`Insufficient ${assetName} balance`);
    const selectedAsset = pickUtxos(ownedAsset, amountRaw);
    const assetChangeRaw = selectedAsset.reduce((s, u) => s + u.satoshis, 0n) - amountRaw;

    const changeAddr = await this.getChangeAddressAsync();
    const outAddrs = (xnaChange: boolean) => [
      { address: toAddress, assetName },
      ...(assetChangeRaw > 0 ? [{ address: changeAddr, assetName }] : []),
      ...(xnaChange ? [changeAddr] : []),
    ];
    const legacyScripts = (n: number) => Array.from({ length: n }, () => '76a914');
    let selectedXna = [ownedXna[0]];
    let feeSats = estimateNeuraiFeeSats(legacyScripts(selectedAsset.length + selectedXna.length), outAddrs(true), feeRateXnaPerKb);
    selectedXna = pickUtxos(ownedXna, feeSats + changeDustSats(changeAddr));
    feeSats = estimateNeuraiFeeSats(legacyScripts(selectedAsset.length + selectedXna.length), outAddrs(true), feeRateXnaPerKb);
    const xnaIn = selectedXna.reduce((s, u) => s + u.satoshis, 0n);
    let xnaChangeSats = xnaIn - feeSats;
    if (xnaChangeSats < 0) throw new Error('Balance too low to cover the network fee');
    if (xnaChangeSats > 0 && xnaChangeSats < changeDustSats(changeAddr)) {
      feeSats += xnaChangeSats;
      xnaChangeSats = 0n;
    }

    const transfers: { address: string; assetName: string; amountRaw: bigint }[] = [
      { address: toAddress, assetName, amountRaw: BigInt(amountRaw) },
    ];
    if (assetChangeRaw > 0) transfers.push({ address: changeAddr, assetName, amountRaw: BigInt(assetChangeRaw) });
    const payments: { address: string; valueSats: bigint }[] = [];
    if (xnaChangeSats > 0) payments.push({ address: changeAddr, valueSats: BigInt(xnaChangeSats) });

    const allInputs = [...selectedAsset, ...selectedXna];
    if (this.keyType === 'pq' && allInputs.length > 4) throw new Error('The hardware PQ signer supports at most four inputs');
    const built = createStandardAssetTransferTransaction({
      inputs: allInputs.map(u => ({ txid: u.txid, vout: u.outputIndex })),
      payments,
      transfers,
      // NIP-040. Omitting it is not a compile error: the library keeps `rvn`
      // and the chain rejects the transaction with
      // bad-txns-legacy-asset-marker-after-nip040.
      assetMarker: markerForChain(this.network),
    });

    // The device reads each prevout value from the full prev tx; asset outputs
    // carry 0 XNA, so the device signs them with amount 0 automatically.
    const inputs: IPSBTInputMetadata[] = [];
    for (const u of allInputs) {
      const meta = this._addrMeta.get(u.address)!;
      const rawTxHex = await this._fetchRawTx(u.txid);
      inputs.push({
        txid: u.txid,
        vout: u.outputIndex,
        rawTxHex,
        pubkey: meta.pubkeyHex,
        masterFingerprint: this.hwFingerprint,
        derivationPath: meta.path,
      });
    }

    const display = buildAssetTransferDisplayMetadata({
      assetName,
      assetAmount: amount,
      destinationAddress: toAddress,
      changeAddress: changeAddr,
      feeAmount: satsToXna(feeSats),
      baseCurrency: 'XNA',
    });

    const psbtBase64 = buildPSBTFromRawTransaction({
      network: this.network as NetworkType,
      rawUnsignedTransaction: built.rawTx,
      inputs,
      display,
    });
    return { keyType: 'legacy', psbtBase64, feeSats, amountSats: 0n, asset: { name: assetName, amount }, display };
  }

  async signWithDevice(device: NeuraiESP32, unsigned: NeuraiHwUnsignedSend): Promise<{ signedHex: string; txId: string }> {
    // Verify the connected device is genuine NeuraiHW firmware. `ping` needs no
    // on-device confirmation, so signing stays a single approval (the sign
    // prompt) rather than an extra "wallet info" consent. We do NOT pre-check
    // the device identity here: signing is WYSIWYS and bound to the device's own
    // keys, so a wrong/mismatched device would simply produce a signature that
    // is invalid for this wallet's UTXOs.
    //
    // Ping and sign run as one turn of the device queue: the DePIN chat polls
    // the same port, and a command slipped in between would be paired with the
    // wrong response (H18).
    return withDevice(async () => {
      const probe = await device.ping();
      if (probe.device !== 'NeuraiHW') {
        throw new Error('Connected device is not a NeuraiHW hardware wallet');
      }

      if (unsigned.keyType === 'pq') {
        const result = await device.signPqRawTransaction({
          txHex: unsigned.rawTxHex!,
          inputs: unsigned.inputs!,
          display: unsigned.display,
        });
        if (!result.txHex) throw new Error('Device did not return a signed transaction');
        // Only signatures may differ from the reviewed draft (H16).
        const txId = assertSignedMatchesDraft(unsigned.rawTxHex!, result.txHex);
        return { signedHex: result.txHex, txId };
      }

      const signed = await device.signPsbt(unsigned.psbtBase64!, unsigned.display);
      const { txHex, txId } = finalizeSignedPSBT(unsigned.psbtBase64!, signed.psbt, this.network as NetworkType);
      if (!txHex) throw new Error('Could not finalize the signed transaction');
      return { signedHex: txHex, txId };
    });
  }

  // ---------- helpers --------------------------------------------------------------

  private async _resolveFeeRate(feeRate?: number): Promise<number> {
    if (feeRate && feeRate > 0) return feeRate;
    const xnaPerKb = await this.estimateFeeRate();
    return Math.max(1, Math.ceil((xnaPerKb * 1e8) / 1000));
  }

  private _estimateLegacyFee(inputs: number, outputs: string[], satPerByte: number): bigint {
    return estimateNeuraiFeeSats(Array(inputs).fill('76a914'), outputs, satPerByte / 100_000);
  }

  private async _fetchRawTx(txid: string): Promise<string> {
    // Legacy PSBT inputs need the full previous transaction (nonWitnessUtxo).
    // Fetch it from a node RPC backend (WSS doesn't expose getrawtransaction).
    const raw = await this.getBackend().rpc<unknown>('getrawtransaction', [txid, false]);
    const hex = typeof raw === 'string' ? raw : (raw as { hex?: string } | null)?.hex;
    if (!hex) throw new Error(`Could not fetch previous transaction for input ${txid}`);
    return hex;
  }
}
