import { DepinDeviceError } from '@neuraiproject/neurai-sign-esp32/react-native';

import { fakePool, openStored, sdk } from './helpers/depin-rpc5';
import { deviceDouble } from './helpers/depin-device-double';
import {
  DepinDeviceSessionError,
  deviceRpcTransport,
  endDeviceSession,
  forgetDeviceSession,
  isDeviceStopError,
  receiveDevicePage,
  sendDeviceMessage,
  type DeviceChannel,
} from '../../blue_modules/neurai/depinDevice';
import { sendDepinPrivateMessage } from '../../blue_modules/neurai/depinSend';

// The device holds the legacy actor's key ('77'), as a NeuraiHW holds account 100'.
async function setup(options: Parameters<typeof fakePool>[0] = { maxRecipients: 20, complete: true }) {
  const node = await fakePool({ sequenceBase: 0n, ...options });
  const pool = await node.verified();
  const hw = await deviceDouble({ privateKey: '77'.repeat(32) });
  const approvals: boolean[] = [];
  const channel: DeviceChannel = {
    device: hw.device,
    call: node.call,
    serviceUrl: node.url,
    token: 'TEST/NEWS',
    pool,
    onApproval: pending => approvals.push(pending),
  };
  return { node, pool, hw, channel, approvals };
}

const actions = (hw: { commands: Array<Record<string, any>> }) => hw.commands.map(c => String(c.action));

afterEach(async () => {
  await endDeviceSession();
});

test('a group message is signed on the device, readable by every holder, and read back through the device', async () => {
  const { node, hw, channel, approvals } = await setup();
  expect(hw.me.address).toBe(node.legacy.address);

  const sent = await sendDeviceMessage({ ...channel, message: 'hola desde la placa' });
  expect(sent.recipientCount).toBe(3);
  expect(node.messages).toHaveLength(1);
  expect(sent.messageHash).toBe(node.messages[0].hash);
  expect(node.messages[0].sender).toBe(node.legacy.address);
  for (const key of ['77', '88', '99']) expect(await openStored(node.messages[0], key.repeat(32))).toBe('hola desde la placa');

  // One approval for the session, shown while the device waited for the owner.
  expect(approvals).toEqual([true, false]);
  expect(actions(hw).filter(a => a === 'depin_session_begin')).toHaveLength(1);
  expect(hw.commands.find(c => c.action === 'depin_session_begin')).toMatchObject({
    token: '&TEST/NEWS',
    pool_root: '&TEST',
    pool_pubkey: node.pool.publicKey,
  });

  const page = await receiveDevicePage({ ...channel, cursor: null });
  expect(page.messages).toEqual([
    expect.objectContaining({ hash: sent.messageHash, sender: node.legacy.address, messageType: 'group', plaintext: 'hola desde la placa' }),
  ]);
  expect(page.hasMore).toBe(false);
  expect(Number(page.cursor.after_seq)).toBe(1);
  // The session is reused: no second approval.
  expect(actions(hw).filter(a => a === 'depin_session_begin')).toHaveLength(1);
});

test('a private message reaches only the recipient and the sender, tagged for its conversation', async () => {
  const { node, channel } = await setup();
  await sendDeviceMessage({ ...channel, message: 'solo para ti', toAddress: node.strict.address });
  const stored = node.messages[0];
  expect(await openStored(stored, '88'.repeat(32))).toBe(`@${node.strict.address} solo para ti`);
  expect(await openStored(stored, '77'.repeat(32))).toBe(`@${node.strict.address} solo para ti`);
  expect(await openStored(stored, '99'.repeat(32))).toBeNull();
});

test('the device reads a page in small steps, skipping rows addressed to others', async () => {
  const { node, pool, channel } = await setup();
  // Software members write: one to the device holder, one that excludes it, one group.
  await sendDepinPrivateMessage({
    call: node.call,
    pool,
    identity: node.strict,
    token: 'TEST/NEWS',
    toAddress: node.legacy.address,
    message: 'para la placa',
    timestamp: Math.floor(Date.now() / 1000),
    network: 'testnet',
    senderPubKey: node.strict.publicKey,
    privateKey: 'unused',
  });
  await sendDepinPrivateMessage({
    call: node.call,
    pool,
    identity: node.strict,
    token: 'TEST/NEWS',
    toAddress: node.other.address,
    message: 'no es para la placa',
    timestamp: Math.floor(Date.now() / 1000),
    network: 'testnet',
    senderPubKey: node.strict.publicKey,
    privateKey: 'unused',
  });
  await sendDeviceMessage({ ...channel, message: 'grupo' });

  const first = await receiveDevicePage({ ...channel, cursor: null });
  expect(first.messages.map(m => m.plaintext)).toEqual([`@${node.legacy.address} para la placa`]);
  expect(first.rejected).toBe(1);
  expect(first.hasMore).toBe(true);
  const second = await receiveDevicePage({ ...channel, cursor: first.cursor });
  expect(second.messages.map(m => m.plaintext)).toEqual(['grupo']);
  expect(second.hasMore).toBe(false);
});

test('a session the device dropped is reopened once, with a new approval', async () => {
  const { hw, channel, approvals } = await setup();
  await receiveDevicePage({ ...channel, cursor: null });
  hw.dropSession();
  await receiveDevicePage({ ...channel, cursor: null });
  expect(actions(hw).filter(a => a === 'depin_session_begin')).toHaveLength(2);
  expect(approvals).toEqual([true, false, true, false]);
});

test('switching channel ends the previous session before opening the next', async () => {
  const { hw, channel } = await setup();
  await receiveDevicePage({ ...channel, cursor: null });
  await receiveDevicePage({ ...channel, token: 'TEST', cursor: null });
  const begins = hw.commands.filter(c => c.action === 'depin_session_begin').map(c => c.token);
  expect(begins).toEqual(['&TEST/NEWS', '&TEST']);
  const sequence = actions(hw);
  expect(sequence.indexOf('depin_session_end')).toBeGreaterThan(sequence.indexOf('depin_session_begin'));
  expect(sequence.indexOf('depin_session_end')).toBeLessThan(sequence.lastIndexOf('depin_session_begin'));
});

test('a group send is refused when the pool does not confirm complete recipient accounting', async () => {
  const { node, hw, channel } = await setup({ maxRecipients: 20, complete: false });
  await expect(sendDeviceMessage({ ...channel, message: 'x' })).rejects.toThrow(/truncated recipient list/);
  expect(node.messages).toHaveLength(0);
  // Refused before the device was asked for anything.
  expect(actions(hw)).not.toContain('depin_session_begin');
});

test('a declined session and old firmware stop automatic retries', async () => {
  const declined = await fakePool({ maxRecipients: 20, complete: true, sequenceBase: 0n });
  const pool = await declined.verified();
  const refuse = await deviceDouble({ privateKey: '77'.repeat(32), declineSession: true });
  const channel = { device: refuse.device, call: declined.call, serviceUrl: declined.url, token: 'TEST', pool };
  const error = await receiveDevicePage({ ...channel, cursor: null }).catch(e => e);
  expect(error).toBeInstanceOf(DepinDeviceSessionError);
  expect(isDeviceStopError(error)).toBe(true);

  forgetDeviceSession();
  const old = await deviceDouble({ privateKey: '77'.repeat(32), ping: { status: 'success', capabilities: ['depin_identity'], protocol_version: 2 } });
  const unsupported = await receiveDevicePage({ ...channel, device: old.device, cursor: null }).catch(e => e);
  expect(unsupported).toBeInstanceOf(DepinDeviceError);
  expect(unsupported.code).toBe('UNSUPPORTED_FIRMWARE');
  expect(isDeviceStopError(unsupported)).toBe(true);
  expect(old.commands.map(c => c.action)).toEqual(['ping']);
});

test('the transport answers in the proxy form, with integers the device can take back as JSON', async () => {
  const transport = deviceRpcTransport(async () => ({ protocol: 6, membership_height: 7n, nested: [1n] }));
  expect(await transport({ jsonrpc: '1.0', id: 'ab'.repeat(32), method: 'depingetmsginfo', params: [] })).toEqual({
    result: { protocol: 6, membership_height: 7, nested: [1] },
  });
  const failing = deviceRpcTransport(async () => {
    throw Object.assign(new Error('Membership changed'), { code: -32600 });
  });
  expect(await failing({ jsonrpc: '1.0', id: 'cd'.repeat(32), method: 'depinchallenge', params: [] })).toEqual({
    error: { code: -32600, message: 'Membership changed' },
  });
  const unsafe = deviceRpcTransport(async () => ({ value: 2n ** 60n }));
  expect((await unsafe({ jsonrpc: '1.0', id: 'ef'.repeat(32), method: 'x', params: [] })) as any).toMatchObject({
    error: { message: 'DePIN reply integer beyond 2^53' },
  });
});

test('a node error reaches the caller as a pool error, and the session survives it', async () => {
  const { node, hw, channel } = await setup();
  await receiveDevicePage({ ...channel, cursor: null });
  const failing: DeviceChannel = {
    ...channel,
    call: async (method, params) => {
      if (method === 'depinchallenge') throw Object.assign(new Error('No healthy RPC node available'), { code: 1005 });
      return node.call(method, params);
    },
  };
  const error = await receiveDevicePage({ ...failing, cursor: null }).catch(e => e);
  expect(error).toBeInstanceOf(DepinDeviceError);
  expect(error.code).toBe('POOL_ERROR');
  expect(String(error.message)).toMatch(/No healthy RPC node available/);
  expect(hw.commands.filter(c => c.action === 'depin_session_begin')).toHaveLength(1);
});

test('the SDK is the RPC 6 one the device client requires', () => {
  expect(sdk.DEPIN_RPC_PROTOCOL).toBe(6);
});
