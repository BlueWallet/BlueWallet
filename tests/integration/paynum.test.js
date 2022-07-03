import assert from 'assert';

import { HDSegwitBech32Wallet } from '../../class';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';

jest.setTimeout(30 * 1000);

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

describe('Bip47', () => {
  it('Bip47 works', async () => {
    if (!process.env.PAYNUM_HD_MNEMONIC) {
      console.error('process.env.PAYNUM_HD_MNEMONIC not set, skipped');
      return;
    }

    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(process.env.PAYNUM_HD_MNEMONIC);

    assert.strictEqual(hd.getPNNotificationAddress(), '1Eku8xdcT1sfA3KB9yTyfgEJNFxS16xm6Z');

    const pns = await hd.getBip47PaymentCodes();

    console.info('pns', pns);
  });
});
