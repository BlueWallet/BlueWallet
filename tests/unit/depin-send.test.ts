import { fakePool, openStored } from './helpers/depin-rpc5';
import { sendDepinGroupMessage, softwareIdentity } from '../../blue_modules/neurai/depinSend';
test('group send resolves, encrypts for every exact identity and returns the authenticated receipt', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: true }),
    pool = await node.verified();
  const sent = await sendDepinGroupMessage({
    call: node.call,
    pool,
    identity: node.legacy,
    token: 'TEST/NEWS',
    message: 'hola',
    timestamp: 1700000000,
    network: 'testnet',
  });
  expect(sent.recipientCount).toBe(3);
  expect(sent.messageHash).toBe(node.messages[0].hash);
  for (const [, key] of [
    [node.legacy, '77'],
    [node.strict, '88'],
    [node.other, '99'],
  ] as const)
    expect(await openStored(node.messages[0], key.repeat(32))).toBe('hola');
});
test('incomplete skip accounting prevents submission even if the directory entries were complete', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: false }),
    pool = await node.verified();
  await expect(
    sendDepinGroupMessage({
      call: node.call,
      pool,
      identity: node.legacy,
      token: 'TEST/NEWS',
      message: 'hola',
      timestamp: 1700000000,
      network: 'testnet',
    }),
  ).rejects.toThrow(/truncated/);
  expect(node.call.mock.calls.some(([m]) => m === 'depinsubmitmsg')).toBe(false);
});
test('a group above the pool limit fails before submitting', async () => {
  const node = await fakePool(),
    pool = await node.verified();
  await expect(
    sendDepinGroupMessage({
      call: node.call,
      pool,
      identity: node.legacy,
      token: 'TEST/NEWS',
      message: 'hola',
      timestamp: 1700000000,
      network: 'testnet',
    }),
  ).rejects.toThrow(/recipient map/);
  expect(node.messages).toEqual([]);
});
test('software identity can explicitly sign for Legacy or strict ECDSA', async () => {
  const node = await fakePool();
  expect((await softwareIdentity('77'.repeat(32), 'testnet', node.legacy.address)).address).toBe(node.legacy.address);
  expect((await softwareIdentity('88'.repeat(32), 'testnet', node.strict.address)).address).toBe(node.strict.address);
});

test('one authenticated membership rejection refreshes recipients, encrypts again and signs a fresh request', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: true }),
    pool = await node.verified();
  let submits = 0;
  const call = jest.fn(async (method: string, params: unknown[]) => {
    if (method === 'depinsubmitmsg' && ++submits === 1) {
      node.changeMembership();
      node.actors.splice(2, 1);
    }
    return node.call(method, params);
  });
  const sent = await sendDepinGroupMessage({
    call,
    pool,
    identity: node.legacy,
    token: 'TEST/NEWS',
    message: 'fresh group',
    timestamp: 1700000000,
    network: 'testnet',
  });
  expect(submits).toBe(2);
  expect(node.messages).toHaveLength(1);
  expect(sent.recipientCount).toBe(2);
  expect(await openStored(node.messages[0], '99'.repeat(32))).toBeNull();
  const attempts = call.mock.calls.filter(([m]) => m === 'depinsubmitmsg').map(([, p]) => (p as any[])[0]);
  expect(attempts[0].request_id).not.toBe(attempts[1].request_id);
  expect(attempts[0].membership_revision).not.toBe(attempts[1].membership_revision);
});

test('membership churn permits at most one rebuilt send', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: true }),
    pool = await node.verified();
  let submits = 0;
  const call = async (method: string, params: unknown[]) => {
    if (method === 'depinsubmitmsg') {
      submits++;
      node.changeMembership();
    }
    return node.call(method, params);
  };
  await expect(
    sendDepinGroupMessage({
      call,
      pool,
      identity: node.legacy,
      token: 'TEST/NEWS',
      message: 'churn',
      timestamp: 1700000000,
      network: 'testnet',
    }),
  ).rejects.toThrow(/Membership/);
  expect(submits).toBe(2);
  expect(node.messages).toHaveLength(0);
});

test('an ambiguous failure after admission never replays the write', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: true }),
    pool = await node.verified();
  let submits = 0;
  const call = async (method: string, params: unknown[]) => {
    const result = await node.call(method, params);
    if (method === 'depinsubmitmsg') {
      submits++;
      throw new Error('Response timeout');
    }
    return result;
  };
  await expect(
    sendDepinGroupMessage({
      call,
      pool,
      identity: node.legacy,
      token: 'TEST/NEWS',
      message: 'ambiguous',
      timestamp: 1700000000,
      network: 'testnet',
    }),
  ).rejects.toThrow(/timeout/);
  expect(submits).toBe(1);
  expect(node.messages).toHaveLength(1);
});

test('an unsigned transport error claiming code -26 cannot trigger a write retry', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: true }),
    pool = await node.verified();
  let submits = 0;
  const call = async (method: string, params: unknown[]) => {
    if (method === 'depinsubmitmsg') {
      submits++;
      throw Object.assign(new Error('Recipient not authorized'), { code: -26 }); // not a verified DepinRpcError
    }
    return node.call(method, params);
  };
  await expect(
    sendDepinGroupMessage({
      call,
      pool,
      identity: node.legacy,
      token: 'TEST/NEWS',
      message: 'unsigned',
      timestamp: 1700000000,
      network: 'testnet',
    }),
  ).rejects.toMatchObject({ code: -26 });
  expect(submits).toBe(1);
  expect(node.messages).toHaveLength(0);
});
