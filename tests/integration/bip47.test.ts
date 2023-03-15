// import assert from 'assert';
import { ECPairFactory } from 'ecpair';

import { HDLegacyP2PKHWallet, HDSegwitBech32Wallet } from '../../class';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import BIP47Factory from '@spsina/bip47';
import assert from 'assert';

const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const ECPair = ECPairFactory(ecc);

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
    const hd = new HDLegacyP2PKHWallet();
    // @see https://gist.github.com/SamouraiDev/6aad669604c5930864bd
    hd.setSecret('reward upper indicate eight swift arch injury crystal super wrestle already dentist');

    expect(hd.getBIP47PaymentCode()).toEqual(
      'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
    );

    expect(hd.allowBIP47()).toEqual(true);

    await hd.fetchBIP47SenderPaymentCodes();
    expect(hd.getBIP47SenderPaymentCodes().length).toBeGreaterThanOrEqual(3);
    expect(hd.getBIP47SenderPaymentCodes()).toContain(
      'PM8TJTLJbPRGxSbc8EJi42Wrr6QbNSaSSVJ5Y3E4pbCYiTHUskHg13935Ubb7q8tx9GVbh2UuRnBc3WSyJHhUrw8KhprKnn9eDznYGieTzFcwQRya4GA',
    );
    expect(hd.getBIP47SenderPaymentCodes()).toContain(
      'PM8TJgndZSWCBPG5zCsqdXmCKLi7sP13jXuRp6b5X7G9geA3vRXQKAoXDf4Eym2RJB3vvcBdpDQT4vbo5QX7UfeV2ddjM8s79ERUTFS2ScKggSrciUsU',
    );
    expect(hd.getBIP47SenderPaymentCodes()).toContain(
      'PM8TJNiWKcyiA2MsWCfuAr9jvhA5qMEdEkjNypEnUbxMRa1D5ttQWdggQ7ib9VNFbRBSuw7i6RkqPSkCMR1XGPSikJHaCSfqWtsb1fn4WNAXjp5JVL5z',
    );

    await hd.fetchBalance();
    await hd.fetchTransactions();
    expect(hd.getTransactions().length).toBeGreaterThanOrEqual(4);
  });

  it('should work (samurai)', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.BIP47_HD_MNEMONIC.split(':')[0]);
    w.setPassphrase('1');

    expect(w.getBIP47PaymentCode()).toEqual(
      'PM8TJXuZNUtSibuXKFM6bhCxpNaSye6r4px2GXRV5v86uRdH9Raa8ZtXEkG7S4zLREf4ierjMsxLXSFTbRVUnRmvjw9qnc7zZbyXyBstSmjcb7uVcDYF',
    );

    expect(w._getExternalAddressByIndex(0)).toEqual('bc1q07l355j4yd5kyut36vjxn2u60d3dknnpt39t6y');

    const bip47 = BIP47Factory(ecc).fromBip39Seed(w.getSecret(), undefined, w.getPassphrase());
    const ourNotificationAddress = bip47.getNotificationAddress();

    const publicBip47 = BIP47Factory(ecc).fromPaymentCode(w.getBIP47PaymentCode());
    expect(ourNotificationAddress).toEqual(publicBip47.getNotificationAddress());

    expect(ourNotificationAddress).toEqual('1EiP2kSqxNqRhn8MPMkrtSEqaWiCWLYyTS'); // our notif address

    await w.fetchBIP47SenderPaymentCodes();
    assert.ok(
      w
        .getBIP47SenderPaymentCodes()
        .includes('PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo'),
    ); // sparrow payment code

    assert.ok(w.weOwnAddress('bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe')); // this is an address that was derived (and paid) from counterparty payment code

    const keyPair2 = ECPair.fromWIF(w._getWIFbyAddress('bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe') || '');
    const address = bitcoin.payments.p2wpkh({
      pubkey: keyPair2.publicKey,
    }).address;
    assert.strictEqual(address, 'bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe');

    await w.fetchTransactions();

    assert.ok(w.getTransactions().length >= 3);

    assert.strictEqual(
      w.getTransactions().find(tx => tx.txid === '64058a49bb75481fc0bebbb0d84a4aceebe319f9d32929e73cefb21d83342e9f')?.value,
      100000,
    ); // initial deposit from sparrow after sparrow made a notification tx

    assert.strictEqual(
      w.getTransactions().find(tx => tx.txid === '06b4c14587182fd0474f265a77b156519b4778769a99c21623863a8194d0fa4f')?.value,
      -22692,
    ); // notification tx to sparrow so we can pay sparrow

    assert.strictEqual(
      w.getTransactions().find(tx => tx.txid === '73a2ac70858c5b306b101a861d582f40c456a692096a4e4805aa739258c4400d')?.value,
      -77308,
    ); // paying to sparrow

    // now, constructing OP_RETURN data to notify sparrow about us

    const aliceBip47 = bip47;
    const keyPair = ECPair.fromWIF(w._getWIFbyAddress('bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe') || '');
    const bobBip47 = BIP47Factory(ecc).fromPaymentCode(
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    );
    const blindedPaymentCode = aliceBip47.getBlindedPaymentCode(
      bobBip47,
      keyPair.privateKey as Buffer,
      // txid is reversed, as well as output number ()
      Buffer.from('64058a49bb75481fc0bebbb0d84a4aceebe319f9d32929e73cefb21d83342e9f', 'hex').reverse().toString('hex') + '01000000',
    );

    assert.strictEqual(
      blindedPaymentCode,
      '0100039da7642943ec5d16c9bce09b71f240fe246d891fa3b52a7d236fece98318e1ae972f3747672f7e79a23fc88c4dc91a8d014233e14a9e4417e132405b6a6c166d00000000000000000000000000',
    );

    // checking that this is exactly a data payload we have in an actual notification transaction we have sent:
    assert.strictEqual(
      w.getTransactions().find(tx => tx.txid === '06b4c14587182fd0474f265a77b156519b4778769a99c21623863a8194d0fa4f')?.outputs?.[0]
        ?.scriptPubKey.hex,
      '6a4c50' + blindedPaymentCode,
    );
  });
});
