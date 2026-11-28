import assert from 'assert';
import { ArkAddress, CreateContractParams, VHTLCContractHandler } from '@arkade-os/sdk';
import { BoltzRealmSchemas } from '@arkade-os/boltz-swap/repositories/realm';

import { BoltzSwapRow, refundStrandedSends, strandedSendContracts } from '../../blue_modules/arkade-stranded-sends';
import { BoltzSwapSchema } from '../../blue_modules/arkade-adapters/realm/boltzSwapSchema';
import { hexToUint8Array, uint8ArrayToHex } from '../../blue_modules/uint8array-extras/index';
import { LOCKUP, PAYMENT_HASH, SENDER, storedSend } from '../helpers/strandedSend';

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
      row(storedSend({ id: 'receive', type: 'reverse' })),
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

  it('keeps the BoltzSwap table identical to boltz-swap, so existing Realms open without a migration', () => {
    assert.deepStrictEqual(BoltzSwapSchema, BoltzRealmSchemas[0]);
  });
});

describe('arkade-stranded-sends — refundStrandedSends', () => {
  const scriptOf = (address: string) => uint8ArrayToHex(ArkAddress.decode(address).pkScript);
  // Lockups holding an unspent coin before and after the recovery. Like the
  // SDK's, the contract manager reports only lockups registered with it.
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
    const rows = swaps.map(row);
    const realm = { objects: () => rows, write: (fn: () => void) => fn() } as unknown as Parameters<typeof refundStrandedSends>[0];
    const refunded = () => rows.filter(r => JSON.parse(r.data).refunded).map(r => r.id);
    return { realm, refunded };
  };

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
    // The read after the settle still shows the coin, as the SDK's stored
    // vtxos do while the indexer is unreachable.
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
