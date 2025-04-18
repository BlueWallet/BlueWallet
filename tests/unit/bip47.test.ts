import BIP47Factory from '@spsina/bip47';
import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';

import ecc from '../../blue_modules/noble_ecc';
import { HDSegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import { CreateTransactionUtxo } from '../../class/wallets/types';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';

const ECPair = ECPairFactory(ecc);

describe('Bech32 Segwit HD (BIP84) with BIP47', () => {
  it('should work', async () => {
    const bobWallet = new HDSegwitBech32Wallet();
    // @see https://gist.github.com/SamouraiDev/6aad669604c5930864bd
    bobWallet.setSecret('reward upper indicate eight swift arch injury crystal super wrestle already dentist');

    expect(bobWallet.getBIP47PaymentCode()).toEqual(
      'PM8TJS2JxQ5ztXUpBBRnpTbcUXbUHy2T1abfrb3KkAAtMEGNbey4oumH7Hc578WgQJhPjBxteQ5GHHToTYHE3A1w6p7tU6KSoFmWBVbFGjKPisZDbP97',
    );
    assert.strictEqual(bobWallet.getBIP47NotificationAddress(), '1ChvUUvht2hUQufHBXF8NgLhW8SwE2ecGV'); // our notif address
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

    const ourNotificationAddress = w.getBIP47NotificationAddress();

    const publicBip47 = BIP47Factory(ecc).fromPaymentCode(w.getBIP47PaymentCode());
    expect(ourNotificationAddress).toEqual(publicBip47.getNotificationAddress()); // same address we derived internally for ourselves and from public Payment Code
    expect(ourNotificationAddress).toEqual('1EiP2kSqxNqRhn8MPMkrtSEqaWiCWLYyTS'); // our notif address

    // since we dont do network calls in unit test we cant get counterparties payment codes from our notif address,
    // and thus, dont know collaborative addresses with our payers. lets hardcode our counterparty payment code to test
    // this functionality

    assert.deepStrictEqual(w.getBIP47SenderPaymentCodes(), []);

    w._receive_payment_codes = [
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

    const ourNotificationAddress = w.getBIP47NotificationAddress();

    const publicBip47 = BIP47Factory(ecc).fromPaymentCode(w.getBIP47PaymentCode());
    expect(ourNotificationAddress).toEqual(publicBip47.getNotificationAddress()); // same address we derived internally for ourselves and from public Payment Code

    expect(ourNotificationAddress).toEqual('16xPugarxLzuNdhDu6XCMJBsMYrTN2fghN'); // our notif address
  });

  it('should be able to create notification transaction', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    // whom we are going to notify:
    const bip47instanceReceiver = BIP47Factory(ecc).fromBip39Seed(process.env.BIP47_HD_MNEMONIC.split(':')[0], undefined, '1');

    // notifier:
    const walletSender = new HDSegwitBech32Wallet();
    walletSender.setSecret(process.env.BIP47_HD_MNEMONIC.split(':')[1]);
    walletSender.switchBIP47(true);

    // lets produce a notification transaction and verify that receiver can actually use it

    // since we cant do network calls, we hardcode our senders so later `_getWIFbyAddress`
    // could resolve wif for address deposited by him (funds we want to use reside on addresses from BIP47)
    walletSender._receive_payment_codes = [
      'PM8TJXuZNUtSibuXKFM6bhCxpNaSye6r4px2GXRV5v86uRdH9Raa8ZtXEkG7S4zLREf4ierjMsxLXSFTbRVUnRmvjw9qnc7zZbyXyBstSmjcb7uVcDYF',
    ];

    const utxos: CreateTransactionUtxo[] = [
      {
        value: 74822,
        address: 'bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt',
        txid: '73a2ac70858c5b306b101a861d582f40c456a692096a4e4805aa739258c4400d',
        vout: 0,
        wif: walletSender._getWIFbyAddress('bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt') + '',
      },
      {
        value: 894626,
        address: 'bc1qr60ek5gtjs04akcp9f5x25v5gyp2tmspx78jxl',
        txid: '64058a49bb75481fc0bebbb0d84a4aceebe319f9d32929e73cefb21d83342e9f',
        vout: 0,
        wif: walletSender._getWIFbyAddress('bc1qr60ek5gtjs04akcp9f5x25v5gyp2tmspx78jxl') + '',
      },
    ];

    const changeAddress = 'bc1q7vraw79vcf7qhnefeaul578h7vjc7tr95ywfuq';

    const { tx, fee } = walletSender.createBip47NotificationTransaction(
      utxos,
      bip47instanceReceiver.getSerializedPaymentCode(),
      33,
      changeAddress,
    );
    assert(tx);

    const recoveredPaymentCode = bip47instanceReceiver.getPaymentCodeFromRawNotificationTransaction(tx.toHex());
    assert.strictEqual(walletSender.getBIP47PaymentCode(), recoveredPaymentCode); // accepted!

    assert.strictEqual(
      uint8ArrayToHex(tx.outs[1].script),
      '6a4c500100031c9282bd392ee9700a50d7161c5f76f7b89e7a6fb551bfd5660e79cc7c8d8e7f7676b25ab4db90a96fadfa1254741e09b35e27c7dc1abcd2dc93c4c32732f45400000000000000000000000000',
    );

    const actualFeerate = fee / tx.virtualSize();
    assert.strictEqual(Math.round(actualFeerate), 33);
  });

  it('should be able to pay to PC', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    // whom we are going to pay:
    const bip47instanceReceiver = BIP47Factory(ecc).fromBip39Seed(process.env.BIP47_HD_MNEMONIC.split(':')[0], undefined, '1');

    // notifier:
    const walletSender = new HDSegwitBech32Wallet();
    walletSender.setSecret(process.env.BIP47_HD_MNEMONIC.split(':')[1]);
    walletSender.switchBIP47(true);

    // since we cant do network calls, we hardcode our senders so later `_getWIFbyAddress`
    // could resolve wif for address deposited by him (funds we want to use reside on addresses from BIP47)
    walletSender._receive_payment_codes = [
      'PM8TJXuZNUtSibuXKFM6bhCxpNaSye6r4px2GXRV5v86uRdH9Raa8ZtXEkG7S4zLREf4ierjMsxLXSFTbRVUnRmvjw9qnc7zZbyXyBstSmjcb7uVcDYF',
    ];

    walletSender.addBIP47Receiver(bip47instanceReceiver.getSerializedPaymentCode());

    const utxos: CreateTransactionUtxo[] = [
      {
        value: 74822,
        address: 'bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt',
        txid: '73a2ac70858c5b306b101a861d582f40c456a692096a4e4805aa739258c4400d',
        vout: 0,
        wif: walletSender._getWIFbyAddress('bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt') + '',
      },
      {
        value: 894626,
        address: 'bc1qr60ek5gtjs04akcp9f5x25v5gyp2tmspx78jxl',
        txid: '64058a49bb75481fc0bebbb0d84a4aceebe319f9d32929e73cefb21d83342e9f',
        vout: 0,
        wif: walletSender._getWIFbyAddress('bc1qr60ek5gtjs04akcp9f5x25v5gyp2tmspx78jxl') + '',
      },
    ];

    const changeAddress = 'bc1q7vraw79vcf7qhnefeaul578h7vjc7tr95ywfuq';

    const { tx, fee } = walletSender.createTransaction(
      utxos,
      [
        { address: bip47instanceReceiver.getSerializedPaymentCode(), value: 10234 },
        { address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 22000 },
      ],
      6,
      changeAddress,
    );
    assert(tx);

    assert.strictEqual(tx.outs[0].value, 10234n);
    assert.strictEqual(
      bitcoin.address.fromOutputScript(tx.outs[0].script),
      walletSender._getBIP47AddressSend(bip47instanceReceiver.getSerializedPaymentCode(), 0),
    );

    assert.strictEqual(tx.outs[1].value, 22000n);
    assert.strictEqual(bitcoin.address.fromOutputScript(tx.outs[1].script), '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS');

    const actualFeerate = fee / tx.virtualSize();
    assert.strictEqual(Math.round(actualFeerate), 6);

    // lets retry, but pretend that a few sender's addresses were used:

    walletSender._next_free_payment_code_address_index_send[bip47instanceReceiver.getSerializedPaymentCode()] = 6;

    const { tx: tx2 } = walletSender.createTransaction(
      utxos,
      [
        { address: bip47instanceReceiver.getSerializedPaymentCode(), value: 10234 },
        { address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 22000 },
      ],
      6,
      changeAddress,
    );
    assert(tx2);

    assert.strictEqual(
      bitcoin.address.fromOutputScript(tx2.outs[0].script),
      walletSender._getBIP47AddressSend(bip47instanceReceiver.getSerializedPaymentCode(), 6),
    );
  });

  it('should be able to pay to PC (BIP-352 SilentPayments)', async () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const walletSender = new HDSegwitBech32Wallet();
    walletSender.setSecret(process.env.BIP47_HD_MNEMONIC.split(':')[1]);
    walletSender.switchBIP47(true);

    const utxos: CreateTransactionUtxo[] = [
      {
        txid: 'ff2b3dc0f16ad96e48f59232421113330781a88ca9b4518846ad9a626260abd3',
        vout: 1,
        address: 'bc1qr7trw22djl93c2vz43ftlmaexhvph8w0v4f6ap',
        value: 195928,
        wif: walletSender._getWIFbyAddress('bc1qr7trw22djl93c2vz43ftlmaexhvph8w0v4f6ap') as string,
      },
    ];
    const changeAddress = 'bc1q7vraw79vcf7qhnefeaul578h7vjc7tr95ywfuq';

    const { tx, fee } = walletSender.createTransaction(
      utxos,
      [
        { address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 22000 },
        {
          address: 'sp1qqvvnsd3xnjpmx8hnn2ua0e9sllm34t9jydf8qfesgc7nhdxgzksjwqlrxx37nfzsg6rure5vwa92fksd6f5a6rk05kr07twhd55u3ahquy2v7t6s',
          value: 10234,
        },
      ],
      6,
      changeAddress,
    );
    assert(tx);

    const legacyAddressDestination = tx.outs.find(o => bitcoin.address.fromOutputScript(o.script) === '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS');
    assert.strictEqual(legacyAddressDestination?.value, 22000n);

    const spDestinatiob = tx.outs.find(o => Number(o.value) === 10234);
    assert.strictEqual(
      bitcoin.address.fromOutputScript(spDestinatiob!.script!),
      'bc1pu7dwaehvur4lpc7cqmynnjgx5ngthk574p05mgwxf9lecv4r6j5s02nhxq',
    );

    const changeDestination = tx.outs.find(
      o => bitcoin.address.fromOutputScript(o.script) === 'bc1q7vraw79vcf7qhnefeaul578h7vjc7tr95ywfuq',
    );

    const calculatedFee =
      195928 - Number(changeDestination!.value) - Number(spDestinatiob!.value) - Number(legacyAddressDestination!.value);

    assert.strictEqual(fee, calculatedFee);

    const actualFeerate = fee / tx.virtualSize();
    assert.strictEqual(Math.round(actualFeerate), 6);
  });

  it('can unwrap addresses to send & receive', () => {
    if (!process.env.BIP47_HD_MNEMONIC) {
      console.error('process.env.BIP47_HD_MNEMONIC not set, skipped');
      return;
    }

    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.BIP47_HD_MNEMONIC.split(':')[0]);
    w.setPassphrase('1');

    const addr = w._getBIP47AddressReceive(
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
      0,
    );
    assert.strictEqual(addr, 'bc1q57nwf9vfq2qsl80q37wq5h0tjytsk95vgjq4fe');

    const addr2 = w._getBIP47AddressSend(
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
      0,
    );

    assert.strictEqual(addr2, 'bc1qaxxc4gwx6rd6rymq08qwpxhesd4jqu93lvjsyt');

    assert.strictEqual(w.getAllExternalAddresses().length, 20); // exactly gap limit for external addresses
    assert.ok(!w.getAllExternalAddresses().includes(addr)); // joint address to _receive_ is not included

    // since we dont do network calls in unit test we cant get counterparties payment codes from our notif address,
    // and thus, dont know collaborative addresses with our payers. lets hardcode our counterparty payment code to test
    // this functionality

    assert.deepStrictEqual(w.getBIP47SenderPaymentCodes(), []);

    w.switchBIP47(true);

    w._receive_payment_codes = [
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    ];

    assert.deepStrictEqual(w.getBIP47SenderPaymentCodes(), [
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    ]);

    assert.ok(w.getAllExternalAddresses().includes(addr)); // joint address to _receive_ is included
    assert.ok(w.getAllExternalAddresses().length > 20);
  });
});
