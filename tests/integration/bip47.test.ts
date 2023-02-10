// import assert from 'assert';

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

describe('Bech32 Segwit HD (BIP84) with BIP47', () => {
  it('should work', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const hd = new HDSegwitBech32Wallet();
    hd.gap_limit = 1;
    hd.setSecret(process.env.BIP47_HD_MNEMONIC);

    expect(hd.getBIP47PaymentCode()).toEqual(
      'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
    );

    await hd.fetchBIP47SenderPaymentCodes();
    expect(hd._sender_payment_codes.length).toBeGreaterThanOrEqual(3);
    expect(hd._sender_payment_codes).toContain(
      'PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA',
    );
    expect(hd._sender_payment_codes).toContain(
      'PM8TJgndZSWCBPG5zCsqdXmCKLi7sP13jXuRp6b5X7G9geA3vRXQKAoXDf4Eym2RJB3vvcBdpDQT4vbo5QX7UfeV2ddjM8s79ERUTFS2ScKggSrciUsU',
    );
    expect(hd._sender_payment_codes).toContain(
      'PM8TJNiWKcyiA2MsWCfuAr9jvhA5qMEdEkjNypEnUbxMRa1D5ttQWdggQ7ib9VNFbRBSuw7i6RkqPSkCMR1XGPSikJHaCSfqWtsb1fn4WNAXjp5JVL5z',
    );

    await hd.fetchTransactions();
    expect(hd.getTransactions().length).toBeGreaterThanOrEqual(4);
  });
});
