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

  it('can decode invoice', async () => {
    const invoice =
      'lnbc20n1p59n9nkpp58s49flel3cz5u3lrve8qeqzxljxmu0gja06elfcgwrx2e9nq959ssp5z7ytwq0rm6yq8evn2kteduj6a0rs4svn3sfwvg92a29f8l022jjqxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qrzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpgdq023mk7gryv9uhxgq9qyyssqy4mv8te3l6mrc7qf4pksh4m4z76jz7s2qrwxd7q2s22ghnanqt33e9p0nahz9fr32g00vn2vhc9rrhpvtr54s40tle25tyyvp59sdpsqty30rp';

    const decoded = w.decodeInvoice(invoice);

    assert.strictEqual(decoded.num_satoshis, 2);
    assert.strictEqual(decoded.num_millisatoshis, 2000);
    assert.strictEqual(decoded.timestamp, 1750701686);
    assert.strictEqual(decoded.expiry, 2592000);
    assert.strictEqual(decoded.description, 'Two days ');
    assert.strictEqual(decoded.payment_hash, '3c2a54ff3f8e054e47e3664e0c8046fc8dbe3d12ebf59fa70870ccac96602d0b');
    assert.strictEqual(decoded.destination, '030936e7a016fb3f5ce53c8db29da2b6dfbf8e068ea058c363e0fd77f444270d8a');
    assert.strictEqual(decoded.fallback_addr, '');
    assert.strictEqual(decoded.description_hash, '');
    assert.strictEqual(decoded.cltv_expiry, '40');
    assert.strictEqual(decoded.route_hints.length, 0); // decode function does not decode this yet cause we dont need it for now
  });

  it.skip('can create invoice', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    const invoice = await w.addInvoice(100, 'test 100sat invoice');
    console.log(invoice);
  });

  it.skip('can create invoice on behalf of another wallet', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    const invoice = await w.addInvoice(100, 'test 100sat invoice', '0223c11a999b8c0724dda9b4b7043a1d34fe6ddfd96ea56dd16966322eef299a1b');
    console.log(invoice);
  });

  it.skip('can check spark receive request status', async () => {
    const requestId = 'SparkLightningReceiveRequest:0197abd5-76ee-cd96-0000-268f36f3af59';
    const status = await w.getReceiveRequestStatus(requestId);

    assert.strictEqual(status.timestamp, 1750934670);
    assert.strictEqual(status.ispaid, true);
    assert.strictEqual(status.value, 100);
    assert.strictEqual(status.memo, 'test 100sat invoice');
    assert.strictEqual(status.payment_preimage, '3ef7333813c1bef71a6518eb532343e8c5dd22ff3eb2ff71e84e8ff523b843ef');
    assert.strictEqual(status.payment_hash, 'd5153d469f2501f4eb40d81387a2e738ccc64a91e0f300a0f7c58ffeaadcdec4');
    assert.strictEqual(
      status.payment_request,
      'lnbc1u1p596fpkpp5652n635ly5qlf66qmqfc0gh88rxvvj53urespg8hck8la2kummzqsp5uhv5hhs7js2rwrmnprhyak97w5tu84l2gkuhcqcg0gz0f6t3963sxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qrzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpgdqlw3jhxapqxycrqumpwssxjmnkda5kxeg9qyyssqynnd68tcgeyt85s8prnpqcpv06yqgz9qj8pzt2gp0mg2e5us3akjkftvch43l36r2m7e396ek0kmtsc0n60sf2e6dxys2f9tw5u2spgpxj4at9',
    );
  });

  it('can sign message with identity key', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    const message = 'Hello, world!';
    const signature = await w.signMessageWithIdentityKey(message);

    const isValid = await w.validateMessageWithIdentityKey(message, signature);
    assert.ok(isValid);

    const isValid2 = await w.validateMessageWithIdentityKey('wrong message', signature);
    assert.ok(!isValid2);

    // const wGenerated = new LightningSparkWallet();
    // await wGenerated.generate();
    // const isValid3 = await wGenerated.validateMessageWithIdentityKey(message, signature);
    // console.log('isValid3=', isValid3);
    // assert.ok(isValid3);
  });

  it('can fetch txs', async () => {
    if (!process.env.HD_MNEMONIC) {
      console.error('process.env.HD_MNEMONIC not set, skipped');
      return;
    }

    // @ts-ignore forcing internal state for the test to run (this data is saved ONLY when invoice is created, we can
    // _not_ fetch it later when importing the wallet)
    w._userInvoices = {
      'receive-id-bla-bla': {
        id: '45ee49a8-2291-4dd9-8ff4-0e54c04639ed', // this is how user invoice is cross-referenced with the transfer
        payment_request:
          'lnbc1u1p598kcapp5a76m2e3qz859fvp8yz8ldf8sz3xy4e70yngnk9q4cpukqtytc6dssp5v9zqgtdsunuw3lguqtss3eu72ysv6ywqv9akg5ayfje6w8zdwkhsxq9z0rgqnp4qvyndeaqzman7h898jxm98dzkm0mlrsx36s93smrur7h0azyyuxc5rzjq25carzepgd4vqsyn44jrk85ezrpju92xyrk9apw4cdjh6yrwt5jgqqqqrt49lmtcqqqqqqqqqqq86qq9qrzjqwghf7zxvfkxq5a6sr65g0gdkv768p83mhsnt0msszapamzx2qvuxqqqqrt49lmtcqqqqqqqqqqq86qq9qcqzpgdqlw3jhxapqxycrqumpwssxjmnkda5kxeg9qyyssq5vjhw4argp4vqafcqkuc050vuwp4aag2agr0nj9m5f8r7kc4xenhuyw4kc4n6n5tldnkygmdyr2ulsny402zjcmujv036yn2k8nmkcsp8l0thu',
        memo: 'test 100sat invoice',
        value: 100,
        type: 'user_invoice',
        expire_time: 2592000,
        timestamp: 1750326116000,
        ispaid: true,
        payment_hash: 'efb5b5662011e854b027208ff6a4f0144c4ae7cf24d13b1415c079602c8bc69b',
      },
    };

    await w.fetchTransactions();
    assert.ok(w.getTransactions().length > 0);

    const tx = w.getTransactions().find(t => t.payment_hash === 'efb5b5662011e854b027208ff6a4f0144c4ae7cf24d13b1415c079602c8bc69b');
    assert.ok(tx);
    assert.strictEqual(tx.memo, 'test 100sat invoice');
    assert.strictEqual(tx.value, 100);
    assert.strictEqual(tx.type, 'user_invoice');
    assert.strictEqual(tx.expire_time, 2592000);
    assert.strictEqual(tx.timestamp, 1750326116);
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
