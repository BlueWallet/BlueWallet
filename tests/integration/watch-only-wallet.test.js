import { WatchOnlyWallet } from '../../class';
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
global.tls = require('tls'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../blue_modules/BlueElectrum'); // so it connects ASAP

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 500 * 1000;

describe('Watch only wallet', () => {
  it('can fetch balance', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    await w.fetchBalance();
    expect(w.getBalance() > 16).toBeTruthy();
  });

  it('can fetch tx', async () => {
    let w = new WatchOnlyWallet();
    w.setSecret('167zK5iZrs1U6piDqubD3FjRqUTM2CZnb8');
    await w.fetchTransactions();
    expect(w.getTransactions().length >= 215).toBeTruthy();
    // should be 233 but electrum server cant return huge transactions >.<

    w = new WatchOnlyWallet();
    w.setSecret('1BiJW1jyUaxcJp2JWwbPLPzB1toPNWTFJV');
    await w.fetchTransactions();
    expect(w.getTransactions().length).toBe(2);

    // fetch again and make sure no duplicates
    await w.fetchTransactions();
    expect(w.getTransactions().length).toBe(2);
  });

  it.skip('can fetch tx from huge wallet', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s'); // binance wallet
    await w.fetchTransactions();
    expect(w.getTransactions().length === 0).toBeTruthy(); // not yet kek but at least we dont crash
  });

  it('can fetch TXs with values', async () => {
    const w = new WatchOnlyWallet();
    for (const sec of [
      'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
      'BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
      'bitcoin:bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
      'BITCOIN:BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
      'bitcoin:BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
      'BITCOIN:bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
    ]) {
      w.setSecret(sec);
      expect(w.getAddress()).toBe('bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
      expect(await w.getAddressAsync()).toBe('bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv');
      expect(w.weOwnAddress('bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv')).toBeTruthy();
      expect(w.weOwnAddress('BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV')).toBeTruthy();
      expect(!w.weOwnAddress('garbage')).toBeTruthy();
      expect(!w.weOwnAddress(false)).toBeTruthy();
      await w.fetchTransactions();

      for (const tx of w.getTransactions()) {
        expect(tx.hash).toBeTruthy();
        expect(tx.value).toBeTruthy();
        expect(tx.received).toBeTruthy();
        expect(tx.confirmations > 1).toBeTruthy();
      }

      expect(w.getTransactions()[0].value).toBe(-892111);
      expect(w.getTransactions()[1].value).toBe(892111);
    }
  });

  it('can fetch complex TXs', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('3NLnALo49CFEF4tCRhCvz45ySSfz3UktZC');
    await w.fetchTransactions();
    for (const tx of w.getTransactions()) {
      expect(tx.value).toBeTruthy();
    }
  });

  it('can fetch balance & transactions from zpub HD', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    await w.fetchBalance();
    expect(w.getBalance()).toBe(200000);
    await w.fetchTransactions();
    expect(w.getTransactions().length).toBe(4);
    expect((await w.getAddressAsync()).startsWith('bc1')).toBeTruthy();
  });
});
