import assert from 'assert';
import { ArkAddress, VHTLCContractHandler } from '@arkade-os/sdk';

import { BoltzSwapRow, refundStrandedSends, strandedSendContracts } from '../../blue_modules/arkade-stranded-sends';
import { hexToUint8Array, uint8ArrayToHex } from '../../blue_modules/uint8array-extras/index';

// A send as @arkade-os/boltz-swap 0.3.67 stored it. The lockup addresses come
// from its own createVHTLCScript, the construction it checked every address
// Boltz returned against before saving a swap.
const SENDER = 'd862741c0e40278606fe88d6b827b84c247e8bc468c1cc31704771df3024f011';
const PAYMENT_HASH = 'db6b2ad5b901cfcdc717814793dc00a79a520abfa7f716bb74f80fa7f1cb2597';
const INVOICE =
  'lnbc200u1p54twgqpp5md4j44deq88um3chs9re8hqq57d9yz4l5lm3dwm5lq860uwtyktssp59wuq65mmrk378z7nqds64p2ks677p6kdw930aa4ztl5hhaf85fdsdqawd68yctwv3jkggrnv4hxggr5v4ehgxqrrss9qypqsqcqpf08uknwxlvtjml9c0usmjax35tz3wm5tdr8h0ua9367wcvr2uxjyseyx5awp0xwpspwqpsgj334pwctl2j3ywsnptu8fz35e9esrwf6cp558acn';
const LOCKUP = {
  currentSigner: 'ark1qzpq904am6clw3pgqwyh4p02708fy4xs0hcpwt7rwfdttuxsjamee0h5gl4adev6tev5kly4fnt5m40qgm9y7zqttxjvu80ghtz5s3s96dplmv',
  previousSigner: 'ark1qq4hfssprtcgnjzf8qlw2f78yvjau5kldfugg29k34y7j96q2w4t48u9f5ec9fd8jjpgh7trq484x625jnkwr70fuy4tawlnwrxme7c7m5jm7n',
};

const storedSend = (overrides: Record<string, unknown> = {}) => ({
  id: 'send-1',
  type: 'submarine',
  createdAt: 1767225600,
  status: 'transaction.mempool',
  request: { invoice: INVOICE, refundPublicKey: '03' + SENDER },
  response: {
    id: 'send-1',
    address: LOCKUP.currentSigner,
    expectedAmount: 20050,
    claimPublicKey: '0281a90ed37c66ce185217b0768e955bb7e335f8dcd013568787aebff7d2b2ec91',
    acceptZeroConf: true,
    timeoutBlockHeights: { refund: 1767312000, unilateralClaim: 98304, unilateralRefund: 172032, unilateralRefundWithoutReceiver: 259072 },
  },
  ...overrides,
});

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
});

describe('arkade-stranded-sends — refundStrandedSends', () => {
  const fakeWallet = (recoverable: bigint) => {
    const createContract = jest.fn(async () => ({}));
    const recoverVtxos = jest.fn(async () => 'commitment-txid');
    const wallet = {
      identity: { xOnlyPublicKey: async () => hexToUint8Array(SENDER) },
      getContractManager: async () => ({ createContract }),
      getVtxoManager: async () => ({ getRecoverableBalance: async () => ({ recoverable }), recoverVtxos }),
    };
    return { wallet: wallet as unknown as Parameters<typeof refundStrandedSends>[1], createContract, recoverVtxos };
  };
  const fakeRealm = (...swaps: { id: string; type: string }[]) =>
    ({ objects: () => swaps.map(row) }) as unknown as Parameters<typeof refundStrandedSends>[0];

  it('registers each stranded send and settles what has matured', async () => {
    const { wallet, createContract, recoverVtxos } = fakeWallet(19_000n);

    const settled = await refundStrandedSends(fakeRealm(storedSend(), storedSend({ id: 'paid', status: 'transaction.claimed' })), wallet);

    assert.strictEqual(settled, true);
    assert.strictEqual(createContract.mock.calls.length, 1, 'the paid send is left alone');
    assert.strictEqual((createContract.mock.calls[0] as any[])[0].address, LOCKUP.currentSigner);
    assert.strictEqual(recoverVtxos.mock.calls.length, 1);
  });

  it('registers but does not settle while nothing is recoverable yet', async () => {
    const { wallet, createContract, recoverVtxos } = fakeWallet(0n);

    assert.strictEqual(await refundStrandedSends(fakeRealm(storedSend()), wallet), false);
    assert.strictEqual(createContract.mock.calls.length, 1, 'registered, so the lockup is recovered once it matures');
    assert.strictEqual(recoverVtxos.mock.calls.length, 0);
  });

  it('touches nothing when there is no stranded send', async () => {
    const { wallet, createContract, recoverVtxos } = fakeWallet(19_000n);

    assert.strictEqual(await refundStrandedSends(fakeRealm(storedSend({ status: 'transaction.claimed' })), wallet), false);
    assert.strictEqual(createContract.mock.calls.length, 0);
    assert.strictEqual(recoverVtxos.mock.calls.length, 0);
  });
});
