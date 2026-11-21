import { fakePool, openStored, sdk } from './helpers/depin-rpc5';
import { sendDepinPrivateMessage, verifiedRecipients } from '../../blue_modules/neurai/depinSend';
test('private selection includes only the exact recipient and sender, even above the group limit', async () => {
  const node = await fakePool(),
    pool = await node.verified();
  const result = await sendDepinPrivateMessage({
    call: node.call,
    pool,
    identity: node.legacy,
    token: 'TEST/NEWS',
    toAddress: node.strict.address,
    message: 'private',
    timestamp: 1700000000,
    network: 'testnet',
    senderPubKey: node.legacy.publicKey,
    privateKey: 'unused',
  });
  expect(result.recipientCount).toBe(2);
  const message = node.messages[0];
  expect(await openStored(message, '88'.repeat(32))).toBe(`@${node.strict.address} private`);
  expect(await openStored(message, '99'.repeat(32))).toBeNull();
});
test('the recipient must be in the verified directory; an arbitrary supplied address cannot be used', async () => {
  const node = await fakePool(),
    pool = await node.verified();
  const outsider = await sdk.createSoftwareIdentity({ privateKey: 'aa'.repeat(32), network: 'test' });
  await expect(
    sendDepinPrivateMessage({
      call: node.call,
      pool,
      identity: node.legacy,
      token: 'TEST/NEWS',
      toAddress: outsider.address,
      message: 'private',
      timestamp: 1700000000,
      network: 'testnet',
      senderPubKey: node.legacy.publicKey,
      privateKey: 'unused',
    }),
  ).rejects.toThrow(/not an eligible recipient/);
  expect(node.messages).toEqual([]);
});
test('recipient picker verifies the complete directory without applying the message recipient limit', async () => {
  const node = await fakePool(),
    pool = await node.verified();
  const recipients = await verifiedRecipients({
    call: node.call,
    pool,
    token: 'TEST/NEWS',
    senderPubKey: node.legacy.publicKey,
    senderAddress: node.legacy.address,
    network: 'testnet',
  });
  expect(recipients).toHaveLength(3);
  expect(recipients.some((r) => r.address === node.strict.address)).toBe(true);
  expect(node.call.mock.calls.slice(-1)[0][1][0]).toMatchObject({ args: { max_results: 10000 } });
});

test('a revoked private target is removed by the refreshed directory before another submit', async () => {
  const node = await fakePool({ maxRecipients: 20, complete: true }),
    pool = await node.verified();
  let submits = 0;
  const call = async (method: string, params: unknown[]) => {
    if (method === 'depinsubmitmsg') {
      submits++;
      node.changeMembership();
      node.actors.splice(1, 1);
    }
    return node.call(method, params);
  };
  await expect(
    sendDepinPrivateMessage({
      call,
      pool,
      identity: node.legacy,
      token: 'TEST/NEWS',
      toAddress: node.strict.address,
      message: 'revoked',
      timestamp: 1700000000,
      network: 'testnet',
      senderPubKey: node.legacy.publicKey,
      privateKey: '77'.repeat(32),
    }),
  ).rejects.toThrow(/not an eligible/);
  expect(submits).toBe(1);
  expect(node.messages).toHaveLength(0);
});
