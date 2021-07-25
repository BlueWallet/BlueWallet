import { MultisigHDWallet } from '../../class/';
const BlueElectrum = require('../../blue_modules/BlueElectrum'); // so it connects ASAP
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
global.tls = require('tls'); // needed by Electrum client. For RN it is proviced in shim.js
jasmine.DEFAULT_TIMEOUT_INTERVAL = 300 * 1000;

afterAll(() => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  try {
    await BlueElectrum.waitTillConnected();
  } catch (Err) {
    console.log('failed to connect to Electrum:', Err);
    process.exit(2);
  }
});

describe('multisig-hd-wallet', () => {
  it('can fetch balance & transactions', async () => {
    const path = "m/48'/0'/0'/2'";
    const fp1 = 'D37EAD88';
    const fp2 = '168DD603';
    const Zpub1 = 'Zpub74ijpfhERJNjhCKXRspTdLJV5eoEmSRZdHqDvp9kVtdVEyiXk7pXxRbfZzQvsDFpfDHEHVtVpx4Dz9DGUWGn2Xk5zG5u45QTMsYS2vjohNQ';
    const Zpub2 = 'Zpub75mAE8EjyxSzoyPmGnd5E6MyD7ALGNndruWv52xpzimZQKukwvEfXTHqmH8nbbc6ccP5t2aM3mws3pKYSnKpKMMytdbNEZFUxKzztYFM8Pn';

    const w = new MultisigHDWallet();
    w.addCosigner(Zpub1, fp1);
    w.addCosigner(Zpub2, fp2);
    w.setDerivationPath(path);
    w.setM(2);

    expect(w.getM()).toBe(2);
    expect(w.getN()).toBe(2);
    expect(w.getDerivationPath()).toBe(path);
    expect(w.getCosigner(1)).toBe(Zpub1);
    expect(w.getCosigner(2)).toBe(Zpub2);
    expect(w.getCosignerForFingerprint(fp1)).toBe(Zpub1);
    expect(w.getCosignerForFingerprint(fp2)).toBe(Zpub2);

    await w.fetchBalance();
    await w.fetchTransactions();
    expect(w.getTransactions().length >= 6).toBeTruthy();
  });
});
