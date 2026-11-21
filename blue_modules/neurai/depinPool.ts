/** RPC 6 pool bootstrap and persistent endpoint/genesis/key/root pinning.
 * TOFU records an observed first contact; later key changes require explicit
 * user action. A verified directory still needs independent ownership checks.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  callDepinRpc,
  getDepinPoolInfo,
  poolKeyFingerprint,
  type DepinPoolInfoResult,
  type DepinPoolPin,
  type DepinTrust,
} from './depinMsg';
import { createDepinRpc, depinServiceId, type RawRpcCall } from './depinRpcAdapter';

const KEY_PREFIX = 'depin_pool_pin_';

/** In-memory mirror so repeated calls in one session skip storage. */
const pins = new Map<string, DepinPoolPin>();

/** Raised when the endpoint answers with a different pool key than the one pinned. */
export class DepinPoolPinMismatchError extends Error {
  readonly serviceId: string;
  readonly expectedFingerprint: string;
  readonly seenFingerprint: string;

  constructor(serviceId: string, expectedFingerprint: string, seenFingerprint: string) {
    super(
      `The DePIN pool key for ${serviceId} changed. This can mean the service was legitimately ` +
        `re-keyed, or that something is impersonating it. Nothing was read or sent. ` +
        `Pinned ${expectedFingerprint}, received ${seenFingerprint}.`,
    );
    this.name = 'DepinPoolPinMismatchError';
    this.serviceId = serviceId;
    this.expectedFingerprint = expectedFingerprint;
    this.seenFingerprint = seenFingerprint;
  }
}

/**
 * Short, comparable form of a pool key, for showing the user.
 *
 * The digest is the library's, not a local abbreviation: the only thing a
 * fingerprint is good for is being read out and compared against what another
 * client shows for the same pool, and two tools that disagree on how to shorten
 * a key make that impossible.
 */
export function poolFingerprint(poolPublicKey: string): string {
  const key = String(poolPublicKey || '');
  if (!key) return key;
  try {
    return poolKeyFingerprint(key);
  } catch {
    // Not a parseable key (an unknown counterpart in a mismatch): show what we
    // have rather than hiding the difference the user is being asked about.
    return key.length < 16 ? key : `${key.slice(0, 8)}…${key.slice(-8)}`;
  }
}

export async function loadPin(serviceId: string): Promise<DepinPoolPin | null> {
  const cached = pins.get(serviceId);
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + serviceId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DepinPoolPin;
    if (!parsed?.poolPublicKey || !parsed?.serviceId) return null;
    pins.set(serviceId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function savePin(pin: DepinPoolPin): Promise<void> {
  pins.set(pin.serviceId, pin);
  try {
    await AsyncStorage.setItem(KEY_PREFIX + pin.serviceId, JSON.stringify(pin));
  } catch {
    // A pin that cannot be persisted still guards this session; losing it only
    // means the next launch re-does TOFU.
  }
}

/** Drops a pin so the next contact re-pins. Only for an explicit user action. */
export async function forgetPin(serviceId: string): Promise<void> {
  pins.delete(serviceId);
  try {
    await AsyncStorage.removeItem(KEY_PREFIX + serviceId);
  } catch {
    /* nothing to undo */
  }
}

export interface VerifiedPool extends DepinPoolInfoResult {
  /** True when this contact created the pin, i.e. the key was accepted on trust. */
  firstContact: boolean;
  /** Short form of the pool key, for the UI to show on first contact. */
  fingerprint: string;
}

/**
 * Fetches `depingetmsginfo`, verifies its `poolsig` and enforces the pin.
 *
 * @param params.call - RPC function bound to the node
 * @param params.network - Chain the wallet is on
 * @param params.url - Endpoint URL, used with the network as the pin's identity
 * @returns The verified pool info plus whether this was a first contact
 * @throws {DepinPoolPinMismatchError} If the endpoint answers with another key
 */
export async function getVerifiedPool(params: {
  call: RawRpcCall;
  network: string;
  url: string;
  persistPin?: boolean;
}): Promise<VerifiedPool> {
  const serviceId = depinServiceId(params.network, params.url);
  const stored = await loadPin(serviceId);
  const rpc = createDepinRpc(params.call);

  const trust: DepinTrust = stored ? { mode: 'pinned', pin: stored } : { mode: 'tofu' };

  let result: DepinPoolInfoResult;
  try {
    result = await getDepinPoolInfo({ rpc, serviceId, trust, network: params.network });
  } catch (err) {
    // The library rejects a pinned mismatch; translate it into something the
    // UI can act on, keeping the two fingerprints so the user can compare.
    if (stored && /pin|mismatch|poolPublicKey/i.test(String((err as Error)?.message ?? ''))) {
      throw new DepinPoolPinMismatchError(serviceId, poolFingerprint(stored.poolPublicKey), 'unknown');
    }
    throw err;
  }

  const seenKey = result.pin?.poolPublicKey ?? result.info?.depinpoolpkey ?? '';
  if (stored && seenKey && seenKey !== stored.poolPublicKey) {
    throw new DepinPoolPinMismatchError(serviceId, poolFingerprint(stored.poolPublicKey), poolFingerprint(seenKey));
  }

  if (!stored && result.pin && params.persistPin !== false) await savePin(result.pin);

  return {
    ...result,
    firstContact: !stored,
    fingerprint: poolFingerprint(seenKey),
  };
}

/** What `depinpoolstats` reports once its envelope has been verified. */
export interface DepinPoolStats {
  enabled?: boolean;
  token?: string;
  total_messages?: number;
  newest_message?: string;
  oldest_message?: string;
  [key: string]: unknown;
}

/** Authenticate live stats and adopt their signed membership context. */
export async function getVerifiedPoolStats(params: { call: RawRpcCall; pool: VerifiedPool }): Promise<DepinPoolStats> {
  const result = await callDepinRpc({ rpc: createDepinRpc(params.call), context: params.pool.context, method: 'depinpoolstats' });
  params.pool.context = result.context;
  return {
    ...result.body,
    stream_id: params.pool.info.stream_id,
    admission_sequence: params.pool.info.admission_sequence,
    membership_revision: result.context.membership_revision,
    instance_id: result.context.instance_id,
  };
}

/** Bootstrap already contains the admission high water; no second request is needed for activity. */
export function summarizeVerifiedPool(pool: VerifiedPool): DepinPoolStats {
  return {
    enabled: pool.info.enabled,
    token: pool.info.token,
    total_messages: typeof pool.info.messages === 'number' ? pool.info.messages : undefined,
    newest_message: typeof pool.info.newestmessage === 'string' ? pool.info.newestmessage : '',
    stream_id: pool.info.stream_id,
    admission_sequence: pool.info.admission_sequence,
    membership_revision: pool.context.membership_revision,
    instance_id: pool.context.instance_id,
  };
}
