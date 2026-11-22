/**
 * DePIN messaging through a NeuraiHW device (neurai-sign-esp32 0.9: RPC 6,
 * envelope format 3).
 *
 * The device runs the pool protocol itself: it signs every RPC 6 request,
 * verifies the pinned pool's signed replies and opens envelopes with its
 * account-100' key. The host carries JSON-RPC between the device and the wallet
 * service and does the public-key work with the SDK (recipient checks, content
 * encryption, sender-signature verification). The private key never leaves the
 * chip.
 *
 * A channel needs a device session, and opening one takes a physical approval
 * that shows the token, pool root and pool key. The client is kept at module
 * scope so leaving the chat and coming back does not ask again while the
 * session lives on the device (15 minutes idle). A session the device has
 * dropped is reopened once, which asks again.
 *
 * Every device operation goes through `withDevice`: the serial line pairs
 * replies by arrival order, so nothing else may talk to the device meanwhile.
 */
import {
  createDepinDeviceClient,
  DepinDeviceError,
  type DepinDeviceClient,
  type DepinJsonRpcTransport,
  type DepinSdk,
  type IDepinSequenceCursor,
  type NeuraiESP32,
} from '@neuraiproject/neurai-sign-esp32/react-native';

import { withDevice } from '../neurai-hw/deviceQueue';
import { callDepinRpc, depinSdk, normalizeDepinToken, type DepinSequenceCursor } from './depinMsg';
import { createDepinRpc, type RawRpcCall } from './depinRpcAdapter';
import type { VerifiedPool } from './depinPool';
import type { DepinPlainMessage } from './depinReceive';

/** Rows per receive page: every pool reply crosses the device's 48 KiB serial line. */
export const DEVICE_PAGE_SIZE = 2;

/** One channel on one pool, reached through one wallet service. */
export interface DeviceChannel {
  device: NeuraiESP32;
  call: RawRpcCall;
  /** Endpoint identity: a session is bound to the transport it was opened over. */
  serviceUrl: string;
  /** Channel token: the pool root or one of its sections. */
  token: string;
  /** Verified bootstrap; its pinned key is the trusted pool key handed to the device. */
  pool: VerifiedPool;
  /** Called with true while the device waits for the owner to approve the session. */
  onApproval?: (pending: boolean) => void;
}

/** Raised when the session could not be opened: retrying on a timer would prompt the owner again and again. */
export class DepinDeviceSessionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'DepinDeviceSessionError';
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

const text = (error: unknown): string => String((error as { message?: unknown })?.message ?? error ?? '');

/** The device no longer knows the session (expired, rebooted, or ended elsewhere). */
const isSessionGone = (error: unknown): boolean =>
  (error instanceof DepinDeviceError && error.code === 'SESSION_REQUIRED') || /session_required/.test(text(error));
const isMembershipStale = (error: unknown): boolean => /membership_stale/.test(text(error));
const isTooLarge = (error: unknown): boolean => error instanceof DepinDeviceError && error.code === 'TOO_LARGE';
const isStreamChange = (error: unknown): boolean => /changed stream or regressed/.test(text(error));

/** The USB link is gone: the owner has to reconnect the device. */
export const isDeviceLinkLost = (error: unknown): boolean => /Serial port not connected|Device response timeout/.test(text(error));
/** The device's per-minute operation budget is spent; the next poll succeeds. */
export const isDeviceRateLimited = (error: unknown): boolean => /rate_limited/.test(text(error));
/** Automatic polling must stop: only the owner can resolve it. */
export const isDeviceStopError = (error: unknown): boolean =>
  error instanceof DepinDeviceSessionError || (error instanceof DepinDeviceError && error.code === 'UNSUPPORTED_FIRMWARE');

/** The device takes the reply back as JSON; the wallet service may hand integers as bigint. */
function plainJson(value: unknown): unknown {
  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('DePIN reply integer beyond 2^53');
    }
    return Number(value);
  }
  if (Array.isArray(value)) return value.map(plainJson);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plainJson(v)]));
  return value;
}

function rpcError(error: unknown): { code: number; message: string } {
  const e = error as { code?: unknown; message?: unknown; error?: { code?: unknown; message?: unknown } };
  const code = typeof e?.code === 'number' ? e.code : typeof e?.error?.code === 'number' ? e.error.code : -1;
  const message =
    typeof e?.message === 'string' && e.message ? e.message : typeof e?.error?.message === 'string' ? e.error.message : String(error);
  return { code, message };
}

/**
 * The app's backends hand back only `result`, so the reply goes to the client in
 * the proxy form (`{ result }` or `{ error }`). The client (0.9.2+) restores the
 * envelope with the device's request id; the device authenticates the reply by
 * the pool signature over its request hash.
 */
export function deviceRpcTransport(call: RawRpcCall): DepinJsonRpcTransport {
  return async request => {
    try {
      return { result: plainJson(await call(request.method, request.params)) };
    } catch (error) {
      return { error: rpcError(error) };
    }
  };
}

interface Session {
  key: string;
  device: NeuraiESP32;
  /** The caller's current transport: a reused session must not keep a stale one. */
  route: { call: RawRpcCall };
  client: Promise<DepinDeviceClient>;
}
let session: Session | null = null;

const sessionKey = (c: DeviceChannel): string =>
  [c.serviceUrl, normalizeDepinToken(c.token), normalizeDepinToken(c.pool.info.token), c.pool.pin.poolPublicKey.toLowerCase()].join('|');

/** Opens, or reuses, the device session for this channel. Opening one asks the owner to approve on the device. */
function deviceClient(c: DeviceChannel): Promise<DepinDeviceClient> {
  const key = sessionKey(c);
  if (session && session.device === c.device && session.key === key) {
    session.route.call = c.call;
    return session.client;
  }
  const previous = session;
  const route = { call: c.call };
  const client = withDevice(async () => {
    // The device holds one session: close the previous channel's first.
    if (previous?.device === c.device) await previous.client.then(p => p.end()).catch(() => undefined);
    c.onApproval?.(true);
    try {
      return await createDepinDeviceClient({
        device: c.device,
        sdk: depinSdk() as unknown as DepinSdk,
        rpc: deviceRpcTransport((method, params) => route.call(method, params)),
        token: normalizeDepinToken(c.token),
        poolRoot: normalizeDepinToken(c.pool.info.token),
        poolPubKey: c.pool.pin.poolPublicKey.toLowerCase(),
        clockOffsetMs: c.pool.context.clockOffsetMs,
      });
    } catch (error) {
      if (error instanceof DepinDeviceError && error.code === 'UNSUPPORTED_FIRMWARE') throw error;
      if (isDeviceLinkLost(error)) throw error;
      throw new DepinDeviceSessionError(`The device did not open the DePIN session: ${text(error)}`, { cause: error });
    } finally {
      c.onApproval?.(false);
    }
  });
  const entry: Session = { key, device: c.device, route, client };
  session = entry;
  client.catch(() => {
    if (session === entry) session = null;
  });
  return client;
}

/** Forget the cached session without talking to the device (it is gone or unplugged). */
export function forgetDeviceSession(device?: NeuraiESP32 | null): void {
  if (!device || session?.device === device) session = null;
}

/** End the device session, if any. */
export async function endDeviceSession(): Promise<void> {
  const current = session;
  session = null;
  if (current) await withDevice(() => current.client.then(c => c.end())).catch(() => undefined);
}

/** Runs one device operation, reopening the session once if the device dropped it. */
async function withSession<T>(c: DeviceChannel, op: (client: DepinDeviceClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const client = await deviceClient(c);
    try {
      return await withDevice(() => op(client));
    } catch (error) {
      if (isDeviceLinkLost(error)) forgetDeviceSession(c.device);
      if (attempt === 0 && isSessionGone(error)) {
        forgetDeviceSession(c.device);
        continue;
      }
      // The device adopts the pool's new membership from the rejection; one retry uses it.
      if (attempt === 0 && isMembershipStale(error)) continue;
      throw error;
    }
  }
}

/** The device works with safe-integer cursors; a wider one restarts the stream. */
function deviceCursor(cursor: DepinSequenceCursor | null): IDepinSequenceCursor | null {
  if (!cursor) return null;
  const after = Number(cursor.after_seq);
  const from = Number(cursor.from_timestamp);
  if (!Number.isSafeInteger(after) || !Number.isSafeInteger(from)) return null;
  return { ...cursor, after_seq: after, from_timestamp: from } as IDepinSequenceCursor;
}

export interface DeviceReceivePage {
  /** Messages whose sender signature verified and that the device opened. */
  messages: DepinPlainMessage[];
  cursor: DepinSequenceCursor;
  hasMore: boolean;
  /** Rows not delivered: addressed to other holders, or failed verification. */
  rejected: number;
}

/** Reads one page of the channel through the device. */
export async function receiveDevicePage(c: DeviceChannel & { cursor: DepinSequenceCursor | null }): Promise<DeviceReceivePage> {
  let cursor = deviceCursor(c.cursor);
  let limit = DEVICE_PAGE_SIZE;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const page = await withSession(c, client => client.receive({ cursor, limit }));
      const messages: DepinPlainMessage[] = [];
      for (const m of page.messages) {
        if (!m.ok || typeof m.content !== 'string' || !m.content || !m.hash || !m.sender) continue;
        messages.push({
          hash: m.hash,
          sender: m.sender,
          timestamp: m.timestamp ?? Math.floor(Date.now() / 1000),
          messageType: m.messageType === 'private' ? 'private' : 'group',
          plaintext: m.content,
        });
      }
      return { messages, cursor: page.cursor as DepinSequenceCursor, hasMore: page.hasMore, rejected: page.rejected };
    } catch (error) {
      // Two rows did not fit the serial line: read them one at a time.
      if (isTooLarge(error) && limit > 1) {
        limit = 1;
        continue;
      }
      if (isStreamChange(error) && cursor) {
        cursor = null;
        continue;
      }
      throw error;
    }
  }
  throw new Error('The DePIN page could not be read through the device');
}

/**
 * Refuses a group send whose recipient accounting the pool does not confirm as
 * complete, as the software path does. The SDK already rejects a truncated
 * directory; skipped holders are this app's policy.
 */
async function assertCompleteDirectory(c: DeviceChannel): Promise<void> {
  const result = await callDepinRpc({
    rpc: createDepinRpc(c.call),
    context: c.pool.context,
    method: 'depingetancestorrecipients',
    token: normalizeDepinToken(c.token),
    args: { max_results: Math.min(c.pool.info.maxrecipients, 50) + 1, stop_at: normalizeDepinToken(c.pool.info.token) },
  });
  c.pool.context = result.context;
  const body = result.body as { truncated?: unknown; skipped_no_pubkey_complete?: unknown; skipped_restricted_complete?: unknown };
  if (body.truncated !== false || body.skipped_no_pubkey_complete !== true || body.skipped_restricted_complete !== true) {
    throw new Error(
      'The pool returned a truncated recipient list, so some holders of this token would silently miss the message. Nothing was sent.',
    );
  }
}

/**
 * Sends a group message, or a private one to `toAddress`. A private message
 * carries the same `@<address> ` tag as the software path, so the sender can
 * place it in the right conversation from any device.
 */
export async function sendDeviceMessage(
  c: DeviceChannel & { message: string; toAddress?: string | null },
): Promise<{ messageHash: string; recipientCount: number }> {
  const to = c.toAddress || null;
  if (!to) await assertCompleteDirectory(c);
  const sent = await withSession(c, client =>
    to ? client.sendPrivateMessage(to, `@${to} ${c.message}`) : client.sendGroupMessage(c.message),
  );
  return { messageHash: sent.hash, recipientCount: sent.recipientCount };
}
