import BIP47Factory from '@spsina/bip47';
import ecc from 'tiny-secp256k1';
import assert from 'assert';

import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import { ECPairFactory } from 'ecpair';
const bitcoin = require('bitcoinjs-lib');

const ECPair = ECPairFactory(ecc);

describe('Bech32 Segwit HD (BIP84) with BIP47', () => {
  it('should work', async () => {
    const bobWallet = new HDSegwitBech32Wallet();
    // @see https://gist.github.com/SamouraiDev/6aad669604c5930864bd
    bobWallet.setSecret('reward upper indicate eight swift arch injury crystal super wrestle already dentist');

    expect(bobWallet.getBIP47PaymentCode()).toEqual(
      'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
    );

    const bip47 = BIP47Factory(ecc).fromBip39Seed(bobWallet.getSecret(), undefined, '');
    const bobNotificationAddress = bip47.getNotificationAddress();

    expect(bobNotificationAddress).toEqual('1ChvUUvht2hUQufHBXF8NgLhW8SwE2ecGV'); // our notif address

    assert.ok(!bobWallet.weOwnAddress('1JDdmqFLhpzcUwPeinhJbUPw4Co3aWLyzW')); // alice notif address, we dont own it
  });

  it('getters, setters, flags work', async () => {
    const w = new HDSegwitBech32Wallet();
    await w.generate();

    expect(w.allowBIP47()).toEqual(true);

    expect(w.isBIP47Enabled()).toEqual(false);
    w.switchBIP47(true);
    expect(w.isBIP47Enabled()).toEqual(true);
    w.switchBIP47(false);
    expect(w.isBIP47Enabled()).toEqual(false);

    // checking that derived watch-only does not support that:
    const ww = new WatchOnlyWallet();
    ww.setSecret(w.getXpub());
    expect(ww.allowBIP47()).toEqual(false);
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

    // since we dont do network calls in unit test we cant get counterparties payment codes from our notif address,
    // and thus, dont know collaborative addresses with our payers. lets hardcode our counterparty payment code to test
    // this functionality

    assert.deepStrictEqual(w.getBIP47SenderPaymentCodes(), []);

    w._sender_payment_codes = [
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    ];

    assert.deepStrictEqual(w.getBIP47SenderPaymentCodes(), [
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    ]);

    assert.ok(w.weOwnAddress('bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe'));
    const pubkey = w._getPubkeyByAddress('bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe');
    const path = w._getDerivationPathByAddress('bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe');
    assert.ok(pubkey);
    assert.ok(path);

    const keyPair2 = ECPair.fromWIF(w._getWIFbyAddress('bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe') || '');
    const address = bitcoin.payments.p2wpkh({
      pubkey: keyPair2.publicKey,
    }).address;

    assert.strictEqual(address, 'bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe');
  });

  it('should work (sparrow)', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.BIP47_HD_MNEMONIC.split(':')[1]);

    assert.strictEqual(
      w.getXpub(),
      'zpub6r4KaQRsLuhHSGx8b9wGHh18UnawBs49jtiDzZYh9DSgKGwD72jWR3v54fkyy1UKVxt9HvCkYHmMAUe2YjKefofWzYp9YD62sUp6nNsEDMs',
    );

    expect(w.getBIP47PaymentCode()).toEqual(
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    );

    const bip47 = BIP47Factory(ecc).fromBip39Seed(w.getSecret(), undefined, w.getPassphrase());
    const ourNotificationAddress = bip47.getNotificationAddress();

    const publicBip47 = BIP47Factory(ecc).fromPaymentCode(w.getBIP47PaymentCode());
    expect(ourNotificationAddress).toEqual(publicBip47.getNotificationAddress());

    expect(ourNotificationAddress).toEqual('16xPugarxLzuNdhDu6XCMJBsMYrTN2fghN'); // our notif address
  });
});
