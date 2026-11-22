/**
 * A NeuraiHW device double for DePIN RPC 6 / format 3, following the firmware
 * contract (Protocol.cpp / DepinPool.cpp) with the SDK's reference crypto.
 * Ported from neurai-sign-esp32 0.9.0's own `depin-client.test.ts` double.
 * Test-only keys; nothing touches a network.
 */
import { NeuraiESP32, type INeuraiTransport } from '@neuraiproject/neurai-sign-esp32/react-native';

const sdk: any = require('@neuraiproject/neurai-depin-msg');

export const TESTNET_GENESIS = '000000c710413a4265a996d30c86043aedef6a563900f1bc43fea61d5b2dc77d';

export const RPC6_PING = {
  status: 'success',
  device: 'NeuraiHW',
  version: '0.1.0',
  firmware_version: '0.2.0',
  chip: 'ESP32-S3',
  protocol_version: 2,
  capabilities: ['depin_identity', 'depin_session_key', 'depin_message_v3', 'depin_rpc_v6', 'depin_bulk_decrypt_b64'],
  depin_ecies_format: 3,
  depin_rpc_version: 6,
  depin_max_decrypt_bytes: 32768,
};

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const json = (value: unknown) => JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v));

export async function deviceDouble(options: {
  /** 64-hex private key of the device's DePIN identity. */
  privateKey: string;
  genesis?: string;
  network?: 'xna' | 'xna-test';
  ping?: Record<string, unknown>;
  /** Answer `depin_session_begin` like an owner pressing "Reject". */
  declineSession?: boolean;
}) {
  const GENESIS = options.genesis ?? TESTNET_GENESIS;
  const me = await sdk.createSoftwareIdentity({ privateKey: options.privateKey, network: 'test' });
  let session: { key: string; token: string; root: string; poolKey: string } | null = null;
  let service: Record<string, unknown> | null = null;
  let pending: { id: string; method: string; request: Record<string, unknown> } | null = null;
  const commands: Record<string, any>[] = [];
  const ok = (body: Record<string, unknown>) => ({ status: 'success', ...body }) as any;
  const fail = (message: string) => ({ status: 'error', message }) as any;

  async function handle(c: Record<string, any>): Promise<any> {
    commands.push(c);
    if (c.action === 'ping') return options.ping ?? RPC6_PING;
    if (c.action === 'depin_session_begin') {
      if (options.declineSession) return fail('User cancelled');
      session = { key: 'ab'.repeat(16), token: c.token, root: c.pool_root, poolKey: c.pool_pubkey };
      return ok({ session: true, token: c.token, session_key: session.key, expires_in_s: 900, max_session_s: 3600, rate_per_min: 100 });
    }
    if (c.action === 'depin_session_end') {
      session = null;
      return ok({});
    }
    if (c.action === 'get_depin_identity') {
      return ok({
        address: me.address,
        pubkey: me.publicKey,
        genesis: GENESIS,
        path: "m/44'/1'/100'/0/0",
        network: options.network ?? 'xna-test',
        protocol_version: 2,
      });
    }
    if (!session || c.session_key !== session.key) return fail('session_required');
    if (c.action === 'depin_prepare_rpc') {
      const input = c.request;
      const id = hex(crypto.getRandomValues(new Uint8Array(32)));
      const method = input.method;
      let request: Record<string, any>;
      if (method === 'depingetmsginfo') {
        request = sdk.createDepinRpcRequest({ method, requestId: id, timestampMs: input.timestamp_ms });
      } else {
        if (!service) return fail('NotBootstrapped');
        let args: Record<string, unknown> = {};
        let token = session.token;
        let address = me.address;
        let challenge = '';
        if (method === 'depinchallenge') args = { type: 'receive' };
        else if (method === 'depingetancestorrecipients') {
          args = { max_results: input.limit, stop_at: session.root };
          address = '';
        } else if (method === 'depinreceiveseq') {
          challenge = input.challenge;
          args = { ...(input.cursor ? { cursor: input.cursor } : {}), limit: input.limit, from_timestamp: input.from_timestamp };
        } else if (method === 'depinsubmitmsg') {
          const parsed = await sdk.parseDepinMessage(input.message_hex, { expectedNetworkHash: GENESIS });
          const check = await sdk.verifyDepinReceivedMessage(parsed, { network: 'test', expectedNetworkHash: GENESIS, senderPubKey: me.publicKey });
          if (parsed.senderAddress !== me.address || parsed.token !== session.token || !check.signatureValid) return fail('ScopeMismatch');
          args = { encrypted: (await sdk.wrapMessageForServer(input.message_hex, session.poolKey, me.address, GENESIS)).encrypted };
          token = '';
        } else return fail('BadArg');
        request = sdk.createDepinRpcRequest({ method, context: service, token, address, challenge, args, requestId: id, timestampMs: input.timestamp_ms });
        if (address) request.signature = sdk.signRecoverableMessage(sdk.buildDepinRpcRequestPreimage({ method, request }), options.privateKey);
      }
      pending = { id, method, request };
      return ok({ id, params: [request] });
    }
    if (c.action === 'depin_open_reply') {
      if (!pending || c.reply?.id !== pending.id) return fail('BadJson');
      const verified = sdk.verifyDepinReply({
        reply: c.reply.result,
        method: pending.method,
        request: pending.request,
        poolPublicKey: session.poolKey,
        expectedNetworkHash: GENESIS,
      });
      const body = verified.kind === 'bound' ? await sdk.openBoundReply(verified, me.openReply) : sdk.decodePlainReply(verified);
      // The device adopts the service context the pool signed.
      const r = c.reply.result;
      service = {
        network: r.network,
        pool_pubkey: r.pool_pubkey,
        pool_root: r.pool_root,
        instance_id: r.instance_id,
        membership_revision: r.membership_revision,
        membership_height: r.membership_height,
        membership_blockhash: r.membership_blockhash,
      };
      pending = null;
      return ok({ plaintext_b64: Buffer.from(json(body)).toString('base64'), op_count: 1 });
    }
    if (c.action === 'depin_sign') {
      if (c.token !== session.token || c.sender !== me.address) return fail('wrong_sender');
      const fields = {
        token: c.token,
        senderAddress: c.sender,
        timestamp: c.timestamp,
        messageType: c.message_type === 1 ? 'private' : 'group',
        expectedNetworkHash: GENESIS,
        network: 'test',
      };
      const payload = Buffer.from(c.encrypted_payload_b64, 'base64').toString('hex');
      const digest = (await sdk.assembleDepinMessage({ ...fields, encryptedPayloadHex: payload }, '01'.repeat(64))).messageHashBytes as string;
      const signature = await me.signDigest(Buffer.from(digest, 'hex'));
      return ok({ signature: typeof signature === 'string' ? signature : hex(signature), op_count: 1 });
    }
    if (c.action === 'depin_decrypt_payload') {
      if (c.token !== session.token) return fail('bad_message_header');
      const env = sdk.deserializeEciesMessage(Buffer.from(c.encrypted_payload_b64, 'base64'));
      const ctx = sdk.messageContext(
        { token: c.token, senderAddress: c.sender, timestamp: c.timestamp, messageTypeByte: c.message_type },
        GENESIS,
      );
      try {
        const plain = await sdk.eciesDecrypt(env, Buffer.from(options.privateKey, 'hex'), ctx, me.address);
        if (!plain) return fail('not_for_us');
        return ok({ plaintext_b64: Buffer.from(plain).toString('base64'), op_count: 1 });
      } catch {
        return fail('not_for_us');
      }
    }
    return fail('Unknown action');
  }

  const transport: INeuraiTransport = {
    connected: true,
    async open() {},
    async close() {},
    sendCommand: command => handle(command as Record<string, any>),
    sendCommandFinal: command => handle(command as Record<string, any>),
    sendCommandHeartbeat: command => handle(command as Record<string, any>),
  };
  const device = new NeuraiESP32({ transport });
  return {
    device,
    me,
    commands,
    /** The device forgets its session, as after an idle timeout or a reboot. */
    dropSession: () => {
      session = null;
    },
  };
}
