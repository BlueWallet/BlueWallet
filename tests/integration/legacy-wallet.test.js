import { LegacyWallet, SegwitP2SHWallet, SegwitBech32Wallet } from '../../class';
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
global.tls = require('tls'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../blue_modules/BlueElectrum'); // so it connects ASAP

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});

describe('LegacyWallet', function () {
  it('can serialize and unserialize correctly', () => {
    const a = new LegacyWallet();
    a.setLabel('my1');
    const key = JSON.stringify(a);

    const b = LegacyWallet.fromJson(key);
    expect(b.type).toBe(LegacyWallet.type);
    expect(key).toBe(JSON.stringify(b));
  });

  it('can validate addresses', () => {
    const w = new LegacyWallet();
    expect(w.isAddressValid('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG')).toBeTruthy();
    expect(!w.isAddressValid('12eQ9m4sgAwTSQoNXkRABKhCXCsjm2j')).toBeTruthy();
    expect(w.isAddressValid('3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2')).toBeTruthy();
    expect(!w.isAddressValid('3BDsBDxDimYgNZzsqszNZobqQq3yeUo')).toBeTruthy();
    expect(!w.isAddressValid('12345')).toBeTruthy();
    expect(w.isAddressValid('bc1quuafy8htjjj263cvpj7md84magzmc8svmh8lrm')).toBeTruthy();
    expect(w.isAddressValid('BC1QH6TF004TY7Z7UN2V5NTU4MKF630545GVHS45U7')).toBeTruthy();
  });

  it('can fetch balance', async () => {
    const w = new LegacyWallet();
    w._address = '115fUy41sZkAG14CmdP1VbEKcNRZJWkUWG'; // hack internals
    expect(w.weOwnAddress('115fUy41sZkAG14CmdP1VbEKcNRZJWkUWG')).toBeTruthy();
    expect(!w.weOwnAddress('aaa')).toBeTruthy();
    expect(!w.weOwnAddress(false)).toBeTruthy();
    expect(w.getBalance() === 0).toBeTruthy();
    expect(w.getUnconfirmedBalance() === 0).toBeTruthy();
    expect(w._lastBalanceFetch === 0).toBeTruthy();
    await w.fetchBalance();
    expect(w.getBalance() === 18262000).toBeTruthy();
    expect(w.getUnconfirmedBalance() === 0).toBeTruthy();
    expect(w._lastBalanceFetch > 0).toBeTruthy();
  });

  it('can fetch TXs and derive UTXO from them', async () => {
    const w = new LegacyWallet();
    w._address = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
    await w.fetchTransactions();
    expect(w.getTransactions().length).toBe(1);

    for (const tx of w.getTransactions()) {
      expect(tx.hash).toBeTruthy();
      expect(tx.value).toBeTruthy();
      expect(tx.received).toBeTruthy();
      expect(tx.confirmations > 1).toBeTruthy();
    }

    expect(w.weOwnTransaction('b2ac59bc282083498d1e87805d89bef9d3f3bc216c1d2c4dfaa2e2911b547100')).toBeTruthy();
    expect(!w.weOwnTransaction('825c12f277d1f84911ac15ad1f41a3de28e9d906868a930b0a7bca61b17c8881')).toBeTruthy();

    expect(w.getUtxo().length).toBe(1);

    for (const tx of w.getUtxo()) {
      expect(tx.txid).toBe('b2ac59bc282083498d1e87805d89bef9d3f3bc216c1d2c4dfaa2e2911b547100');
      expect(tx.vout).toBe(0);
      expect(tx.address).toBe('3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK');
      expect(tx.value).toBe(51432);
      expect(tx.value).toBe(tx.amount);
      expect(tx.confirmations > 0).toBeTruthy();
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

      expect(w.getTransactions().length > 0).toBeTruthy();
      for (const tx of w.getTransactions()) {
        expect(tx.hash).toBeTruthy();
        expect(tx.value).toBeTruthy();
        expect(tx.received).toBeTruthy();
        expect(tx.confirmations > 1).toBeTruthy();
      }
    },
    240000,
  );

  it('can fetch UTXO', async () => {
    const w = new LegacyWallet();
    w._address = '12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX';
    await w.fetchUtxo();
    expect(w.utxo.length > 0).toBeTruthy();
    expect(w.getUtxo().length > 0).toBeTruthy();

    expect(w.getUtxo()[0].value).toBeTruthy();
    expect(w.getUtxo()[0].vout === 1).toBeTruthy();
    expect(w.getUtxo()[0].txid).toBeTruthy();
    expect(w.getUtxo()[0].confirmations).toBeTruthy();
  });
});

describe('SegwitP2SHWallet', function () {
  it('can generate segwit P2SH address from WIF', async () => {
    const l = new SegwitP2SHWallet();
    l.setSecret('Kxr9tQED9H44gCmp6HAdmemAzU3n84H3dGkuWTKvE23JgHMW8gct');
    expect(l.getAddress() === '34AgLJhwXrvmkZS1o5TrcdeevMt22Nar53').toBeTruthy();
    expect(l.getAddress() === (await l.getAddressAsync())).toBeTruthy();
    expect(l.weOwnAddress('34AgLJhwXrvmkZS1o5TrcdeevMt22Nar53')).toBeTruthy();
    expect(!l.weOwnAddress('garbage')).toBeTruthy();
    expect(!l.weOwnAddress(false)).toBeTruthy();
  });
});

describe('SegwitBech32Wallet', function () {
  it('can fetch balance', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'bc1qn887fmetaytw4vj68vsh529ft408q8j9x3dndc';
    expect(w.weOwnAddress('bc1qn887fmetaytw4vj68vsh529ft408q8j9x3dndc')).toBeTruthy();
    expect(w.weOwnAddress('BC1QN887FMETAYTW4VJ68VSH529FT408Q8J9X3DNDC')).toBeTruthy();
    expect(!w.weOwnAddress('garbage')).toBeTruthy();
    expect(!w.weOwnAddress(false)).toBeTruthy();
    await w.fetchBalance();
    expect(w.getBalance()).toBe(100000);
  });

  it('can fetch UTXO', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'bc1qn887fmetaytw4vj68vsh529ft408q8j9x3dndc';
    await w.fetchUtxo();
    const l1 = w.getUtxo().length;
    expect(w.getUtxo().length > 0).toBeTruthy();

    expect(w.getUtxo()[0].value).toBeTruthy();
    expect(w.getUtxo()[0].vout === 0).toBeTruthy();
    expect(w.getUtxo()[0].txid).toBeTruthy();
    expect(w.getUtxo()[0].confirmations).toBeTruthy();
    // double fetch shouldnt duplicate UTXOs:
    await w.fetchUtxo();
    const l2 = w.getUtxo().length;
    expect(l1).toBe(l2);
  });

  it('can fetch TXs', async () => {
    const w = new LegacyWallet();
    w._address = 'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv';
    await w.fetchTransactions();
    expect(w.getTransactions().length).toBe(2);

    for (const tx of w.getTransactions()) {
      expect(tx.hash).toBeTruthy();
      expect(tx.value).toBeTruthy();
      expect(tx.received).toBeTruthy();
      expect(tx.confirmations > 1).toBeTruthy();
    }

    expect(w.getTransactions()[0].value).toBe(-892111);
    expect(w.getTransactions()[1].value).toBe(892111);
  });

  it('can fetch TXs', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'bc1qn887fmetaytw4vj68vsh529ft408q8j9x3dndc';
    expect(w.weOwnAddress('bc1qn887fmetaytw4vj68vsh529ft408q8j9x3dndc')).toBeTruthy();
    expect(w.weOwnAddress('BC1QN887FMETAYTW4VJ68VSH529FT408Q8J9X3DNDC')).toBeTruthy();
    expect(!w.weOwnAddress('garbage')).toBeTruthy();
    expect(!w.weOwnAddress(false)).toBeTruthy();
    await w.fetchTransactions();
    expect(w.getTransactions().length).toBe(1);

    for (const tx of w.getTransactions()) {
      expect(tx.hash).toBeTruthy();
      expect(tx.value).toBe(100000);
      expect(tx.received).toBeTruthy();
      expect(tx.confirmations > 1).toBeTruthy();
    }

    const tx0 = w.getTransactions()[0];
    expect(tx0.inputs).toBeTruthy();
    expect(tx0.inputs.length === 1).toBeTruthy();
    expect(tx0.outputs).toBeTruthy();
    expect(tx0.outputs.length === 3).toBeTruthy();

    expect(w.weOwnTransaction('49944e90fe917952e36b1967cdbc1139e60c89b4800b91258bf2345a77a8b888')).toBeTruthy();
    expect(!w.weOwnTransaction('825c12f277d1f84911ac15ad1f41a3de28e9d906868a930b0a7bca61b17c8881')).toBeTruthy();
  });
});
