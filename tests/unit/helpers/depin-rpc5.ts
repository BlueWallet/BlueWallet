/** RPC 6 / ECIES format 3 fake pool with deterministic, unfunded test identities. No network connections. */
import { stringifyRpcJson } from '@neuraiproject/neurai-rpc';
import { getVerifiedPool } from '../../../blue_modules/neurai/depinPool';
import type { VerifiedPool } from '../../../blue_modules/neurai/depinPool';
import type { SenderIdentity, DepinRpcContext, DepinRpcRequest, ReceivedDepinMessage } from '@neuraiproject/neurai-depin-msg';
export const sdk: typeof import('@neuraiproject/neurai-depin-msg') = require('@neuraiproject/neurai-depin-msg');
const POOL_KEY = '66'.repeat(32);
/** Format 3 opens message content only under its header context; null when the key is not a recipient. */
export async function openStored(message: ReceivedDepinMessage, privateKeyHex: string): Promise<string | null> {
  return (await sdk.decryptDepinReceivedMessage(message, privateKeyHex, { network: 'test' })).plaintext;
}
let count = 0;
export async function fakePool(
  options: { maxRecipients: number; complete?: boolean; pageSize?: number; sequenceBase?: bigint } = { maxRecipients: 2, complete: true },
) {
  const pool = await sdk.createSoftwareIdentity({ privateKey: POOL_KEY, network: 'test' });
  const legacy = await sdk.createSoftwareIdentity({ privateKey: '77'.repeat(32), network: 'test' });
  const strict = await sdk.createSoftwareIdentity({ privateKey: '88'.repeat(32), network: 'test', addressType: 'ecdsa' });
  const other = await sdk.createSoftwareIdentity({ privateKey: '99'.repeat(32), network: 'test' });
  const actors = [legacy, strict, other];
  const url = `https://rpc5.test.invalid/${++count}`;
  const context: DepinRpcContext = {
    network: '000000c710413a4265a996d30c86043aedef6a563900f1bc43fea61d5b2dc77d',
    pool_pubkey: pool.publicKey,
    pool_root: '&TEST',
    instance_id: '11'.repeat(32),
    membership_revision: '22'.repeat(32),
    membership_height: 123,
    membership_blockhash: '33'.repeat(32),
  };
  // Past 2^53 by default, so software cursors are exercised as exact BigInts.
  let seq = options.sequenceBase ?? 9007199254740992n,
    nonce = 0;
  const stream = '44'.repeat(32),
    nonces = new Map<string, string>(),
    messages: Array<ReceivedDepinMessage & { sequence: bigint }> = [];
  const key = (r: DepinRpcRequest) => `${r.address}|${r.token}`;
  const issue = (r: DepinRpcRequest) => {
    const ch = (++nonce).toString(16).padStart(64, '0');
    nonces.set(ch, key(r));
    return ch;
  };
  let tamper = false;
  async function respond(method: string, r: DepinRpcRequest, body: unknown, actor?: SenderIdentity) {
    const response: any = { ...context, protocol: 6, request_hash: sdk.depinRequestHash(method, r), body_kind: actor ? 1 : 0 };
    const bytes = new TextEncoder().encode(stringifyRpcJson(body));
    if (actor)
      response.encrypted = sdk.bytesToHex(
        sdk.serializeEciesMessage(
          await sdk.eciesEncrypt(
            bytes,
            [{ address: actor.address, publicKey: actor.publicKey }],
            sdk.transportContext('reply', context.network),
          ),
        ),
      );
    else response.body = sdk.bytesToHex(bytes);
    response.poolsig = sdk.signRecoverableMessage(
      sdk.buildDepinRpcResponsePreimage({ method, reply: response, requestHash: response.request_hash }),
      POOL_KEY,
    );
    if (tamper && actor) {
      response.encrypted = response.encrypted.slice(0, -2) + (response.encrypted.endsWith('00') ? '01' : '00');
      tamper = false;
    }
    return response;
  }
  const call = jest.fn(async (method: string, params: unknown[]) => {
    expect(params).toHaveLength(1);
    const r = params[0] as DepinRpcRequest;
    expect(r.protocol).toBe(6);
    if (method === 'depingetmsginfo')
      return respond(method, r, {
        enabled: true,
        protocol: 6,
        accepted_protocols: [6],
        address_types: ['legacy', 'ecdsa'],
        ecies_formats: [3],
        token: context.pool_root,
        depinpoolpkey: pool.publicKey,
        depinpoolkeyaddress: pool.address,
        maxrecipients: options.maxRecipients,
        maxmessagesize: 1024,
        network: context.network,
        instance_id: context.instance_id,
        membership_revision: context.membership_revision,
        membership_height: context.membership_height,
        membership_blockhash: context.membership_blockhash,
        server_time_ms: Date.now(),
        stream_id: stream,
        admission_sequence: seq,
      });
    if (method === 'depingetancestorrecipients')
      return respond(method, r, {
        token: r.token,
        stop_at: '&TEST',
        truncated: false,
        returned: actors.length,
        ancestors: [r.token, '&TEST'],
        recipients: actors.map((a) => ({ address: a.address, pubkey: a.publicKey })),
        skipped_no_pubkey_complete: options.complete,
        skipped_restricted_complete: options.complete,
      });
    if (method === 'depinpoolstats')
      return respond(method, r, { enabled: true, token: '&TEST', total_messages: messages.length, newest_message: 'latest' });
    const actor = actors.find((a) => a.address === r.address);
    if (!actor) throw new Error('Unknown test actor');
    expect(
      sdk.verifyRecoverableMessage(sdk.buildDepinRpcRequestPreimage({ method, request: r }), r.signature, actor.publicKey, actor.address),
    ).toBe(true);
    if (r.membership_revision !== context.membership_revision)
      return respond(
        method,
        r,
        {
          error: {
            code: -32600,
            message: 'Membership changed',
            data: { depin_error: 'membership_stale', refresh_recipients: true, renew_challenge: true },
          },
        },
        actor,
      );
    if (method === 'depinchallenge') return respond(method, r, { challenge: issue(r), expires_in: 30, type: r.args.type }, actor);
    if (method === 'depinsubmitmsg') {
      const outer = sdk.deserializeEciesMessage(sdk.hexToBytes(r.args.encrypted as string));
      const bytes = await sdk.eciesDecrypt(outer, sdk.hexToBytes(POOL_KEY), sdk.transportContext('submit', context.network), pool.address);
      const parsed = await sdk.parseDepinMessage(new TextDecoder().decode(bytes!), { network: 'test' });
      expect((await sdk.verifyDepinReceivedMessage(parsed, { network: 'test' })).signatureValid).toBe(true);
      messages.push({
        hash: parsed.hash,
        token: parsed.token,
        sender: parsed.senderAddress,
        timestamp: parsed.timestamp,
        message_type: parsed.messageType,
        encrypted_payload_hex: parsed.encryptedPayloadHex,
        signature_hex: parsed.signatureHex,
        // RPC 6 delivers the sender key the node resolved; the SDK binds it to the address.
        sender_pubkey_hex: actor.publicKey,
        sequence: ++seq,
      });
      return respond(method, r, { result: 'success', hash: parsed.hash }, actor);
    }
    if (method === 'depinreceiveseq') {
      if (nonces.get(r.challenge) !== key(r))
        return respond(
          method,
          r,
          { error: { code: -32600, message: 'Invalid challenge', data: { depin_error: 'challenge_invalid' } } },
          actor,
        );
      nonces.delete(r.challenge);
      const cursor = r.args.cursor as { after_seq: number | bigint; stream_id: string } | null;
      if (cursor && cursor.stream_id !== stream)
        return respond(
          method,
          r,
          { error: { code: -8, message: 'DePIN stream changed; restart pagination and deduplicate by hash', data: {} } },
          actor,
        );
      const found = messages.filter(
        (m) => m.sequence > BigInt(cursor?.after_seq ?? 0) && (m.token === r.token || m.token.startsWith(r.token + '/')),
      );
      const page = found.slice(0, Math.min(Number(r.args.limit), options.pageSize ?? Number(r.args.limit)));
      return respond(
        method,
        r,
        {
          messages: page,
          has_more: found.length > page.length,
          cursor: {
            version: 1,
            stream_id: stream,
            after_seq: page.slice(-1)[0]?.sequence ?? seq,
            scope: r.token,
            address: r.address,
            from_timestamp: r.args.from_timestamp,
          },
          next_challenge: issue(r),
          next_expires_in: 300,
        },
        actor,
      );
    }
    throw new Error('Unsupported fake pool method ' + method);
  });
  const verified = (): Promise<VerifiedPool> => getVerifiedPool({ call, network: 'testnet', url });
  return {
    pool,
    legacy,
    strict,
    other,
    actors,
    context,
    call,
    url,
    verified,
    messages,
    changeMembership: () => {
      context.membership_revision = (context.membership_revision === '22'.repeat(32) ? '55' : '22').repeat(32);
      nonces.clear();
    },
    tamperNext: () => {
      tamper = true;
    },
  };
}
