import assert from 'assert';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';

jest.setTimeout(300 * 1000);

afterAll(() => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  if (!(await BlueElectrum.ensureConnected())) {
    throw new Error('failed to connect to Electrum');
  }
});

describe('multisig-hd-wallet', () => {
  it('can fetch balance & transactions', async () => {
    if (!process.env.MNEMONICS_KEYSTONE) {
      console.error('process.env.MNEMONICS_KEYSTONE not set, skipped');
      return;
    }
    const path = "m/48'/0'/0'/2'";
    const fp1 = 'D37EAD88';
    const Zpub1 = 'Zpub74ijpfhERJNjhCKXRspTdLJV5eoEmSRZdHqDvp9kVtdVEyiXk7pXxRbfZzQvsDFpfDHEHVtVpx4Dz9DGUWGn2Xk5zG5u45QTMsYS2vjohNQ';

    const w = new MultisigHDWallet();
    w.addCosigner(Zpub1, fp1);
    w.addCosigner(process.env.MNEMONICS_KEYSTONE);
    w.setDerivationPath(path);
    w.setM(2);

    assert.strictEqual(w.getM(), 2);
    assert.strictEqual(w.getN(), 2);
    assert.strictEqual(w.getDerivationPath(), path);
    assert.strictEqual(w.getCosigner(1), Zpub1);
    assert.strictEqual(w.getCosignerForFingerprint(fp1), Zpub1);

    await w.fetchBalance();
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length >= 5);
    assert.strictEqual(w.getBalance(), 9757);
  });
});
