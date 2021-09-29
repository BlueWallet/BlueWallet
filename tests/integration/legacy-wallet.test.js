import assert from 'assert';

import { LegacyWallet, SegwitP2SHWallet, SegwitBech32Wallet } from '../../class';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

describe('LegacyWallet', function () {
  it('can serialize and unserialize correctly', () => {
    const a = new LegacyWallet();
    a.setLabel('my1');
    const key = JSON.stringify(a);

    const b = LegacyWallet.fromJson(key);
    assert.strictEqual(b.type, LegacyWallet.type);
    assert.strictEqual(key, JSON.stringify(b));
  });

  it('can validate addresses', () => {
    const w = new LegacyWallet();
    assert.ok(w.isAddressValid('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG'));
    assert.ok(!w.isAddressValid('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2j'));
    assert.ok(w.isAddressValid('3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2'));
    assert.ok(!w.isAddressValid('3BDsBDxDimYgNZzsqszNZobqQq3yeUo'));
    assert.ok(!w.isAddressValid('12345'));
    assert.ok(w.isAddressValid('bc1quuafy8htjjj263cvpj7md84magzmc8svmh8lrm'));
    assert.ok(w.isAddressValid('BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7'));
  });

  it('can fetch balance', async () => {
    const w = new LegacyWallet();
    w._address = '115fUy41sZkAG14CmdP1VbEKcNRZJWkUWG'; // hack internals
    assert.ok(w.weOwnAddress('115fUy41sZkAG14CmdP1VbEKcNRZJWkUWG'));
    assert.ok(!w.weOwnAddress('aaa'));
    assert.ok(!w.weOwnAddress(false));
    assert.ok(w.getBalance() === 0);
    assert.ok(w.getUnconfirmedBalance() === 0);
    assert.ok(w._lastBalanceFetch === 0);
    await w.fetchBalance();
    assert.ok(w.getBalance() === 18262000);
    assert.ok(w.getUnconfirmedBalance() === 0);
    assert.ok(w._lastBalanceFetch > 0);
  });

  it('can fetch TXs and derive UTXO from them', async () => {
    const w = new LegacyWallet();
    w._address = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 1);

    for (const tx of w.getTransactions()) {
      assert.ok(tx.hash);
      assert.ok(tx.value);
      assert.ok(tx.received);
      assert.ok(tx.confirmations > 1);
    }

    assert.ok(w.weOwnTransaction('b2ac59bc282083498d1e87805d89bef9d3f3bc216c1d2c4dfaa2e2911b547100'));
    assert.ok(!w.weOwnTransaction('825c12f277d1f84911ac15ad1f41a3de28e9d906868a930b0a7bca61b17c8881'));

    assert.strictEqual(w.getUtxo().length, 1);

    for (const tx of w.getUtxo()) {
      assert.strictEqual(tx.txid, 'b2ac59bc282083498d1e87805d89bef9d3f3bc216c1d2c4dfaa2e2911b547100');
      assert.strictEqual(tx.vout, 0);
      assert.strictEqual(tx.address, '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK');
      assert.strictEqual(tx.value, 51432);
      assert.strictEqual(tx.value, tx.amount);
      assert.ok(tx.confirmations > 0);
    }
  });

  it.each([
    // Transaction with missing address output https://www.blockchain.com/btc/tx/d45818ae11a584357f7b74da26012d2becf4ef064db015a45bdfcd9cb438929d
    ['addresses for vout missing', '1PVfrmbn1vSMoFZB2Ga7nDuXLFDyJZHrHK'],
    // ['txdatas were coming back null from BlueElectrum because of high batchsize', '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo'],
    // skipped because its slow and flaky if being run in pack with other electrum tests. uncomment and run single
    // if you need to debug huge electrum batches
  ])(
    'can fetch TXs when %s',
    async (useCase, address) => {
      const w = new LegacyWallet();
      w._address = address;
      await w.fetchTransactions();

      assert.ok(w.getTransactions().length > 0);
      for (const tx of w.getTransactions()) {
        assert.ok(tx.hash);
        assert.ok(tx.value);
        assert.ok(tx.received);
        assert.ok(tx.confirmations > 1);
      }
    },
    240000,
  );

  it('can fetch UTXO', async () => {
    const w = new LegacyWallet();
    w._address = '12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX';
    await w.fetchUtxo();
    assert.ok(w.utxo.length > 0, 'unexpected empty UTXO');
    assert.ok(w.getUtxo().length > 0, 'unexpected empty UTXO');

    assert.ok(w.getUtxo()[0].value);
    assert.ok(w.getUtxo()[0].vout === 1, JSON.stringify(w.getUtxo()[0]));
    assert.ok(w.getUtxo()[0].txid);
    assert.ok(w.getUtxo()[0].confirmations);
  });
});

describe('SegwitP2SHWallet', function () {
  it('can generate segwit P2SH address from WIF', async () => {
    const l = new SegwitP2SHWallet();
    l.setSecret('Kxr9tQED9H44gCmp6HAdmemAzU3n84H3dGkuWTKvE23JgHMW8gct');
    assert.ok(l.getAddress() === '34AgLJhwXrvmkZS1o5TrcdeevMt22Nar53', 'expected ' + l.getAddress());
    assert.ok(l.getAddress() === (await l.getAddressAsync()));
    assert.ok(l.weOwnAddress('34AgLJhwXrvmkZS1o5TrcdeevMt22Nar53'));
    assert.ok(!l.weOwnAddress('garbage'));
    assert.ok(!l.weOwnAddress(false));
  });
});

describe('SegwitBech32Wallet', function () {
  it('can fetch balance', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl';
    assert.ok(w.weOwnAddress('bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl'));
    assert.ok(w.weOwnAddress('BC1Q063CTU6JHE5K4V8KA99QAC8RCM2TZJJNUKTYRL'));
    assert.ok(!w.weOwnAddress('garbage'));
    assert.ok(!w.weOwnAddress(false));
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 69909);
  });

  it('can fetch UTXO', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'bc1q063ctu6jhe5k4v8ka99qac8rcm2tzjjnuktyrl';
    await w.fetchUtxo();
    const l1 = w.getUtxo().length;
    assert.ok(w.getUtxo().length > 0, 'unexpected empty UTXO');

    assert.ok(w.getUtxo()[0].value);
    assert.ok(w.getUtxo()[0].vout === 0);
    assert.ok(w.getUtxo()[0].txid);
    assert.ok(w.getUtxo()[0].confirmations, JSON.stringify(w.getUtxo()[0], null, 2));
    // double fetch shouldnt duplicate UTXOs:
    await w.fetchUtxo();
    const l2 = w.getUtxo().length;
    assert.strictEqual(l1, l2);
  });

  it('can fetch TXs', async () => {
    const w = new LegacyWallet();
    w._address = 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv';
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);

    for (const tx of w.getTransactions()) {
      assert.ok(tx.hash);
      assert.ok(tx.value);
      assert.ok(tx.received);
      assert.ok(tx.confirmations > 1);
    }

    assert.strictEqual(w.getTransactions()[0].value, -892111);
    assert.strictEqual(w.getTransactions()[1].value, 892111);
  });

  it('can fetch TXs', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'bc1qn887fmetaytw4vj68vsh529ft408q8j9x3dndc';
    assert.ok(w.weOwnAddress('bc1qn887fmetaytw4vj68vsh529ft408q8j9x3dndc'));
    assert.ok(w.weOwnAddress('BC1QN887FMETAYTW4VJ68VSH529FT408Q8J9X3DNDC'));
    assert.ok(!w.weOwnAddress('garbage'));
    assert.ok(!w.weOwnAddress(false));
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);
    const tx = w.getTransactions()[1];
    assert.ok(tx.hash);
    assert.strictEqual(tx.value, 100000);
    assert.ok(tx.received);
    assert.ok(tx.confirmations > 1);

    const tx0 = w.getTransactions()[0];
    assert.ok(tx0.inputs);
    assert.ok(tx0.inputs.length === 1);
    assert.ok(tx0.outputs);
    assert.ok(tx0.outputs.length === 2);

    assert.ok(w.weOwnTransaction('49944e90fe917952e36b1967cdbc1139e60c89b4800b91258bf2345a77a8b888'));
    assert.ok(!w.weOwnTransaction('825c12f277d1f84911ac15ad1f41a3de28e9d906868a930b0a7bca61b17c8881'));
  });
});
