/**
 * The Neurai Connect client of the wallet.
 *
 * Holds one `NeuraiConnectWallet` for the whole app (the relay is
 * network-agnostic, so a single client serves mainnet and testnet sessions),
 * turns its events into a queue the approval screens read, and reconnects when
 * the app comes back to the foreground.
 *
 * Nothing here touches private keys: the screens sign with
 * `blue_modules/neurai/connect/signer.ts` and hand the result back to the SDK.
 */

import { AppState, type AppStateStatus } from 'react-native';
import { NeuraiConnectWallet, PAIRINGS_STORAGE_KEY, SESSIONS_STORAGE_KEY } from '@neuraiproject/neurai-connect-wallet';
import { PAIRING_TTL_SECONDS, parsePairingUri, RecordStore } from '@neuraiproject/neurai-connect-core';
import type { AuthRequestEvent, Pairing, Session, SessionProposalEvent, SessionRequestEvent } from '@neuraiproject/neurai-connect-wallet';
import type { JsonRpcId } from '@neuraiproject/neurai-connect-core';
import { getRelayUrl, loadRelayOverride, setRelayUrlOverride } from './config';
import { ConnectHistoryEntry, historySite, recordConnectHistory } from './history';
import { relayHost, sameRelay } from './relay-url';
import { SecureConnectStorage } from './storage';

export { relayHost, sameRelay };

export type ConnectIncoming =
  | { kind: 'auth'; id: JsonRpcId; receivedAt: number; event: AuthRequestEvent }
  | { kind: 'proposal'; id: JsonRpcId; receivedAt: number; event: SessionProposalEvent }
  | { kind: 'request'; id: JsonRpcId; receivedAt: number; event: SessionRequestEvent };

export interface ConnectNotice {
  /** Something the SDK refused on our behalf; worth a toast, never a blocking modal. */
  kind: 'auth_rejected' | 'request_blocked' | 'error';
  message: string;
}

type IncomingListener = (item: ConnectIncoming) => void;
type NoticeListener = (notice: ConnectNotice) => void;
/** `topic` is present when a specific session ended, so push registrations can be revoked precisely. */
export interface ConnectSessionsChange {
  reason: 'settled' | 'deleted' | 'resumed';
  topic?: string;
}
type SessionsListener = (change: ConnectSessionsChange) => void;

const METADATA = {
  name: 'NeuraiWallet',
  description: 'Neurai wallet for Android and iOS',
  url: 'https://neurai.org',
  icons: ['https://neurai.org/favicon.png'],
};

const pending = new Map<string, ConnectIncoming>();
const incomingListeners = new Set<IncomingListener>();
const noticeListeners = new Set<NoticeListener>();
const sessionsListeners = new Set<SessionsListener>();

let client: NeuraiConnectWallet | null = null;
let activeRelayUrl: string | undefined;
let starting: Promise<NeuraiConnectWallet> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

function emitIncoming(item: ConnectIncoming): void {
  pending.set(String(item.id), item);
  for (const listener of [...incomingListeners]) {
    try {
      listener(item);
    } catch (e) {
      console.warn('[neurai-connect] incoming listener failed', e);
    }
  }
}

function emitNotice(notice: ConnectNotice): void {
  for (const listener of [...noticeListeners]) {
    try {
      listener(notice);
    } catch {
      // A notice is best effort.
    }
  }
}

function emitSessionsChanged(change: ConnectSessionsChange): void {
  for (const listener of [...sessionsListeners]) {
    try {
      listener(change);
    } catch {
      // Best effort: this only drives push registration.
    }
  }
}

function onAppStateChange(state: AppStateStatus): void {
  // Coming back to the foreground: reconnect and pull whatever the relay kept
  // for us while the app was asleep. The SDK resubscribes on its own.
  if (state !== 'active' || !client) return;
  void client
    .resume()
    .then(() => emitSessionsChanged({ reason: 'resumed' })) // push registrations live in the relay's memory
    .catch(e => console.warn('[neurai-connect] resume failed', e));
}

/**
 * Pairings that outlived their use: the SDK marks a pairing active when a login
 * or a session is approved on it and then keeps it, with no expiry, for good,
 * resubscribing to it at every start. A login needs nothing more from it
 * (spec/auth.md: the approval is a login only) and neither does a session that
 * has ended. Each one not behind a live session is written to the history, if
 * it is not there yet, and forgotten — so the wallet stops listening on it and
 * the relay is no longer held by it. The time of an older one is rebuilt from
 * when it was scanned: its expiry is the scan plus the pairing TTL (or the
 * site's own `exp`, a few minutes later), close enough to show the day and hour.
 */
async function retireUsedPairings(wallet: NeuraiConnectWallet): Promise<void> {
  const live = new Set(wallet.sessions().map(session => session.pairingTopic));
  const used = wallet.pairingList().filter(pairing => pairing.active && !live.has(pairing.topic));
  if (used.length === 0) return;
  await recordConnectHistory(
    used.map(
      (pairing): ConnectHistoryEntry => ({
        kind: 'login',
        at: (pairing.expiry - PAIRING_TTL_SECONDS) * 1000,
        approximate: true,
        ...historySite(pairing.peerMetadata),
        pairingTopic: pairing.topic,
      }),
    ),
  );
  for (const pairing of used) {
    await wallet.forgetPairing(pairing.topic);
    emitSessionsChanged({ reason: 'deleted', topic: pairing.topic });
  }
}

let retiring: Promise<void> | null = null;

/**
 * Runs `retireUsedPairings` in the background, never twice at once. It must not
 * hold anything up: forgetting a pairing also unsubscribes it from the relay,
 * one round trip each, so the first run after an update can take minutes, and
 * a scan or an approval must work meanwhile. The history is written first, in
 * one go, so it is complete long before the last pairing is gone.
 */
function retireInBackground(wallet: NeuraiConnectWallet): Promise<void> {
  if (!retiring) {
    retiring = retireUsedPairings(wallet)
      .catch(e => console.warn('[neurai-connect] could not retire pairings', e))
      .finally(() => {
        retiring = null;
      });
  }
  return retiring;
}

/** Resolves once a retirement in progress, if any, has finished. */
export function pairingsRetired(): Promise<void> {
  return retiring ?? Promise.resolve();
}

async function create(relayUrl?: string): Promise<NeuraiConnectWallet> {
  await loadRelayOverride();
  activeRelayUrl = relayUrl ?? getRelayUrl();
  const wallet = await NeuraiConnectWallet.init({
    relayUrl: activeRelayUrl,
    storage: new SecureConnectStorage(),
    metadata: METADATA,
  });

  wallet.on('auth_request', event => emitIncoming({ kind: 'auth', id: event.id, receivedAt: Date.now(), event }));
  wallet.on('session_proposal', event => emitIncoming({ kind: 'proposal', id: event.id, receivedAt: Date.now(), event }));
  wallet.on('session_request', event => emitIncoming({ kind: 'request', id: event.id, receivedAt: Date.now(), event }));
  wallet.on('session_settled', ({ session }) => emitSessionsChanged({ reason: 'settled', topic: session.topic }));
  wallet.on('session_delete', ({ topic }) => {
    emitSessionsChanged({ reason: 'deleted', topic });
    retireInBackground(wallet);
  });
  wallet.on('auth_rejected', ({ reason }) => emitNotice({ kind: 'auth_rejected', message: reason }));
  wallet.on('request_blocked', ({ inspection }) =>
    emitNotice({ kind: 'request_blocked', message: inspection.reason ?? 'request blocked' }),
  );
  wallet.on('error', error => {
    console.warn('[neurai-connect]', error.message);
    emitNotice({ kind: 'error', message: error.message });
  });

  if (!appStateSubscription) appStateSubscription = AppState.addEventListener('change', onAppStateChange);
  return wallet;
}

/** Starts the client if it is not running and returns it. Safe to call repeatedly. */
export function startConnect(relayUrl?: string): Promise<NeuraiConnectWallet> {
  if (client) return Promise.resolve(client);
  if (!starting) {
    starting = create(relayUrl)
      .then(instance => {
        client = instance;
        // The sessions restored from storage are news to anything already on
        // screen: without this a wallet card mounted during start-up would not
        // show its Connect badge until the next settle or revoke.
        emitSessionsChanged({ reason: 'resumed' });
        retireInBackground(instance);
        return instance;
      })
      .finally(() => {
        starting = null;
      });
  }
  return starting;
}

/** The running client, or undefined when Connect has not been started yet. */
export function connectClient(): NeuraiConnectWallet | undefined {
  return client ?? undefined;
}

/** Stops the client and drops every pending approval. Used when the relay URL changes. */
export async function stopConnect(): Promise<void> {
  const instance = client;
  client = null;
  activeRelayUrl = undefined;
  pending.clear();
  appStateSubscription?.remove();
  appStateSubscription = null;
  if (instance) await instance.close();
}

/** The relay this wallet is currently connected to, or undefined when Connect is not running. */
export function activeRelay(): string | undefined {
  return activeRelayUrl;
}

/** Sessions this wallet has, most recently used first. */
export function connectSessions(): Session[] {
  return client?.sessions() ?? [];
}

/**
 * Every pairing this wallet holds, answered or not.
 *
 * Not only the pending ones: approving a login marks its pairing active without
 * necessarily leaving a session behind, and the SDK resubscribes to *every*
 * pairing after a restart. So an active pairing is a topic the wallet will go on
 * listening for on whatever relay it starts on, which is exactly what must not
 * silently move.
 */
export function connectPairings(): Pairing[] {
  return client?.pairingList() ?? [];
}

/** What is still tied to the relay in use: it lives there and nowhere else. */
export interface ConnectRelayUsage {
  sessions: number;
  pairings: number;
}

/** Thrown when the relay cannot be left because something on it would be stranded. */
export class RelayInUseError extends Error {
  readonly usage: ConnectRelayUsage;

  constructor(usage: ConnectRelayUsage) {
    super(`the wallet still has ${usage.sessions} session(s) and ${usage.pairings} pairing(s) on this relay`);
    this.name = 'RelayInUseError';
    this.usage = usage;
  }
}

/**
 * Sessions and pairings on the relay in use — everything the wallet would
 * subscribe to again after a restart.
 *
 * All of them are topics on one server: they survive restarts and would
 * resubscribe on whatever relay the wallet starts on next — where their site is
 * not listening, and where revoking a session would publish `session_delete`
 * into the void.
 */
export function relayUsage(): ConnectRelayUsage {
  return { sessions: connectSessions().length, pairings: connectPairings().length };
}

/** Whether anything would be stranded by moving to another relay. */
export function relayInUse(): boolean {
  const usage = relayUsage();
  return usage.sessions > 0 || usage.pairings > 0;
}

/** Sessions and pairings as they are on disk, for when the client cannot start. */
async function persistedUsage(): Promise<ConnectRelayUsage> {
  const storage = new SecureConnectStorage();
  const count = async (key: string): Promise<number> => {
    const store = new RecordStore<{ topic: string }>(storage, key);
    await store.load();
    return store.values().length;
  };
  try {
    return { sessions: await count(SESSIONS_STORAGE_KEY), pairings: await count(PAIRINGS_STORAGE_KEY) };
  } catch (error) {
    // Unreadable storage must not turn into "nothing is there", which would let
    // a relay change strand whatever it holds.
    console.warn('[neurai-connect] could not read the stored sessions', error);
    return { sessions: 1, pairings: 0 };
  }
}

/**
 * Moves the wallet to `url`, or back to the default when it is null.
 *
 * The only safe moment is with nothing on the current relay, so this refuses
 * with a `RelayInUseError` otherwise: the alternative — one client per relay —
 * is a bigger change than the setting is worth. The client is started first, so
 * sessions persisted from a previous run are counted rather than missed.
 */
export async function changeRelay(url: string | null): Promise<void> {
  // Counting must not depend on reaching the relay. The reason to change it is
  // often that the current one does not answer — a typo, a dev server that is
  // down, a phone that cannot open the URL at all — and requiring a live
  // connection to leave would make the setting impossible to correct from the
  // app. So: use the running client when there is one, and read the same
  // records from disk when there is not.
  let usage: ConnectRelayUsage;
  try {
    await startConnect();
    usage = relayUsage();
  } catch {
    usage = await persistedUsage();
  }
  if (usage.sessions > 0 || usage.pairings > 0) throw new RelayInUseError(usage);
  await stopConnect();
  await setRelayUrlOverride(url);
  // The setting is saved either way: the new relay may be unreachable too, and
  // that is reported by the next pairing, not by refusing to store the choice.
  await startConnect().catch(error => console.warn('[neurai-connect] the new relay did not answer yet', error));
}

/**
 * Consumes a pairing URI from the scanner or a deep link.
 *
 * The site chooses the relay and puts it in the QR code, so a code for another
 * relay (a staging one, or a different operator) has to be followed or the
 * wallet would sit waiting on the wrong connection with no explanation. With no
 * live sessions the wallet moves over and remembers it — the pairing screen
 * shows which relay it is talking to, and Settings can restore the default.
 * With live sessions it refuses instead, because moving would silently strand
 * them on the relay they were opened on.
 */
export async function pairWithUri(uri: string): Promise<void> {
  const wanted = parsePairingUri(uri).relayUrl;
  let wallet = await startConnect();
  if (wanted && activeRelayUrl && !sameRelay(wanted, activeRelayUrl)) {
    if (relayInUse()) {
      throw new Error(
        `This code uses the relay ${relayHost(wanted)}, but the wallet is connected to ${relayHost(activeRelayUrl)} ` +
          'and still has connections there. Log out everywhere, or change the relay in Settings, and scan again.',
      );
    }
    await stopConnect();
    await setRelayUrlOverride(wanted);
    wallet = await startConnect(wanted);
  }
  await wallet.pair(uri);
}

export function onConnectIncoming(listener: IncomingListener): () => void {
  incomingListeners.add(listener);
  return () => incomingListeners.delete(listener);
}

export function onConnectNotice(listener: NoticeListener): () => void {
  noticeListeners.add(listener);
  return () => noticeListeners.delete(listener);
}

/**
 * Fires when the set of live sessions may have changed, or when the app came
 * back to the foreground. Push registration listens here; nothing else should
 * need it.
 */
export function onConnectSessionsChanged(listener: SessionsListener): () => void {
  sessionsListeners.add(listener);
  return () => sessionsListeners.delete(listener);
}

/** The approval item an id refers to, without consuming it. */
export function peekIncoming(id: JsonRpcId): ConnectIncoming | undefined {
  return pending.get(String(id));
}

/** Consumes an approval item; a screen calls this once it has answered. */
export function takeIncoming(id: JsonRpcId): ConnectIncoming | undefined {
  const item = pending.get(String(id));
  pending.delete(String(id));
  return item;
}

/** Approval items still waiting, oldest first. */
export function pendingIncoming(): ConnectIncoming[] {
  return [...pending.values()].sort((a, b) => a.receivedAt - b.receivedAt);
}

/**
 * Revokes a session from this wallet and announces it, so the push registration
 * for that topic is dropped too. The SDK's own `session_delete` event only fires
 * when the *other* side ends the session.
 */
export async function revokeSession(topic: string): Promise<void> {
  await client?.disconnect(topic);
  emitSessionsChanged({ reason: 'deleted', topic });
  if (client) retireInBackground(client);
}

/**
 * Forgets the given pairings — for example every login of one site — so that
 * site can no longer reach this wallet on them, and announces each one so its
 * push registration is dropped. Sessions are untouched: `revokeSession` ends
 * those. What the site itself remembers of a past login is up to the site.
 */
export async function forgetPairings(topics: string[]): Promise<void> {
  for (const topic of topics) {
    await client?.forgetPairing(topic);
    emitSessionsChanged({ reason: 'deleted', topic });
  }
}

/**
 * After a login is approved (and settled no session): writes it to the history
 * and forgets its pairing, which has done its job. Never throws — the login
 * itself already went through.
 */
export async function concludeLogin(event: AuthRequestEvent, address: string): Promise<void> {
  try {
    await recordConnectHistory([
      {
        kind: 'login',
        at: Date.now(),
        ...historySite(event.requester.metadata, event.payload.domain),
        address,
        pairingTopic: event.pairingTopic,
      },
    ]);
    await forgetPairings([event.pairingTopic]);
  } catch (error: unknown) {
    console.warn('[neurai-connect] could not conclude the login', error);
  }
}

/** After a session is approved: writes it to the history. Never throws. */
export async function noteSessionApproved(event: SessionProposalEvent, address: string): Promise<void> {
  try {
    await recordConnectHistory([
      { kind: 'session', at: Date.now(), ...historySite(event.proposer.metadata), address, pairingTopic: event.pairingTopic },
    ]);
  } catch (error: unknown) {
    console.warn('[neurai-connect] could not record the session', error);
  }
}

/**
 * "Log out everywhere": revokes every session, forgets every pairing — the scans
 * still waiting for an answer and the ones a login already used — and drops the
 * push registration of each. It leaves the relay empty, which is also what makes
 * it possible to change relay afterwards.
 */
export async function revokeAllSessions(): Promise<void> {
  const topics = [...connectSessions().map(s => s.topic), ...connectPairings().map(p => p.topic)];
  await client?.disconnectAll();
  await client?.forgetPairings();
  for (const topic of topics) emitSessionsChanged({ reason: 'deleted', topic });
}
