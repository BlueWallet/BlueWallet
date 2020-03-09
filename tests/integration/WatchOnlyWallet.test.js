/* global it, describe, jasmine, afterAll, beforeAll  */
import { WatchOnlyWallet } from '../../class';
let assert = require('assert');
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
let BlueElectrum = require('../../BlueElectrum'); // so it connects ASAP

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
  return new Promise(resolve => setTimeout(resolve, 10000)); // simple sleep to wait for all timeouts termination
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 500 * 1000;

describe('Watch only wallet', () => {
  it('can fetch balance', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    await w.fetchBalance();
    assert.ok(w.getBalance() > 16);
  });

  it('can fetch tx', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('167zK5iZrs1U6piDqubD3FjRqUTM2CZnb8');
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length >= 215);
    // should be 233 but electrum server cant return huge transactions >.<

    w = new WatchOnlyWallet();
    w.setSecret('1BiJW1jyUaxcJp2JWwbPLPzB1toPNWTFJV');
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);

    // fetch again and make sure no duplicates
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);
  });

  it('can fetch TXs with values', async () => {
    let w = new WatchOnlyWallet();
    for (let sec of [
      'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
      'BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
      'bitcoin:bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
      'BITCOIN:BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
    ]) {
      w.setSecret(sec);
      assert.strictEqual(w.getAddress(), 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
      assert.strictEqual(await w.getAddressAsync(), 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
      assert.ok(w.weOwnAddress('bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv'));
      await w.fetchTransactions();

      for (let tx of w.getTransactions()) {
        assert.ok(tx.hash);
        assert.ok(tx.value);
        assert.ok(tx.received);
        assert.ok(tx.confirmations > 1);
      }

      assert.strictEqual(w.getTransactions()[0].value, -892111);
      assert.strictEqual(w.getTransactions()[1].value, 892111);
    }
  });

  it('can fetch complex TXs', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
    await w.fetchTransactions();
    for (let tx of w.getTransactions()) {
      assert.ok(tx.value, 'incorrect tx.value');
    }
  });

  it('can validate address', async () => {
    let w = new WatchOnlyWallet();
    for (let secret of [
      'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
      '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG',
      '3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2',
      'BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
    ]) {
      w.setSecret(secret);
      assert.ok(w.valid());
      assert.strictEqual(w.isHd(), false);
    }

    w.setSecret('not valid');
    assert.ok(!w.valid());

    for (let secret of [
      'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps',
      'ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXrYjjXEzcPDX5VqnHEnuNf5VAXgLfSaytMkJ2rwVqy',
      'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP',
    ]) {
      w.setSecret(secret);
      assert.ok(w.valid());
      assert.strictEqual(w.isHd(), true);
      assert.strictEqual(w.getMasterFingerprint(), false);
      assert.strictEqual(w.getMasterFingerprintHex(), '00000000');
    }
  });

  it('can fetch balance & transactions from zpub HD', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 200000);
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 4);
    assert.ok((await w.getAddressAsync()).startsWith('bc1'));
  });

  it('can create PSBT base64 without signature for HW wallet', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('zpub6rjLjQVqVnj7crz9E4QWj4WgczmEseJq22u2B6k2HZr6NE2PQx3ZYg8BnbjN9kCfHymSeMd2EpwpM5iiz5Nrb3TzvddxW2RMcE3VXdVaXHk');
    // zpub provided by Stepan @ CryptoAdvance
    w.init();
    const changeAddress = 'bc1quuafy8htjjj263cvpj7md84magzmc8svmh8lrm';
    // hardcoding so we wont have to call w.getChangeAddressAsync()
    const utxos = [
      {
        height: 596736,
        value: 20000,
        address: 'bc1qhu8jqyzfazgatpctqn44xr7pdd3mdx6qy2r6xa',
        txId: '7f3b9e032a84413d7a5027b0d020f8acf80ad28f68b5bce8fa8ac357248c5b80',
        vout: 0,
      },
    ];
    // hardcoding utxo so we wont have to call w.fetchUtxo() and w.getUtxo()

    let { psbt } = await w.createTransaction(
      utxos,
      [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 5000 }],
      1,
      changeAddress,
    );

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAHECAAAAAYBbjCRXw4r66Ly1aI/SCvis+CDQsCdQej1BhCoDnjt/AAAAAAAAAACAAogTAAAAAAAAFgAUwM681sPTyox13F7GLr5VMw75EOK3OQAAAAAAABYAFOc6kh7rlKStRwwMvbaeu+oFvB4MAAAAAAABAR8gTgAAAAAAABYAFL8PIBBJ6JHVhwsE61MPwWtjtptAIgYDWOHbOE3D4KiuoR7kHtmTtFZ7KXQB+8zb51QALLJxTx8YAAAAAFQAAIAAAACAAAAAgAAAAAAAAAAAAAAiAgM005BVD8MgH5kiSGnwXSfzaxLeDSl3y17Vhrx3F/9XxBgAAAAAVAAAgAAAAIAAAACAAQAAAAAAAAAA',
    );
  });

  it('can import coldcard/electrum compatible JSON skeleton wallet, and create a tx with master fingerprint', async () => {
    const skeleton =
      '{"keystore": {"ckcc_xpub": "xpub661MyMwAqRbcGmUDQVKxmhEESB5xTk8hbsdTSV3Pmhm3HE9Fj3s45R9Y8LwyaQWjXXPytZjuhTKSyCBPeNrB1VVWQq1HCvjbEZ27k44oNmg", "xpub": "zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx", "label": "Coldcard Import 168DD603", "ckcc_xfp": 64392470, "type": "hardware", "hw_type": "coldcard", "derivation": "m/84\'/0\'/0\'"}, "wallet_type": "standard", "use_encryption": false, "seed_version": 17}';
    let w = new WatchOnlyWallet();
    w.setSecret(skeleton);
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx',
    );
    assert.strictEqual(w.getMasterFingerprint(), 64392470);
    assert.strictEqual(w.getMasterFingerprintHex(), '168dd603');

    const utxos = [
      {
        height: 618811,
        value: 66600,
        address: 'bc1qzqjwye4musmz56cg44ttnchj49zueh9yr0qsxt',
        txId: '5df595dc09ee7a5c245b34ea519288137ffee731629c4ff322a6de4f72c06222',
        vout: 0,
        txid: '5df595dc09ee7a5c245b34ea519288137ffee731629c4ff322a6de4f72c06222',
        amount: 66600,
        wif: false,
        confirmations: 1,
      },
    ];

    let { psbt } = await w.createTransaction(
      utxos,
      [{ address: 'bc1qdamevhw3zwm0ajsmyh39x8ygf0jr0syadmzepn', value: 5000 }],
      22,
      'bc1qtutssamysdkgd87df0afjct0mztx56qpze7wqe',
    );
    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAHECAAAAASJiwHJP3qYi80+cYjHn/n8TiJJR6jRbJFx67gnclfVdAAAAAAAAAACAAogTAAAAAAAAFgAUb3eWXdETtv7KGyXiUxyIS+Q3wJ1K3QAAAAAAABYAFF8XCHdkg2yGn81L+plhb9iWamgBAAAAAAABAR8oBAEAAAAAABYAFBAk4ma75DYqawitVrni8qlFzNykIgYDNK9TxoCjQ8P0+qI2Hu4hrnXnJuYAC3h2puZbgRORp+sYFo3WA1QAAIAAAACAAAAAgAAAAAAAAAAAAAAiAgL1DWeV+AfIP5RRB5zHv5vuXsIt8+rF9rrsji3FhQlhzBgWjdYDVAAAgAAAAIAAAACAAQAAAAAAAAAA',
    );
  });

  it('can combine signed PSBT and prepare it for broadcast', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('zpub6rjLjQVqVnj7crz9E4QWj4WgczmEseJq22u2B6k2HZr6NE2PQx3ZYg8BnbjN9kCfHymSeMd2EpwpM5iiz5Nrb3TzvddxW2RMcE3VXdVaXHk');
    w.init();
    const signedPsbt =
      'cHNidP8BAHECAAAAAYBbjCRXw4r66Ly1aI/SCvis+CDQsCdQej1BhCoDnjt/AAAAAAAAAACAAogTAAAAAAAAFgAUwM681sPTyox13F7GLr5VMw75EOK3OQAAAAAAABYAFOc6kh7rlKStRwwMvbaeu+oFvB4MAAAAAAAiAgNY4ds4TcPgqK6hHuQe2ZO0VnspdAH7zNvnVAAssnFPH0cwRAIgPR9zZzNTnfPqZJifyUwdM2cWW8PZqCnSCsfCePlZ2aoCIFbhr/5P/bS6eGQZtX3+6q+nUO6KaSKYgaaZrUZENF6BAQAAAA==';
    const unsignedPsbt =
      'cHNidP8BAHECAAAAAYBbjCRXw4r66Ly1aI/SCvis+CDQsCdQej1BhCoDnjt/AAAAAAAAAACAAogTAAAAAAAAFgAUwM681sPTyox13F7GLr5VMw75EOK3OQAAAAAAABYAFOc6kh7rlKStRwwMvbaeu+oFvB4MAAAAAAABAR8gTgAAAAAAABYAFL8PIBBJ6JHVhwsE61MPwWtjtptAIgYDWOHbOE3D4KiuoR7kHtmTtFZ7KXQB+8zb51QALLJxTx8YAAAAAFQAAIAAAACAAAAAgAAAAAAAAAAAAAAiAgM005BVD8MgH5kiSGnwXSfzaxLeDSl3y17Vhrx3F/9XxBgAAAAAVAAAgAAAAIAAAACAAQAAAAAAAAAA';

    const Tx = w.combinePsbt(unsignedPsbt, signedPsbt);

    assert.strictEqual(
      Tx.toHex(),
      '02000000000101805b8c2457c38afae8bcb5688fd20af8acf820d0b027507a3d41842a039e3b7f000000000000000080028813000000000000160014c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2b739000000000000160014e73a921eeb94a4ad470c0cbdb69ebbea05bc1e0c0247304402203d1f736733539df3ea64989fc94c1d3367165bc3d9a829d20ac7c278f959d9aa022056e1affe4ffdb4ba786419b57dfeeaafa750ee8a69229881a699ad4644345e8101210358e1db384dc3e0a8aea11ee41ed993b4567b297401fbccdbe754002cb2714f1f00000000',
    );
  });

  it('can fetch balance & transactions from ypub HD', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('ypub6Y9u3QCRC1HkZv3stNxcQVwmw7vC7KX5Ldz38En5P88RQbesP2oy16hNyQocVCfYRQPxdHcd3pmu9AFhLv7NdChWmw5iNLryZ2U6EEHdnfo');
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 51432);
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 107);
    assert.ok((await w.getAddressAsync()).startsWith('3'));
  });

  it('can fetch balance & transactions from xpub HD', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps');
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 0);
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 4);
    assert.ok((await w.getAddressAsync()).startsWith('1'));
  });

  it('can fetch large HD', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('ypub6WnnYxkQCGeowv4BXq9Y9PHaXgHMJg9TkFaDJkunhcTAfbDw8z3LvV9kFNHGjeVaEoGdsSJgaMWpUBvYvpYGMJd43gTK5opecVVkvLwKttx');
    await w.fetchBalance();

    await w.fetchTransactions();
    assert.ok(w.getTransactions().length >= 167);
  });
});
