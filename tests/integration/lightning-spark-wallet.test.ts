import assert from 'assert';

import { HDSegwitBech32Wallet } from '../../class';
import { LightningSparkWallet } from '../../class/wallets/lightning-spark-wallet.ts';

jest.setTimeout(30_000);

afterAll(async () => {});

const w = new LightningSparkWallet();

beforeAll(async () => {
  if (!process.env.HD_MNEMONIC) {
    console.error('process.env.HD_MNEMONIC not set, skipped');
    return;
  }

  const start = +new Date();
  w.setSecret('spark://' + process.env.HD_MNEMONIC);
  await w.init();
  const end = +new Date();
  console.log('init took', (end - start) / 1000, 'seconds');
});

describe('LightningSparkWallet', () => {
  it('can generate', async () => {
    const wGenerated = new LightningSparkWallet();
    await wGenerated.generate();

    assert.ok(wGenerated.getSecret().startsWith('spark://'));

    const mnemonics = wGenerated.getSecret().replace('spark://', '');
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonics);
    assert.ok(hd.validateMnemonic());
  });

  it('can fetch balance', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    await w.fetchBalance();
    const balance = w.getBalance();
    // console.log(balance);

    assert.ok(balance > 0);
  });

  it.skip('can create invoice', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    const invoice = await w.addInvoice(100, 'test 100sat invoice');
    console.log(invoice);
  });

  it('can fetch txs', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    // @ts-ignore forcing internal state for the test to run (this data is saved ONLY when invoice is created, we can
    // _not_ fetch it later when importing the wallet)
    /* w._userInvoices = {
      '45ee49a8-2291-4dd9-8ff4-0e54c04639ed':
        'lnbc1u1p598kcapp5a76m2e3qz859fvp8yz8ldf8sz3xy4e70yngnk9q4cpukqtytc6dssp5v9zqgtdsunuw3lguqtss3eu72ysv6ywqv9akg5ayfje6w8zdwkhsxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qrzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpgdqlw3jhxapqxycrqumpwssxjmnkda5kxeg9qyyssq5vjhw4argp4vqafcqkuc050vuwp4aag2agr0nj9m5f8r7kc4xenhuyw4kc4n6n5tldnkygmdyr2ulsny402zjcmujv036yn2k8nmkcsp8l0thu',
    }; */

    await w.fetchTransactions();
    assert.ok(w.getTransactions().length > 0);

    /* const tx = w.getTransactions().find(t => t.payment_hash === 'efb5b5662011e854b027208ff6a4f0144c4ae7cf24d13b1415c079602c8bc69b');
    assert.ok(tx);
    assert.strictEqual(tx.memo, 'test 100sat invoice');
    assert.strictEqual(tx.value, 100);
    assert.strictEqual(tx.type, 'user_invoice');
    assert.strictEqual(tx.expire_time, 2592000);
    assert.strictEqual(tx.timestamp, 1750326116000); */
  });

  it.skip('can pay invoice', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    await w.payInvoice(
      'lnbc100n1p59gga9pp57xk62aehgl5y89kmppthyqhcs4lucz3kwsp43y7tkdzpc9wv4zdsdpzw3hjqun9vdjkjan9ypn8ymmdypehqctjdvcqzysxqyz5vqsp5kztfvj2w527v9flm7rnz6ayqfer3s6pfwj3cuhfty3tkgal2fazq9qxpqysgqae765vquwdpemn4v6y5uxckdj0cdn49e0x62lk7pwhrg3wl0tucq8hhcuqmj8v2sajppkq5x5trkvhw04fuj9dkew5dw827pxl8jwvqqq43397',
    );
  });
});
