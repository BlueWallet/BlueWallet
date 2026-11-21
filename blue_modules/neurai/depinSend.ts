/**
 * Sending a DePIN message under RPC 6.
 *
 * Replaces the hand-rolled assembly the app used to do — fetch each recipient's
 * key with `getpubkey`, build, wrap, submit — with the library calls that carry
 * the protocol's checks:
 *
 *   `buildDepinMessageForPool` resolves the recipient set through the pool and
 *   REFUSES any entry whose public key does not hash to its address. The old
 *   `getpubkey` path accepted whatever the server answered, so a hostile
 *   endpoint could hand back its own key for a real holder's address and read
 *   the message. That check is the reason this path exists.
 *
 *   `submitDepinMessage` wraps the message for the pool, submits it, and
 *   verifies the confirmation's `poolsig` before opening it. The node refuses a
 *   bare hex payload outright, so wrapping is not optional.
 *
 * What remains outside the library's reach is whether a listed address really
 * holds the token: that is on-chain data, checked separately and independently
 * by `depinRecipientAudit`.
 */
import {
  buildDepinMessageForPool,
  createSoftwareIdentity,
  decodeDepinRecipientDirectory,
  callDepinRpc,
  depinNetwork,
  normalizeDepinToken,
  submitDepinMessage,
  isVerifiedDepinRpcError,
  type DepinPoolBuildResult,
  type DepinIdentity,
} from './depinMsg';
import { createDepinRpc, type RawRpcCall } from './depinRpcAdapter';
import type { VerifiedPool } from './depinPool';

export interface DepinSendResult {
  /** Hash the pool assigned to the message, for deduplication and receipts. */
  messageHash: string;
  /** How many recipients the message was encrypted to, sender included. */
  recipientCount: number;
  /** True when the pool reported more eligible recipients than it returned. */
  truncated: boolean;
}

/**
 * Builds a signer backed by the wallet key.
 *
 * The return type is the shared {@link DepinIdentity}, not a software-specific
 * one: a hardware signer implements the same three capabilities, so the send
 * path below never learns which kind it holds.
 *
 * @param privateKey - WIF or 64-hex private key of the DePIN identity address
 * @param network - Chain, needed to derive the address the same way the node does
 */
export function softwareIdentity(privateKey: string, network: string, address?: string): Promise<DepinIdentity> {
  return createSoftwareIdentity({ privateKey, network, address });
}

/** Rebuild at most once after an authenticated rejection before admission.
 * A timeout, malformed reply, signature failure or unknown outcome is never retried.
 */
async function submitWithFreshRecipients(
  params: {
    call: RawRpcCall;
    pool: VerifiedPool;
    identity: DepinIdentity;
  },
  build: () => Promise<DepinPoolBuildResult>,
): Promise<DepinSendResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const built = await build();
      const receipt = await submitDepinMessage({
        rpc: createDepinRpc(params.call),
        identity: params.identity,
        messageHex: built.hex,
        context: built.context,
      });
      params.pool.context = receipt.context;
      return { messageHash: receipt.hash, recipientCount: built.recipientCount ?? 0, truncated: false };
    } catch (error) {
      if (attempt || !isVerifiedDepinRpcError(error) || !(error.depinError === 'membership_stale' || error.code === -26)) throw error;
      params.pool.context = error.context;
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('DePIN recipients changed repeatedly');
}

/**
 * Sends a group message to every holder of a token.
 *
 * @throws If the pool reports a truncated recipient set. A truncated list is
 *   not a smaller group — it is an unknown one, and encrypting to it would
 *   silently exclude holders who should have received the message.
 */
export async function sendDepinGroupMessage(params: {
  call: RawRpcCall;
  pool: VerifiedPool;
  identity: DepinIdentity;
  token: string;
  message: string;
  timestamp: number;
  network: string;
}): Promise<DepinSendResult> {
  const rpc = createDepinRpc(params.call);
  const token = normalizeDepinToken(params.token);

  return submitWithFreshRecipients(params, async () => {
    const built = await buildDepinMessageForPool({
      rpc,
      token,
      poolRoot: normalizeDepinToken(params.pool.info.token),
      maxRecipients: params.pool.info.maxrecipients,
      context: params.pool.context,
      network: depinNetwork(params.network),
      maxMessageBytes: params.pool.info.maxmessagesize,
      identity: params.identity,
      message: params.message,
      timestamp: params.timestamp,
      messageType: 'group',
    });

    const skipped = built.resolution?.skipped;
    // `null` is not permission either: it means the pool did not say whether the
    // skip accounting was complete, which is the same unknown group as `false`.
    const truncated = skipped ? skipped.noPubKeyComplete !== true || skipped.restrictedComplete !== true : false;
    if (truncated) {
      throw new Error(
        'The pool returned a truncated recipient list, so some holders of this token would silently ' +
          'miss the message. Nothing was sent.',
      );
    }

    return built;
  });
}

/** One holder of the token, with a public key verified against it. */
export interface VerifiedRecipient {
  address: string;
  pubkey: string;
}

/**
 * The pool's complete directory, with every exact address/key binding checked.
 * Its signature authenticates the pool statement; independent asset-ownership
 * verification remains an application policy in depinRecipientAudit.
 */
export async function verifiedRecipients(params: {
  call: RawRpcCall;
  pool: VerifiedPool;
  token: string;
  senderPubKey: string;
  senderAddress: string;
  network: string;
}): Promise<VerifiedRecipient[]> {
  const rpc = createDepinRpc(params.call);
  const token = normalizeDepinToken(params.token);
  const poolRoot = normalizeDepinToken(params.pool.info.token);

  const result = await callDepinRpc({
    rpc,
    context: params.pool.context,
    method: 'depingetancestorrecipients',
    token,
    args: { max_results: 10000, stop_at: poolRoot },
  });
  const body = result.body as { recipients?: Array<{ address?: unknown; pubkey?: unknown }> };
  await decodeDepinRecipientDirectory(body, { token, poolRoot, network: depinNetwork(params.network) });
  params.pool.context = result.context;

  const pairs: VerifiedRecipient[] = [];
  for (const entry of body.recipients ?? []) {
    if (typeof entry?.address === 'string' && typeof entry?.pubkey === 'string') {
      pairs.push({ address: entry.address, pubkey: entry.pubkey });
    }
  }
  return pairs;
}

/**
 * Sends a message to one holder only.
 *
 * Encrypted to exactly two keys, the recipient's and the sender's — the library
 * adds the sender's itself, so only the recipient's is passed. Leaving the
 * sender out would mean the sender could never read their own message back from
 * the pool on another device.
 *
 * The recipient's key is resolved HERE from the pool's verified list rather than
 * accepted from the caller: a caller-supplied key is exactly the substitution
 * the pubkey-to-address check exists to prevent.
 *
 * The plaintext carries a `@<address> ` tag so the sender can place the message
 * in the right conversation from any device. The envelope names the sender only,
 * never the recipient, so without the tag a sender's own messages are
 * unplaceable anywhere their local bookkeeping is missing.
 */
export async function sendDepinPrivateMessage(params: {
  call: RawRpcCall;
  pool: VerifiedPool;
  identity: DepinIdentity;
  token: string;
  toAddress: string;
  message: string;
  timestamp: number;
  network: string;
  senderPubKey: string;
  /** WIF of the chat identity. Software wallets only; a device signs instead. */
  privateKey: string;
}): Promise<DepinSendResult> {
  const rpc = createDepinRpc(params.call);
  const token = normalizeDepinToken(params.token);

  return submitWithFreshRecipients(params, async () => {
    const built = await buildDepinMessageForPool({
      rpc,
      context: params.pool.context,
      identity: params.identity,
      token,
      poolRoot: params.pool.info.token,
      maxRecipients: params.pool.info.maxrecipients,
      selectedAddresses: [params.toAddress],
      network: depinNetwork(params.network),
      maxMessageBytes: params.pool.info.maxmessagesize,
      timestamp: params.timestamp,
      message: `@${params.toAddress} ${params.message}`,
      messageType: 'private',
    });

    return built;
  });
}
