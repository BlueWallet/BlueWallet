import assert from 'assert';

import { HDSegwitBech32Wallet } from '../../class';
import { LightningSparkWallet } from '../../class/wallets/lightning-spark-wallet.ts';

jest.mock('@buildonspark/spark-sdk', () => {
  const LIGHTNING_INVOICE =
    'lnbc20n1p59n9nkpp58s49flel3cz5u3lrve8qeqzxljxmu0gja06elfcgwrx2e9nq959ssp5z7ytwq0rm6yq8evn2kteduj6a0rs4svn3sfwvg92a29f8l022jjqxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qrzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpgdq023mk7gryv9uhxgq9qyyssqy4mv8te3l6mrc7qf4pksh4m4z76jz7s2qrwxd7q2s22ghnanqt33e9p0nahz9fr32g00vn2vhc9rrhpvtr54s40tle25tyyvp59sdpsqty30rp';
  const VALID_SPARK_ADDRESS = 'spark1pgss9qg3vdslzmt2name9v550skuvlu6lj5xt9sly90k7p0gxughlqv023jqmc';
  const VALID_SPARK_ADDRESS_ALT = 'spark1pgssyele0qrcjdheeq2a0zmpwdwvj3r4f4stkuju0fp36g6grapv2w7l8am2cp';
  const PAYMENT_HASH = '3c2a54ff3f8e054e47e3664e0c8046fc8dbe3d12ebf59fa70870ccac96602d0b';

  const createReceiveRequest = ({
    id,
    memo,
    status,
    createdAt,
    updatedAt,
    paymentPreimage,
    transfer,
  }: {
    id: string;
    memo: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    paymentPreimage?: string;
    transfer?: any;
  }) => ({
    id,
    createdAt,
    updatedAt,
    network: 'MAINNET',
    invoice: {
      encodedInvoice: LIGHTNING_INVOICE,
      paymentHash: PAYMENT_HASH,
      memo,
      amount: {
        originalValue: 2,
      },
      createdAt,
      expiresAt: '2026-12-31T00:00:00.000Z',
      bitcoinNetwork: 'MAINNET',
    },
    status,
    typename: 'LightningReceiveRequest',
    paymentPreimage,
    transfer,
  });

  const createMockWallet = () => {
    const receiveRequests: Record<string, any> = {
      'req-in-1': createReceiveRequest({
        id: 'req-in-1',
        memo: 'test invoice',
        status: 'LIGHTNING_PAYMENT_RECEIVED',
        createdAt: '2025-10-23T12:14:00.000Z',
        updatedAt: '2025-10-23T12:15:52.000Z',
        paymentPreimage: 'incoming-preimage',
        transfer: {
          sparkId: 'transfer-in-1',
          totalAmount: {
            originalValue: 9999,
          },
        },
      }),
    };

    let invoiceCounter = 0;

    return {
      getTransfers: jest.fn(async () => ({
        transfers: [
          {
            id: 'transfer-in-1',
            transferDirection: 'INCOMING',
            status: 'TRANSFER_STATUS_COMPLETED',
            totalValue: 9999,
            createdTime: new Date('2025-10-23T12:14:00.000Z'),
            updatedTime: new Date('2025-10-23T12:15:52.000Z'),
            userRequest: receiveRequests['req-in-1'],
          },
          {
            id: 'transfer-out-1',
            transferDirection: 'OUTGOING',
            status: 'TRANSFER_STATUS_COMPLETED',
            totalValue: 8001,
            createdTime: new Date('2025-10-23T12:20:00.000Z'),
            updatedTime: new Date('2025-10-23T12:20:45.000Z'),
            userRequest: {
              id: 'send-req-1',
              encodedInvoice: LIGHTNING_INVOICE,
              status: 'LIGHTNING_PAYMENT_SUCCEEDED',
              paymentPreimage: 'outgoing-preimage',
            },
          },
        ],
        offset: 0,
      })),
      getBalance: jest.fn(async () => ({
        balance: 12_345,
      })),
      createLightningInvoice: jest.fn(async ({ memo }: { memo: string }) => {
        invoiceCounter += 1;
        const id = `req-created-${invoiceCounter}`;

        const request = createReceiveRequest({
          id,
          memo,
          status: 'INVOICE_CREATED',
          createdAt: '2025-10-23T14:00:00.000Z',
          updatedAt: '2025-10-23T14:00:00.000Z',
        });

        receiveRequests[id] = request;
        return request;
      }),
      getLightningReceiveRequest: jest.fn(async (id: string) => receiveRequests[id] ?? null),
      transfer: jest.fn(async ({ receiverSparkAddress, amountSats }: { receiverSparkAddress: string; amountSats: number }) => ({
        id: 'spark-transfer-1',
        receiverSparkAddress,
        amountSats,
      })),
      payLightningInvoice: jest.fn(async () => ({
        paymentPreimage: 'mock-lightning-payment-preimage',
      })),
      getLightningSendRequest: jest.fn(async (id: string) => ({
        id,
        status: 'LIGHTNING_PAYMENT_SUCCEEDED',
      })),
      signMessageWithIdentityKey: jest.fn(async (message: string) => `sig:${message}`),
      validateMessageWithIdentityKey: jest.fn(async (message: string, signature: string) => signature === `sig:${message}`),
      getSparkAddress: jest.fn(async () => VALID_SPARK_ADDRESS),
      getIdentityPublicKey: jest.fn(async () => '03fbb3ebf890f1f259e49495a0f8ef4d6ded2607b9082e654e0f1ac1d8f0ac7f77'),
    };
  };

  return {
    SparkWallet: {
      initialize: jest.fn(async () => ({
        wallet: createMockWallet(),
      })),
    },
    isValidSparkAddress: jest.fn((address: string) => {
      if (address === 'spark1throw') {
        throw new Error('validation error');
      }

      return address === VALID_SPARK_ADDRESS || address === VALID_SPARK_ADDRESS_ALT;
    }),
    __fixtures: {
      LIGHTNING_INVOICE,
      VALID_SPARK_ADDRESS,
      VALID_SPARK_ADDRESS_ALT,
      PAYMENT_HASH,
    },
  };
});

const {
  __fixtures: { LIGHTNING_INVOICE, VALID_SPARK_ADDRESS, VALID_SPARK_ADDRESS_ALT, PAYMENT_HASH },
} = jest.requireMock('@buildonspark/spark-sdk') as {
  __fixtures: {
    LIGHTNING_INVOICE: string;
    VALID_SPARK_ADDRESS: string;
    VALID_SPARK_ADDRESS_ALT: string;
    PAYMENT_HASH: string;
  };
};

const EXPIRED_INVOICE =
  'lnbc6670n1p5jp0p9pp5jmyumdwfejjxzwhxh7wnckeugcwcpkqtf5t6dh2fzykjjh4hkatqdq6235x2grhdaexggrs09exzmtfvscqz3txqyyzzssp5ae74xvmlk5q6vxsxe3sqm90w2x4x0ekejt7qp9ca5zzhu83ru8hq9qxpqysgql4dexpmwacw98va6v6smww69a3w6hs5ng0573v8skyhlj7lylt8r65jm5zqaa7hzx3vlrs2fr3h0rtqjw7x94xprdwqy6rr9ff5pnxsppnpr5q';
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const createWallet = async () => {
  const wallet = new LightningSparkWallet();
  wallet.setSecret('spark://' + TEST_MNEMONIC);
  await wallet.init();
  return wallet;
};

describe('LightningSparkWallet', () => {
  it('can generate', async () => {
    const wallet = new LightningSparkWallet();
    await wallet.generate();

    assert.ok(wallet.getSecret().startsWith('spark://'));

    const mnemonics = wallet.getSecret().replace('spark://', '');
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonics);
    assert.ok(hd.validateMnemonic());
  });

  it('can fetch balance', async () => {
    const wallet = await createWallet();

    await wallet.fetchTransactions();
    assert.strictEqual(wallet.getBalance(), 1998);

    await wallet.fetchBalance();
    assert.strictEqual(wallet.getBalance(), 12345);
  });

  it('can decode invoice', async () => {
    const wallet = await createWallet();

    const decoded = wallet.decodeInvoice(LIGHTNING_INVOICE);

    assert.strictEqual(decoded.num_satoshis, 2);
    assert.strictEqual(decoded.num_millisatoshis, 2000);
    assert.strictEqual(decoded.timestamp, 1750701686);
    assert.strictEqual(decoded.expiry, 2592000);
    assert.strictEqual(decoded.description, 'Two days ');
    assert.strictEqual(decoded.payment_hash, PAYMENT_HASH);
    assert.strictEqual(decoded.destination, '030936e7a016fb3f5ce53c8db29da2b6dfbf8e068ea058c363e0fd77f444270d8a');
    assert.strictEqual(decoded.fallback_addr, '');
    assert.strictEqual(decoded.description_hash, '');
    assert.strictEqual(decoded.cltv_expiry, '40');
    assert.strictEqual(decoded.route_hints.length, 0);
  });

  it('can tell if invoice expired', async () => {
    const wallet = await createWallet();

    assert.strictEqual(wallet.isInvoiceExpired(EXPIRED_INVOICE), true);
    assert.strictEqual(wallet.isInvoiceExpired(EXPIRED_INVOICE, 1763752997), false);
  });

  it('can fetch transactions and invoices', async () => {
    const wallet = await createWallet();

    await wallet.fetchTransactions();
    await wallet.fetchUserInvoices();

    const txs = wallet.getTransactions();
    assert.ok(txs.length >= 2);

    const receiveTx = txs.find(tx => tx.value! > 0);
    assert.ok(receiveTx, 'Should have at least one receive transaction');
    assert.strictEqual(receiveTx?.memo, 'test invoice');
    assert.strictEqual(receiveTx?.value, 9999);
    assert.strictEqual(receiveTx?.ispaid, true);
    assert.strictEqual(receiveTx?.payment_preimage, 'incoming-preimage');
    assert.ok(receiveTx?.payment_hash);
    assert.ok(receiveTx?.payment_request);

    const sendTx = txs.find(tx => tx.value! < 0);
    assert.ok(sendTx, 'Should have at least one send transaction');
    assert.strictEqual(sendTx?.value, -8001);
    assert.strictEqual(sendTx?.ispaid, true);
    assert.strictEqual(sendTx?.payment_preimage, 'outgoing-preimage');
    assert.ok(sendTx?.payment_hash);
    assert.ok(sendTx?.payment_request);

    assert.ok(wallet.isInvoiceGeneratedByWallet(receiveTx!.payment_request!));
    assert.ok(
      !wallet.isInvoiceGeneratedByWallet(
        'lnbc80u1p5052hwpp5z4ln6hyq4wcck809pt7f0q54ag5he6ce797flm7gl9vuccm9lx2sdqqcqzysxqyz5vqsp5nh9fl4g36606tvxswtnfxzy55yze2656cw2fya7dhl8r6u0czyds9qxpqysgq83sw25g9d9ltr05nkfzejnvvunzkrk4qeuxhszuvvsguk5m6vmg3a7n5nd67l9frru3kjzpt8x6jfusjyc7ezh49jeeh900kt3v30qsqzq7fst',
      ),
    );
  });

  it('can create invoice', async () => {
    const wallet = await createWallet();

    const invoice = await wallet.addInvoice(2, 'spark test invoice');
    assert.strictEqual(invoice, LIGHTNING_INVOICE);
    assert.ok(wallet.isInvoiceGeneratedByWallet(invoice));

    const invoices = await wallet.getUserInvoices();
    const createdInvoice = invoices.find(tx => tx.memo === 'spark test invoice');
    assert.ok(createdInvoice);
    assert.strictEqual(createdInvoice?.ispaid, false);
    assert.strictEqual(createdInvoice?.value, 2);
  });

  it('can pay lightning invoice', async () => {
    const wallet = await createWallet();

    await wallet.payInvoice(LIGHTNING_INVOICE);

    assert.strictEqual(wallet.last_paid_invoice_result?.payment_hash, PAYMENT_HASH);
    assert.strictEqual(wallet.last_paid_invoice_result?.payment_preimage, 'mock-lightning-payment-preimage');
  });

  it('can pay spark address with explicit amount', async () => {
    const wallet = await createWallet();

    await wallet.payInvoice(VALID_SPARK_ADDRESS, 21);

    assert.strictEqual(wallet.last_paid_invoice_result?.response?.id, 'spark-transfer-1');
  });

  it('can validate spark native address', async () => {
    const wallet = new LightningSparkWallet();

    assert.ok(wallet.isAddressValid(VALID_SPARK_ADDRESS));
    assert.ok(wallet.isAddressValid(` ${VALID_SPARK_ADDRESS_ALT} `));

    assert.ok(!wallet.isAddressValid('spark1throw'));
    assert.ok(!wallet.isAddressValid(VALID_SPARK_ADDRESS.slice(0, -1)));
    assert.ok(!wallet.isAddressValid('test'));
  });
});
