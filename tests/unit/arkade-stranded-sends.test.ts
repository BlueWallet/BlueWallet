import assert from 'assert';
import { ArkAddress, CreateContractParams, VHTLCContractHandler } from '@arkade-os/sdk';

import {
  BoltzSwapRow,
  fundedStrandedSendCount,
  isSettledBoltzRow,
  processStrandedBoltzSwaps,
  pruneSettledBoltzRows,
  refundStrandedSends,
  strandedSendContracts,
} from '../../blue_modules/arkade-stranded-sends';
import { BoltzSwapSchema } from '../../blue_modules/arkade-adapters/realm/boltzSwapSchema';
import { hexToUint8Array, uint8ArrayToHex } from '../../blue_modules/uint8array-extras/index';
import { LOCKUP, PAYMENT_HASH, SENDER, storedChainSwap, storedReceive, storedSend } from '../helpers/strandedSend';

const row = (swap: { id: string; type: string }): BoltzSwapRow => ({ id: swap.id, type: swap.type, data: JSON.stringify(swap) });

const contractsFor = (...swaps: { id: string; type: string }[]) => strandedSendContracts(swaps.map(row), hexToUint8Array(SENDER));

describe('arkade-stranded-sends — strandedSendContracts', () => {
  it('rebuilds a stored send as a vhtlc contract at its exact lockup address', () => {
    const [contract] = contractsFor(storedSend());

    assert.strictEqual(contract.type, 'vhtlc');
    assert.strictEqual(contract.address, LOCKUP.currentSigner);
    assert.strictEqual(contract.script, uint8ArrayToHex(ArkAddress.decode(LOCKUP.currentSigner).pkScript));
    assert.strictEqual(contract.params.sender, SENDER, 'the wallet key is the sender that can refund');
    // The contract manager rejects a contract whose params don't rebuild its script.
    assert.strictEqual(uint8ArrayToHex(VHTLCContractHandler.createScript(contract.params).pkScript), contract.script);
  });

  it('rebuilds a lockup made under the operator signer it has since rotated away from', () => {
    const contracts = contractsFor(storedSend({ response: { ...storedSend().response, address: LOCKUP.previousSigner } }));

    assert.deepStrictEqual(
      contracts.map(c => c.address),
      [LOCKUP.previousSigner],
    );
  });

  it('takes the payment hash from preimageHash when the invoice is missing', () => {
    const contracts = contractsFor(storedSend({ request: { refundPublicKey: '03' + SENDER }, preimageHash: PAYMENT_HASH }));

    assert.deepStrictEqual(
      contracts.map(c => c.address),
      [LOCKUP.currentSigner],
    );
  });

  it('takes every unpaid status, Boltz-pending ones included, and never a paid or refunded send', () => {
    const eligible = [
      'swap.created',
      'invoice.set',
      'transaction.mempool',
      'transaction.confirmed',
      'invoice.pending',
      'invoice.failedToPay',
      'transaction.lockupFailed',
      'swap.expired',
    ];
    const paid = ['invoice.paid', 'transaction.claim.pending', 'transaction.claimed'];

    for (const status of eligible) assert.strictEqual(contractsFor(storedSend({ status })).length, 1, status);
    for (const status of paid) assert.strictEqual(contractsFor(storedSend({ status })).length, 0, status);
    assert.strictEqual(contractsFor(storedSend({ status: 'swap.expired', refunded: true })).length, 0, 'already refunded');
  });

  it('skips rows it cannot rebuild, without failing the rest', () => {
    const rows = [
      { id: 'corrupted', type: 'submarine', data: '{not json' },
      row(storedSend({ id: 'incomplete', response: { ...storedSend().response, claimPublicKey: undefined } })),
      row(storedReceive({ id: 'receive' })),
      row(storedSend({ id: 'good' })),
    ];

    assert.deepStrictEqual(
      strandedSendContracts(rows, hexToUint8Array(SENDER)).map(c => c.metadata?.boltzSwapId),
      ['good'],
    );
  });

  it('skips a send whose lockup does not rebuild under the wallet key', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const otherKey = hexToUint8Array('81a90ed37c66ce185217b0768e955bb7e335f8dcd013568787aebff7d2b2ec91');

    assert.deepStrictEqual(strandedSendContracts([row(storedSend())], otherKey), []);
    assert.ok(String(log.mock.calls[0][0]).includes('does not rebuild to its lockup address'));
    log.mockRestore();
  });

  it('keeps the BoltzSwap table identical to boltz-swap, so existing Realms keep their rows', () => {
    // @arkade-os/boltz-swap 0.3.40 dist/repositories/realm/index.js:94-104.
    assert.deepStrictEqual(BoltzSwapSchema, {
      name: 'BoltzSwap',
      primaryKey: 'id',
      properties: { id: 'string', type: 'string', status: 'string', createdAt: 'int', data: 'string' },
    });
  });
});

const scriptOf = (address: string) => uint8ArrayToHex(ArkAddress.decode(address).pkScript);

// Like the SDK's, this manager reports only lockups registered with it.
const fakeWallet = (recoverable: bigint, fundedBefore: string[] = [], fundedAfter: string[] = [], unregistrable: string[] = []) => {
  const registered = new Set<string>();
  const createContract = jest.fn(async (contract: CreateContractParams) => {
    if (unregistrable.includes(contract.address!)) throw new Error('indexer unreachable');
    registered.add(contract.script);
  });
  let funded = fundedBefore;
  const recoverVtxos = jest.fn(async () => {
    funded = fundedAfter;
    return 'commitment-txid';
  });
  const getContractsWithVtxos = jest.fn(async () =>
    funded.map(scriptOf).flatMap(script => (registered.has(script) ? [{ contract: { script }, vtxos: [{}] }] : [])),
  );
  const wallet = {
    identity: { xOnlyPublicKey: async () => hexToUint8Array(SENDER) },
    getContractManager: async () => ({ createContract, getContractsWithVtxos }),
    getVtxoManager: async () => ({ getRecoverableBalance: async () => ({ recoverable }), recoverVtxos }),
  };
  return { wallet: wallet as unknown as Parameters<typeof refundStrandedSends>[1], createContract, recoverVtxos };
};

const fakeRealm = (...swaps: { id: string; type: string }[]) => {
  let rows = swaps.map(row);
  const realm = {
    objects: () => rows,
    write: (fn: () => void) => fn(),
    delete: (target: BoltzSwapRow) => {
      rows = rows.filter(r => r !== target);
    },
  } as unknown as Parameters<typeof refundStrandedSends>[0];
  return {
    realm,
    refunded: () => rows.filter(r => JSON.parse(r.data).refunded).map(r => r.id),
    ids: () => rows.map(r => r.id),
  };
};

describe('arkade-stranded-sends — refundStrandedSends', () => {
  it('registers each stranded send and settles what has matured', async () => {
    const { wallet, createContract, recoverVtxos } = fakeWallet(19_000n);

    const settled = await refundStrandedSends(
      fakeRealm(storedSend(), storedSend({ id: 'paid', status: 'transaction.claimed' })).realm,
      wallet,
    );

    assert.strictEqual(settled, true);
    assert.strictEqual(createContract.mock.calls.length, 1, 'the paid send is left alone');
    assert.strictEqual(createContract.mock.calls[0][0].address, LOCKUP.currentSigner);
    assert.strictEqual(recoverVtxos.mock.calls.length, 1);
  });

  it('marks refunded only the sends whose lockup the recovery emptied', async () => {
    const older = storedSend({ id: 'send-2', response: { ...storedSend().response, address: LOCKUP.previousSigner } });
    const { wallet } = fakeWallet(19_000n, [LOCKUP.currentSigner, LOCKUP.previousSigner], [LOCKUP.previousSigner]);
    const { realm, refunded } = fakeRealm(storedSend(), older);

    await refundStrandedSends(realm, wallet);

    assert.deepStrictEqual(refunded(), ['send-1'], 'send-2 still holds a coin the recovery did not take');
  });

  it('settles the rest past a send it cannot register, and leaves that one for the next launch', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const older = storedSend({ id: 'send-2', response: { ...storedSend().response, address: LOCKUP.previousSigner } });
    const { realm, refunded } = fakeRealm(storedSend(), older);
    // send-2's lockup is funded, but unregistered the recovery cannot reach it.
    const both = [LOCKUP.currentSigner, LOCKUP.previousSigner];
    const { wallet, recoverVtxos } = fakeWallet(19_000n, both, [LOCKUP.previousSigner], [LOCKUP.previousSigner]);

    assert.strictEqual(await refundStrandedSends(realm, wallet), true);
    assert.strictEqual(recoverVtxos.mock.calls.length, 1);
    assert.deepStrictEqual(refunded(), ['send-1'], 'send-2 never left its lockup, so it is not refunded');

    const nextLaunch = fakeWallet(0n);
    await refundStrandedSends(realm, nextLaunch.wallet);
    assert.strictEqual(nextLaunch.createContract.mock.calls.length, 1, 'only send-2 is registered again');
    assert.strictEqual(nextLaunch.createContract.mock.calls[0][0].address, LOCKUP.previousSigner);
    log.mockRestore();
  });

  it('never marks a lockup that was already empty, such as one Boltz claimed', async () => {
    const { wallet } = fakeWallet(19_000n);
    const { realm, refunded } = fakeRealm(storedSend());

    await refundStrandedSends(realm, wallet);

    assert.deepStrictEqual(refunded(), []);
  });

  it('marks on a later launch a refund it settled but could not confirm', async () => {
    const { realm, refunded } = fakeRealm(storedSend());
    // The post-settle read still shows the coin, as stored vtxos do offline.
    await refundStrandedSends(realm, fakeWallet(19_000n, [LOCKUP.currentSigner], [LOCKUP.currentSigner]).wallet);
    assert.deepStrictEqual(refunded(), []);

    const nextLaunch = fakeWallet(0n);
    assert.strictEqual(await refundStrandedSends(realm, nextLaunch.wallet), true, 'refreshes for the new label');
    assert.deepStrictEqual(refunded(), ['send-1']);
    assert.strictEqual(nextLaunch.recoverVtxos.mock.calls.length, 0);
  });

  it('keeps a lockup seen funded unmarked on a later launch while it still holds its coin', async () => {
    const { realm, refunded } = fakeRealm(storedSend());
    await refundStrandedSends(realm, fakeWallet(19_000n, [LOCKUP.currentSigner], [LOCKUP.currentSigner]).wallet);

    assert.strictEqual(await refundStrandedSends(realm, fakeWallet(0n, [LOCKUP.currentSigner]).wallet), false);
    assert.deepStrictEqual(refunded(), []);
  });

  it('registers but does not settle while nothing is recoverable yet', async () => {
    const { wallet, createContract, recoverVtxos } = fakeWallet(0n);

    assert.strictEqual(await refundStrandedSends(fakeRealm(storedSend()).realm, wallet), false);
    assert.strictEqual(createContract.mock.calls.length, 1, 'registered, so the lockup is recovered once it matures');
    assert.strictEqual(recoverVtxos.mock.calls.length, 0);
  });

  it('touches nothing when there is no stranded send', async () => {
    const { wallet, createContract, recoverVtxos } = fakeWallet(19_000n);

    assert.strictEqual(await refundStrandedSends(fakeRealm(storedSend({ status: 'transaction.claimed' })).realm, wallet), false);
    assert.strictEqual(createContract.mock.calls.length, 0);
    assert.strictEqual(recoverVtxos.mock.calls.length, 0);
  });
});

describe('arkade-stranded-sends — fundedStrandedSendCount', () => {
  it('counts a send whose lockup still holds a coin, registering it first', async () => {
    const { wallet } = fakeWallet(0n, [LOCKUP.currentSigner]);
    const { realm } = fakeRealm(
      storedSend(),
      storedSend({ id: 'send-2', response: { ...storedSend().response, address: LOCKUP.previousSigner } }),
    );
    assert.strictEqual(await fundedStrandedSendCount(realm, wallet), 1);
  });

  it('reads the lockups fresh, so an offline read refuses instead of trusting the cache', async () => {
    const { wallet } = fakeWallet(0n, [LOCKUP.currentSigner]);
    const manager = await wallet.getContractManager();
    await fundedStrandedSendCount(fakeRealm(storedSend()).realm, wallet);
    assert.deepStrictEqual((manager.getContractsWithVtxos as jest.Mock).mock.calls[0][2], { unspentOnly: true, requireSynced: true });
  });

  it('counts nothing, and touches no contract, when no send can be refunded', async () => {
    const { wallet, createContract } = fakeWallet(0n, [LOCKUP.currentSigner]);
    const { realm } = fakeRealm(storedSend({ status: 'invoice.paid' }), storedReceive({ status: 'swap.created' }), storedChainSwap());
    assert.strictEqual(await fundedStrandedSendCount(realm, wallet), 0);
    assert.strictEqual(createContract.mock.calls.length, 0);
  });

  it('throws when a lockup cannot be registered, rather than reading it as empty', async () => {
    const { wallet } = fakeWallet(0n, [LOCKUP.currentSigner], [], [LOCKUP.currentSigner]);
    await assert.rejects(fundedStrandedSendCount(fakeRealm(storedSend()).realm, wallet), /indexer unreachable/);
  });
});

describe('arkade-stranded-sends — isSettledBoltzRow', () => {
  it('settles a send whose lockup came back or Boltz emptied', () => {
    assert.strictEqual(isSettledBoltzRow(row(storedSend({ refunded: true }))), true, 'refunded by us');
    for (const status of ['transaction.claimed', 'transaction.refunded']) {
      assert.strictEqual(isSettledBoltzRow(row(storedSend({ status }))), true, status);
    }
  });

  it('keeps a send whose sats may still be in its lockup', () => {
    for (const status of ['swap.created', 'invoice.set', 'invoice.pending', 'transaction.mempool', 'transaction.confirmed']) {
      assert.strictEqual(isSettledBoltzRow(row(storedSend({ status }))), false, status);
    }
    for (const status of ['invoice.paid', 'transaction.claim.pending', 'invoice.failedToPay', 'transaction.lockupFailed', 'swap.expired']) {
      assert.strictEqual(isSettledBoltzRow(row(storedSend({ status }))), false, status);
    }
  });

  it('settles a receive that paid out or was never funded', () => {
    for (const status of [
      'invoice.settled',
      'invoice.expired',
      'invoice.failedToPay',
      'transaction.lockupFailed',
      'transaction.refunded',
    ]) {
      assert.strictEqual(isSettledBoltzRow(row(storedReceive({ status }))), true, status);
    }
  });

  it('keeps a receive Boltz funded but we never claimed, or one whose status may be stale', () => {
    for (const status of ['swap.created', 'transaction.mempool', 'transaction.confirmed']) {
      assert.strictEqual(isSettledBoltzRow(row(storedReceive({ status }))), false, status);
    }
  });

  it('keeps every chain swap and every row it cannot read', () => {
    for (const status of ['transaction.claimed', 'swap.expired', 'transaction.server.confirmed']) {
      assert.strictEqual(isSettledBoltzRow(row(storedChainSwap({ status }))), false, `chain ${status}`);
    }
    assert.strictEqual(isSettledBoltzRow({ id: 'corrupted', type: 'submarine', data: '{not json' }), false);
    assert.strictEqual(isSettledBoltzRow(row({ id: 'future', type: 'something-new' })), false);
  });
});

describe('arkade-stranded-sends — processStrandedBoltzSwaps', () => {
  it('deletes the rows it finished with and keeps the rest', async () => {
    const { realm, ids } = fakeRealm(
      storedSend({ id: 'refundable' }),
      storedSend({ id: 'claimed-by-boltz', status: 'transaction.claimed' }),
      storedSend({ id: 'paid-not-swept', status: 'invoice.paid' }),
      storedReceive({ id: 'funded-receive' }),
      storedReceive({ id: 'dead-receive', status: 'invoice.expired' }),
      storedChainSwap({ id: 'chain' }),
    );
    const { wallet } = fakeWallet(19_000n, [LOCKUP.currentSigner], []);

    assert.strictEqual(await processStrandedBoltzSwaps(realm, wallet), true);
    assert.deepStrictEqual(ids(), ['paid-not-swept', 'funded-receive', 'chain']);
  });

  it('keeps a send the recovery could not get back', async () => {
    const { realm, ids } = fakeRealm(storedSend());
    const { wallet } = fakeWallet(19_000n, [LOCKUP.currentSigner], [LOCKUP.currentSigner]);

    await processStrandedBoltzSwaps(realm, wallet);

    assert.deepStrictEqual(ids(), ['send-1'], 'its lockup still holds the coin');
  });

  it('prunes without a recovery to run, and is a no-op the second time', () => {
    const { realm, ids } = fakeRealm(storedReceive({ status: 'invoice.settled' }), storedReceive({ id: 'keep' }));

    assert.strictEqual(pruneSettledBoltzRows(realm), 1);
    assert.deepStrictEqual(ids(), ['keep']);
    assert.strictEqual(pruneSettledBoltzRows(realm), 0);
  });
});
