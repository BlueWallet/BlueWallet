/**
 * Authenticated receive under RPC 6.
 *
 * The old call was `depinreceivemsg(token, address, timestamp)` and the node
 * refuses it outright: reading a holder's messages now requires proving control
 * of the address. The proof is a single-use nonce from `depinchallenge`, signed
 * by that address, and it expires in 30 seconds.
 *
 * Each authenticated reply carries a `next_challenge` (valid 300 s), so a poll
 * loop chains them instead of asking for a fresh nonce every page. The chain is
 * strictly SERIAL: a nonce is single-use, so two overlapping reads would spend
 * the same one and the second would be rejected.
 *
 * Everything the protocol requires — verifying the pool signature before
 * decrypting, checking each sender's signature over the recomputed digest,
 * scope and size limits — happens inside `receiveDepinMessages`. This module
 * only owns the chaining and the expiry policy, which is what the app has to
 * get right.
 */
import { receiveDepinMessages, requestDepinChallenge, depinNetwork, type DepinIdentity, type DepinSequenceCursor } from './depinMsg';
import { createDepinRpc, type RawRpcCall } from './depinRpcAdapter';
import type { VerifiedPool } from './depinPool';

/**
 * A challenge plus when it stops being usable.
 *
 * Stored with an absolute deadline rather than a duration: a poll may sit idle
 * for minutes, and a remaining-seconds value would silently go stale.
 */
export interface ChallengeState {
  challenge: string;
  expiresAtMs: number;
  contextKey: string;
}

/** Discarded this far before the stated expiry, so a slow round trip does not race it. */
const EXPIRY_MARGIN_MS = 5_000;

export function isChallengeUsable(state: ChallengeState | null, nowMs: number = Date.now()): boolean {
  return Boolean(state?.challenge) && nowMs + EXPIRY_MARGIN_MS < (state as ChallengeState).expiresAtMs;
}

export interface DepinReceivePage {
  messages: Array<Record<string, unknown>>;
  hasMore: boolean;
  cursor: DepinSequenceCursor;
  pool: VerifiedPool;
  membershipChanged: boolean;
  /** Carry this into the next call; null when the chain has to restart. */
  next: ChallengeState | null;
}

/**
 * Reads one page, obtaining or reusing a challenge as needed.
 *
 * @param params.previous - Challenge carried from the last page, if still valid
 * @returns The page plus the challenge to carry forward
 */
function challengeContext(pool: VerifiedPool, token: string, address: string): string {
  const c = pool.context;
  return [pool.pin.serviceId, c.network, c.pool_pubkey, c.pool_root, c.instance_id, c.membership_revision, token, address].join('|');
}

/** One bounded recovery for a read. Writes are never replayed here. */
export async function receiveDepinPage(params: {
  call: RawRpcCall;
  identity: DepinIdentity;
  token: string;
  pool: VerifiedPool;
  network: string;
  previous?: ChallengeState | null;
  cursor?: DepinSequenceCursor | null;
  limit?: number;
  nowMs?: number;
  refreshPool?: () => Promise<VerifiedPool>;
}): Promise<DepinReceivePage> {
  const rpc = createDepinRpc(params.call);
  let pool = params.pool,
    previous = params.previous ?? null,
    cursor = params.cursor ?? null;
  const originalRevision = pool.context.membership_revision;
  for (let attempt = 0; attempt < 2; attempt++) {
    const now = params.nowMs ?? Date.now();
    const key = challengeContext(pool, params.token, params.identity.address);
    try {
      let challenge: string;
      if (isChallengeUsable(previous, now) && previous?.contextKey === key) challenge = previous.challenge;
      else {
        const issued = await requestDepinChallenge({
          rpc,
          context: pool.context,
          identity: params.identity,
          token: params.token,
          type: 'receive',
        });
        pool.context = issued.context;
        challenge = issued.challenge;
      }
      const result = await receiveDepinMessages({
        rpc,
        context: pool.context,
        identity: params.identity,
        token: params.token,
        challenge,
        network: depinNetwork(params.network),
        cursor,
        limit: params.limit ?? 100,
      });
      if (!result.cursor) throw new Error('RPC 6 sequence cursor is missing');
      pool.context = result.context;
      return {
        messages: result.messages as unknown as Array<Record<string, unknown>>,
        hasMore: result.hasMore === true,
        cursor: result.cursor,
        pool,
        membershipChanged: originalRevision !== pool.context.membership_revision,
        next: result.nextChallenge
          ? {
              challenge: result.nextChallenge,
              expiresAtMs: now + (result.nextExpiresIn ?? 300) * 1000,
              contextKey: challengeContext(pool, params.token, params.identity.address),
            }
          : null,
      };
    } catch (error) {
      previous = null;
      const e = error as { depinError?: string; message?: string };
      const refresh =
        ['membership_stale', 'challenge_invalid'].includes(e.depinError ?? '') ||
        /service_mismatch|service identity mismatch|challenge.*(invalid|expired|unknown|used)/i.test(e.message ?? '');
      const streamReset = /DePIN stream changed|cursor is ahead of this stream/.test(e.message ?? '');
      if (attempt || !(refresh || streamReset)) throw error;
      if (streamReset) cursor = null;
      if (refresh) {
        if (!params.refreshPool) throw error;
        pool = await params.refreshPool();
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('DePIN authorization changed repeatedly');
}

/** A message whose sender signature verified and that decrypted for this identity. */
export interface DepinPlainMessage {
  hash: string;
  sender: string;
  timestamp: number;
  messageType: 'private' | 'group';
  plaintext: string;
}

/**
 * Keeps the entries that are both authentic and readable.
 *
 * The library reports every entry it saw, with `ok` telling whether the
 * SENDER's signature verified and `plaintext` filled only when this identity
 * was among the recipients. Both conditions matter and they are not the same:
 *
 *   `ok === false` is a message that must never be displayed — an unverifiable
 *   sender, or a protocol-1 leftover the node still holds.
 *
 *   `ok === true` with no plaintext is ordinary group traffic addressed to
 *   other holders. Routine, not an error, and silently skipped.
 *
 * @param entries - `messages` from {@link receiveDepinPage}
 * @returns Only the entries safe to show, in the order received
 */
export function readableMessages(entries: Array<Record<string, unknown>>): DepinPlainMessage[] {
  const out: DepinPlainMessage[] = [];
  for (const entry of entries ?? []) {
    if (!entry || entry.ok !== true) continue;
    const plaintext = entry.plaintext;
    if (typeof plaintext !== 'string' || plaintext.length === 0) continue;
    const meta = (entry.message ?? {}) as { sender?: unknown; timestamp?: unknown; messageType?: unknown };
    const hash = typeof entry.hash === 'string' ? entry.hash : '';
    if (!hash) continue;
    out.push({
      hash,
      sender: typeof meta.sender === 'string' ? meta.sender : '',
      timestamp: typeof meta.timestamp === 'number' ? meta.timestamp : Math.floor(Date.now() / 1000),
      messageType: meta.messageType === 'private' ? 'private' : 'group',
      plaintext,
    });
  }
  return out;
}

/**
 * Turns the node's RPC-6 receive rejections into something actionable.
 *
 * These are not transient RPC noise: they describe a state the wallet is in and
 * cannot poll its way out of, so showing the raw message just leaves the user
 * with a stalled channel and no idea why.
 *
 * @param error - Whatever the poll threw
 * @returns An explanation, or null when the error is not one of these
 */
export function explainDepinReceiveRejection(error: unknown): string | null {
  const text = typeof error === 'string' ? error : String((error as { message?: unknown })?.message ?? error ?? '');

  // The node resolves a holder's key from the chain, so an address that has
  // never spent has nothing to resolve. Receiving stays impossible until it
  // does — no amount of retrying changes it.
  if (/has not revealed its public key/i.test(text)) {
    return 'This address has never sent a transaction, so the network does not know its public key yet and cannot deliver messages to it. Send any amount from this address once, then reopen the chat.';
  }

  // A nonce is single-use and short-lived; the chain restarts by itself, so
  // this only matters if it persists.
  if (/challenge/i.test(text) && /(expired|unknown|already used|invalid)/i.test(text)) {
    return 'The read authorization expired before the node answered. This usually resolves on the next attempt.';
  }

  if (/does not hold|not a holder/i.test(text)) {
    return 'This address does not hold the token, so the pool will not release its messages.';
  }

  return null;
}
