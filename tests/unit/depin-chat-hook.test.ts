import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { fakePool } from './helpers/depin-rpc5';
import { sendDepinGroupMessage } from '../../blue_modules/neurai/depinSend';
import { getSeenSignature } from '../../blue_modules/neurai/depinPoolSeen';
import { useDePINChat } from '../../hooks/useDePINChat';
import type { DepinRpc } from '../../hooks/useDepinChatSetup';
let endpoint = 'https://hook.test.invalid';
jest.mock('../../blue_modules/neurai/depinRpcOverrides', () => ({ getDepinRpcConfig: () => ({ url: endpoint }) }));
const mnemonicIdentity = (node: Awaited<ReturnType<typeof fakePool>>) => ({
  address: node.legacy.address,
  publicKey: node.legacy.publicKey,
  wif: '77'.repeat(32),
  path: "m/44'/1'/100'/0/0",
  coinType: 1,
  account: 100,
  index: 0,
});
const chainAware =
  (node: Awaited<ReturnType<typeof fakePool>>): DepinRpc =>
  <T>(method: string, params: unknown[]) =>
    (method === 'listdepinaddresses'
      ? Promise.resolve(node.actors.map((a) => ({ address: a.address, pubkey: a.publicKey })))
      : node.call(method, params)) as Promise<T>;

test('admission cursors retain late/backdated messages and avoid duplicates across manual polls', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: true });
  endpoint = node.url;
  const pool = await node.verified(),
    rpc = chainAware(node);
  const send = (message: string, timestamp: number) =>
    sendDepinGroupMessage({ call: node.call, pool, identity: node.strict, token: 'TEST/NEWS', message, timestamp, network: 'testnet' });
  await send('first', 1700000000);
  let chat!: ReturnType<typeof useDePINChat>, renderer!: TestRenderer.ReactTestRenderer;
  function Probe() {
    chat = useDePINChat({
      rpc,
      selectedAsset: '&TEST/NEWS',
      identity: mnemonicIdentity(node),
      recipientList: [],
      walletID: 'late',
      network: 'testnet',
      paused: true,
    });
    return null;
  }
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });
  await act(async () => {
    await chat.refreshMessages();
  });
  expect(chat.groupMessages.map((m) => m.message)).toEqual(['first']);
  await send('late older timestamp', 1699999000);
  await act(async () => {
    await chat.refreshMessages();
  });
  expect(chat.groupMessages.map((m) => m.message)).toEqual(['late older timestamp', 'first']);
  await act(async () => {
    await chat.refreshMessages();
  });
  expect(chat.groupMessages).toHaveLength(2);
  const reads = node.call.mock.calls.filter(([method]) => method === 'depinreceiveseq');
  expect(reads[1][1][0]).toMatchObject({ args: { cursor: { after_seq: 9007199254740993n } } });
  await act(async () => renderer.unmount());
});

test('a response completing after a channel change cannot populate the new channel', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: true });
  endpoint = node.url;
  const pool = await node.verified();
  await sendDepinGroupMessage({
    call: node.call,
    pool,
    identity: node.strict,
    token: 'TEST/NEWS',
    message: 'old channel',
    timestamp: 1700000000,
    network: 'testnet',
  });
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((resolve) => {
      release = resolve;
    }),
    ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
  const base = chainAware(node);
  const rpc: DepinRpc = async <T>(method: string, params: unknown[]) => {
    if (method === 'depinreceiveseq') {
      entered();
      await gate;
    }
    return base<T>(method, params);
  };
  let chat!: ReturnType<typeof useDePINChat>, renderer!: TestRenderer.ReactTestRenderer;
  function Probe({ token }: { token: string }) {
    chat = useDePINChat({
      rpc,
      selectedAsset: token,
      identity: mnemonicIdentity(node),
      recipientList: [],
      walletID: 'switch',
      network: 'testnet',
      paused: true,
    });
    return null;
  }
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe, { token: '&TEST/NEWS' }));
  });
  let pending!: Promise<void>;
  await act(async () => {
    pending = chat.refreshMessages();
    await ready;
  });
  await act(async () => {
    renderer.update(React.createElement(Probe, { token: '&TEST/OTHER' }));
  });
  await act(async () => {
    release();
    await pending;
  });
  expect(chat.groupMessages).toEqual([]);
  await act(async () => renderer.unmount());
});

test('deferred hardware messaging opens no obsolete signing session and reports RPC 6 support', async () => {
  const node = await fakePool();
  endpoint = node.url;
  const rpc = chainAware(node);
  const device = { depinSessionBegin: jest.fn(), depinDecryptPayload: jest.fn() } as never;
  let chat!: ReturnType<typeof useDePINChat>, renderer!: TestRenderer.ReactTestRenderer;
  function Probe() {
    chat = useDePINChat({
      rpc,
      selectedAsset: '&TEST',
      identity: { ...mnemonicIdentity(node), wif: '', deviceBacked: true },
      recipientList: [],
      walletID: 'hardware',
      network: 'testnet',
      device,
    });
    return null;
  }
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });
  expect(chat.error).toMatch(/RPC 6/);
  expect(chat.isPolling).toBe(false);
  expect((device as any).depinSessionBegin).not.toHaveBeenCalled();
  expect(node.call).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
});

test('a bounded poll with more pages does not mark the unread backlog as seen', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: true, pageSize: 1 });
  endpoint = node.url;
  const pool = await node.verified(),
    rpc = chainAware(node);
  for (const message of ['one', 'two', 'three'])
    await sendDepinGroupMessage({
      call: node.call,
      pool,
      identity: node.strict,
      token: 'TEST/NEWS',
      message,
      timestamp: 1700000000,
      network: 'testnet',
    });
  let chat!: ReturnType<typeof useDePINChat>, renderer!: TestRenderer.ReactTestRenderer;
  function Probe() {
    chat = useDePINChat({
      rpc,
      selectedAsset: '&TEST/NEWS',
      identity: mnemonicIdentity(node),
      recipientList: [],
      walletID: 'backlog',
      network: 'testnet',
      paused: true,
    });
    return null;
  }
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });
  await act(async () => {
    await chat.refreshMessages();
  });
  expect(chat.groupMessages).toHaveLength(2);
  expect(getSeenSignature('backlog')).toBeNull();
  await act(async () => {
    await chat.refreshMessages();
  });
  expect(chat.groupMessages).toHaveLength(3);
  expect(getSeenSignature('backlog')).toContain('9007199254740995');
  await act(async () => renderer.unmount());
});
