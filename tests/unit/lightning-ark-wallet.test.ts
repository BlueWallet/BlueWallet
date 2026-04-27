import assert from 'assert';

import '../../class';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet.ts';

const invoice =
  'lnbc20n1p59n9nkpp58s49flel3cz5u3lrve8qeqzxljxmu0gja06elfcgwrx2e9nq959ssp5z7ytwq0rm6yq8evn2kteduj6a0rs4svn3sfwvg92a29f8l022jjqxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qrzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpgdq023mk7gryv9uhxgq9qyyssqy4mv8te3l6mrc7qf4pksh4m4z76jz7s2qrwxd7q2s22ghnanqt33e9p0nahz9fr32g00vn2vhc9rrhpvtr54s40tle25tyyvp59sdpsqty30rp';

function createWallet(): any {
  const wallet: any = new LightningArkWallet();

  wallet._boardingUtxos = [];
  wallet._swapHistory = [];
  wallet._transactionsHistory = [];

  return wallet;
}

describe('LightningArkWallet transaction history', () => {
  it('deduplicates settled incoming Lightning swaps against Ark receive history', () => {
    const wallet = createWallet();

    wallet._swapHistory = [
      {
        id: 'reverse-1',
        type: 'reverse',
        createdAt: 1761224952,
        preimage: 'receive-preimage',
        status: 'invoice.settled',
        request: {
          claimPublicKey: 'claim-public-key',
          invoiceAmount: 1000,
          preimageHash: 'receive-hash',
          description: 'test invoice',
        },
        response: {
          id: 'reverse-1',
          invoice,
          onchainAmount: 999,
          lockupAddress: 'ark1qreceive',
          refundPublicKey: 'refund-public-key',
          timeoutBlockHeights: {},
        },
      },
    ];

    wallet._transactionsHistory = [
      {
        key: {
          boardingTxid: '',
          commitmentTxid: 'receive-commitment',
          arkTxid: 'receive-ark-tx',
        },
        type: 'RECEIVED',
        amount: 999,
        settled: false,
        createdAt: 1761224952000,
      },
    ];

    const txs = wallet.getTransactions();

    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'user_invoice');
    assert.strictEqual(txs[0].value, 999);
    assert.strictEqual(txs[0].ispaid, true);
  });

  it('deduplicates paid outgoing Lightning swaps against Ark send history', () => {
    const wallet = createWallet();

    wallet._swapHistory = [
      {
        id: 'submarine-1',
        type: 'submarine',
        createdAt: 1761225645,
        preimage: 'send-preimage',
        preimageHash: 'send-hash',
        status: 'transaction.claimed',
        request: {
          invoice,
          refundPublicKey: 'refund-public-key',
        },
        response: {
          id: 'submarine-1',
          address: 'ark1qsend',
          expectedAmount: 1003,
          claimPublicKey: 'claim-public-key',
          acceptZeroConf: true,
          timeoutBlockHeights: {},
        },
      },
    ];

    wallet._transactionsHistory = [
      {
        key: {
          boardingTxid: '',
          commitmentTxid: 'send-commitment',
          arkTxid: 'send-ark-tx',
        },
        type: 'SENT',
        amount: 1003,
        settled: true,
        createdAt: 1761225645000,
      },
    ];

    const txs = wallet.getTransactions();

    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'paid_invoice');
    assert.strictEqual(txs[0].value, -1003);
    assert.strictEqual(txs[0].ispaid, true);
  });
});

describe('LightningArkWallet balance', () => {
  it('includes subdust change in the displayed balance', async () => {
    const wallet = createWallet();

    wallet._wallet = {
      getAddress: async () => 'ark1qwallet',
      dustAmount: 330n,
      arkAddress: {
        subdustPkScript: Uint8Array.from([1, 2, 3]),
      },
      getVtxos: async () => [],
      walletRepository: {
        getVtxos: async (address: string) => {
          assert.strictEqual(address, 'ark1qwallet');
          return [
            {
              txid: 'subdust-change',
              vout: 1,
              value: 197,
              isSpent: false,
              virtualStatus: {
                state: 'preconfirmed',
              },
            },
          ];
        },
        saveVtxos: async () => {},
      },
      indexerProvider: {
        getVtxos: async ({ scripts }: { scripts: string[] }) => {
          assert.deepStrictEqual(scripts, ['010203']);
          return { vtxos: [] };
        },
      },
    };
    wallet._attemptBoardUtxos = async () => {};

    await wallet.fetchBalance();

    assert.strictEqual(wallet.getBalance(), 197);
  });

  it('does not double count subdust coins already returned by the main VTXO query', async () => {
    const wallet = createWallet();

    const subdustVtxo = {
      txid: 'subdust-change',
      vout: 1,
      value: 197,
      isSpent: false,
      virtualStatus: {
        state: 'preconfirmed',
      },
    };

    wallet._wallet = {
      getAddress: async () => 'ark1qwallet',
      dustAmount: 330n,
      arkAddress: {
        subdustPkScript: Uint8Array.from([1, 2, 3]),
      },
      getVtxos: async () => [subdustVtxo],
      walletRepository: {
        getVtxos: async () => [subdustVtxo],
        saveVtxos: async () => {},
      },
      indexerProvider: {
        getVtxos: async () => ({
          vtxos: [subdustVtxo],
        }),
      },
    };
    wallet._attemptBoardUtxos = async () => {};

    await wallet.fetchBalance();

    assert.strictEqual(wallet.getBalance(), 197);
  });

  it('recovers hidden settled subdust change from transaction history', async () => {
    const wallet = createWallet();
    const savedVtxos: any[] = [];

    wallet._swapHistory = [
      {
        id: 'reverse-1',
        type: 'reverse',
        createdAt: 1761224952,
        preimage: 'receive-preimage',
        status: 'invoice.settled',
        request: {
          claimPublicKey: 'claim-public-key',
          invoiceAmount: 1200,
          preimageHash: 'receive-hash',
          description: 'test invoice',
        },
        response: {
          id: 'reverse-1',
          invoice,
          onchainAmount: 1200,
          lockupAddress: 'ark1qreceive',
          refundPublicKey: 'refund-public-key',
          timeoutBlockHeights: {},
        },
      },
    ];

    wallet._transactionsHistory = [
      {
        key: {
          boardingTxid: '',
          commitmentTxid: '',
          arkTxid: 'send-ark-tx',
        },
        type: 'SENT',
        amount: 1003,
        settled: true,
        createdAt: 1761225645000,
      },
      {
        key: {
          boardingTxid: '',
          commitmentTxid: '',
          arkTxid: 'topup-ark-tx',
        },
        type: 'RECEIVED',
        amount: 330,
        settled: true,
        createdAt: 1761225700000,
      },
    ];

    wallet._wallet = {
      getAddress: async () => 'ark1qwallet',
      dustAmount: 330n,
      arkAddress: {
        subdustPkScript: Uint8Array.from([1, 2, 3]),
      },
      offchainTapscript: {
        forfeit: () => ({ cb: 'cb', s: 's' }),
        encode: () => 'tapTree',
      },
      getVtxos: async () => [
        {
          txid: 'topup-ark-tx',
          vout: 0,
          value: 330,
          isSpent: false,
          virtualStatus: {
            state: 'settled',
          },
        },
      ],
      walletRepository: {
        getVtxos: async () => [],
        saveVtxos: async (_address: string, vtxos: any[]) => {
          savedVtxos.push(...vtxos);
        },
      },
      indexerProvider: {
        getVtxos: async () => ({ vtxos: [] }),
      },
    };
    wallet._attemptBoardUtxos = async () => {};

    await wallet.fetchBalance();

    assert.strictEqual(wallet.getBalance(), 527);
    assert.strictEqual(savedVtxos.length, 1);
    assert.strictEqual(savedVtxos[0].txid, 'send-ark-tx');
    assert.strictEqual(savedVtxos[0].vout, 1);
    assert.strictEqual(savedVtxos[0].value, 197);
  });

  it('falls back to the transaction-derived balance when the visible balance is zero', async () => {
    const wallet = createWallet();

    wallet._swapHistory = [
      {
        id: 'reverse-1',
        type: 'reverse',
        createdAt: 1761224952,
        preimage: 'receive-preimage',
        status: 'invoice.settled',
        request: {
          claimPublicKey: 'claim-public-key',
          invoiceAmount: 1200,
          preimageHash: 'receive-hash',
          description: 'test invoice',
        },
        response: {
          id: 'reverse-1',
          invoice,
          onchainAmount: 1200,
          lockupAddress: 'ark1qreceive',
          refundPublicKey: 'refund-public-key',
          timeoutBlockHeights: {},
        },
      },
    ];

    wallet._transactionsHistory = [
      {
        key: {
          boardingTxid: '',
          commitmentTxid: '',
          arkTxid: 'send-ark-tx',
        },
        type: 'SENT',
        amount: 1003,
        settled: true,
        createdAt: 1761225645000,
      },
      {
        key: {
          boardingTxid: '',
          commitmentTxid: '',
          arkTxid: 'topup-ark-tx',
        },
        type: 'RECEIVED',
        amount: 330,
        settled: true,
        createdAt: 1761225700000,
      },
    ];

    wallet._wallet = {
      getAddress: async () => 'ark1qwallet',
      dustAmount: 330n,
      arkAddress: {
        subdustPkScript: Uint8Array.from([1, 2, 3]),
      },
      getVtxos: async () => [],
      walletRepository: {
        getVtxos: async () => [],
        saveVtxos: async () => {},
      },
      indexerProvider: {
        getVtxos: async () => ({ vtxos: [] }),
      },
    };
    wallet._attemptBoardUtxos = async () => {};

    await wallet.fetchBalance();

    assert.strictEqual(wallet.getBalance(), 527);
  });
});
