import assert from 'assert';
import { Psbt } from 'bitcoinjs-lib';

import { BlueURDecoder, clearUseURv1, decodeUR, encodeUR, extractSingleWorkload, setUseURv1 } from '../../blue_modules/ur';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import { HDTaprootWallet } from '../../class/wallets/hd-taproot-wallet';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';

describe('Watch only wallet', () => {
  it('can validate address', async () => {
    const w = new WatchOnlyWallet();
    for (const secret of [
      'bc1quhnve8q4tk3unhmjts7ymxv8cd6w9xv8wy29uv',
      '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG',
      '3BDsBDxDimYgNZzsqszNZobqQq3yeUoJf2',
      'BC1QUHNVE8Q4TK3UNHMJTS7YMXV8CD6W9XV8WY29UV',
    ]) {
      w.setSecret(secret);
      assert.ok(w.valid());
      assert.deepStrictEqual(
        w.getAllExternalAddresses().map(elem => elem.toUpperCase()),
        [secret.toUpperCase()],
      );
      assert.strictEqual(w.isHd(), false);
      assert.ok(!w.useWithHardwareWalletEnabled());
    }

    w.setSecret('not valid');
    assert.ok(!w.valid());

    for (const secret of [
      'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps',
      'ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXrYjjXEzcPDX5VqnHEnuNf5VAXgLfSaytMkJ2rwVqy',
      'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP',
    ]) {
      w.setSecret(secret);
      assert.ok(w.valid());
      assert.strictEqual(w.isHd(), true);
      assert.strictEqual(w.getMasterFingerprint(), 0);
      assert.strictEqual(w.getMasterFingerprintHex(), '00000000');
      assert.ok(w.isXpubValid(), w.secret);
      assert.ok(!w.useWithHardwareWalletEnabled());
    }
  });

  it('can validate xpub', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps');
    assert.ok(w.isXpubValid());
    assert.ok(w.valid());
    w.setSecret('ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXrYjjXEzcPDX5VqnHEnuNf5VAXgLfSaytMkJ2rwVqy');
    assert.ok(w.isXpubValid());
    assert.ok(w.valid());
    w.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    assert.ok(w.isXpubValid());
    assert.ok(w.valid());
    w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6D');
    assert.ok(!w.isXpubValid());
    assert.ok(!w.valid());
    w.setSecret('ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXr');
    assert.ok(!w.isXpubValid());
    assert.ok(!w.valid());
    w.setSecret('ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXr');
    assert.ok(!w.isXpubValid());
    assert.ok(!w.valid());
  });

  it('can create PSBT base64 without signature for HW wallet xpub', async () => {
    for (const cleanupInternals of [false, true]) {
      const w = new WatchOnlyWallet();
      w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps');
      w.init();
      const changeAddress = '1KZjqYHm7a1DjhjcdcjfQvYfF2h6PqatjX';
      // hardcoding so we wont have to call w.getChangeAddressAsync()
      const utxos = [
        {
          height: 530926,
          value: 1000,
          address: '12eQ9m4sgAwTSQoNXkRABKhCXCsjm2jdVG',
          txid: 'd0432027a86119c63a0be8fa453275c2333b59067f1e559389cd3e0e377c8b96',
          vout: 1,
          txhex:
            '0100000001b630ac364a04b83548994ded4705b98316b2d1fe18b9fffa2627be9eef11bf60000000006b48304502210096e68d94d374e3a688ed2e6605289f81172540abaab5f6cc431c231919860746022075ee4e64c867ed9d369d01a9b35d8b1689a821be8d729fff7fb3dfcc75d16f6401210281d2e40ba6422fc97b61fd5643bee83dd749d8369339edc795d7b3f00e96c681fdffffff02ef020000000000001976a914e4271ef9e9a03a89b981c73d3d6936d2f6fccc0688ace8030000000000001976a914120ad7854152901ebeb269acb6cef20e71b3cf5988acea190800',
        },
      ];
      // hardcoding utxo so we wont have to call w.fetchUtxo() and w.getUtxo()

      const { psbt } = await w.createTransaction(utxos, [{ address: '1QDCFcpnrZ4yrAQxmbvSgeUC9iZZ8ehcR5' }], 1, changeAddress);

      if (cleanupInternals) {
        // these might be purged when preparing for serialization before saving to disk
        w._hdWalletInstance._node0 = undefined;
        w._hdWalletInstance._node1 = undefined;
      }

      assert.strictEqual(
        psbt.toBase64(),
        'cHNidP8BAFUCAAAAAZaLfDcOPs2Jk1UefwZZOzPCdTJF+ugLOsYZYagnIEPQAQAAAAAAAACAASgDAAAAAAAAGXapFP6ZRvxlaU5S/9HQFr1i2lsgp58AiKwAAAAAAAEA4gEAAAABtjCsNkoEuDVImU3tRwW5gxay0f4Yuf/6Jie+nu8Rv2AAAAAAa0gwRQIhAJbmjZTTdOOmiO0uZgUon4EXJUCrqrX2zEMcIxkZhgdGAiB17k5kyGftnTadAamzXYsWiaghvo1yn/9/s9/MddFvZAEhAoHS5AumQi/Je2H9VkO+6D3XSdg2kzntx5XXs/AOlsaB/f///wLvAgAAAAAAABl2qRTkJx756aA6ibmBxz09aTbS9vzMBois6AMAAAAAAAAZdqkUEgrXhUFSkB6+smmsts7yDnGzz1mIrOoZCAAiBgPGm5BfckKzaIEi8GlRM5oe4A2mUvbsxlJ+pmMhRsrOYhgAAAAALAAAgAAAAIAAAACAAAAAAAAAAAAAAA==',
      );
    }
  });

  it('can create PSBT base64 without signature for HW wallet ypub', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXrYjjXEzcPDX5VqnHEnuNf5VAXgLfSaytMkJ2rwVqy');
    w.init();
    const changeAddress = '333R1N8zst8bK7xMtqBndmwcd288qxEBmr';
    // hardcoding so we wont have to call w.getChangeAddressAsync()
    const utxos = [
      {
        height: 566299,
        value: 250000,
        address: '37EX3KrmopubWPLB8Y8NR36wXs7icu2kjQ',
        txid: '786f05d0c531c4bb399ab8cf406b2f118504280bd015e26e4ff9539f8201d4f4',
        vout: 0,
      },
    ];
    // hardcoding utxo so we wont have to call w.fetchUtxo() and w.getUtxo()

    const { psbt } = await w.createTransaction(utxos, [{ address: '398qz3BtNG8DABpEGa2VkHBcficxkgeKvX' }], 1, changeAddress);

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAFMCAAAAAfTUAYKfU/lPbuIV0AsoBIURL2tAz7iaObvEMcXQBW94AAAAAAAAAACAAQnQAwAAAAAAF6kUUatl8TFvnlvB8H/KsqbnR6kpUluHAAAAAAABASCQ0AMAAAAAABepFDzN1E7LDjAMNARzCHsU4rXqBf55hwEEFgAUG3vPJhyWYtt/ikPpOCW6jCqkmxsiBgLHMhb0QhE8eyJBnE9syGAtMehGmHe1sxpm+TlxjgFXERgAAAAAMQAAgAAAAIAAAACAAAAAAAAAAAAAAA==',
    );
  });

  it('can create PSBT base64 without signature for HW wallet zpub', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6rjLjQVqVnj7crz9E4QWj4WgczmEseJq22u2B6k2HZr6NE2PQx3ZYg8BnbjN9kCfHymSeMd2EpwpM5iiz5Nrb3TzvddxW2RMcE3VXdVaXHk');
    // zpub provided by Stepan @ CryptoAdvance
    w.init();
    const changeAddress = 'bc1quuafy8htjjj263cvpj7md84magzmc8svmh8lrm';
    // hardcoding so we wont have to call w.getChangeAddressAsync()
    const utxos = [
      {
        height: 596736,
        value: 20000,
        address: 'bc1qhu8jqyzfazgatpctqn44xr7pdd3mdx6qy2r6xa',
        txid: '7f3b9e032a84413d7a5027b0d020f8acf80ad28f68b5bce8fa8ac357248c5b80',
        vout: 0,
      },
    ];
    // hardcoding utxo so we wont have to call w.fetchUtxo() and w.getUtxo()

    const { psbt } = w.createTransaction(utxos, [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 5000 }], 1, changeAddress);

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAHECAAAAAYBbjCRXw4r66Ly1aI/SCvis+CDQsCdQej1BhCoDnjt/AAAAAAAAAACAAogTAAAAAAAAFgAUwM681sPTyox13F7GLr5VMw75EOIGOgAAAAAAABYAFOc6kh7rlKStRwwMvbaeu+oFvB4MAAAAAAABAR8gTgAAAAAAABYAFL8PIBBJ6JHVhwsE61MPwWtjtptAIgYDWOHbOE3D4KiuoR7kHtmTtFZ7KXQB+8zb51QALLJxTx8YAAAAAFQAAIAAAACAAAAAgAAAAAAAAAAAAAAiAgM005BVD8MgH5kiSGnwXSfzaxLeDSl3y17Vhrx3F/9XxBgAAAAAVAAAgAAAAIAAAACAAQAAAAAAAAAA',
    );
  });

  it('can import coldcard/electrum compatible JSON skeleton wallet, and create a tx with master fingerprint', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(require('fs').readFileSync('./tests/unit/fixtures/skeleton-coldcard.txt', 'ascii'));
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx',
    );
    assert.strictEqual(w.getMasterFingerprint(), 64392470);
    assert.strictEqual(w.getMasterFingerprintHex(), '168dd603');
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");
    assert.ok(w.useWithHardwareWalletEnabled());

    const utxos = [
      {
        height: 618811,
        value: 66600,
        address: 'bc1qzqjwye4musmz56cg44ttnchj49zueh9yr0qsxt',
        vout: 0,
        txid: '5df595dc09ee7a5c245b34ea519288137ffee731629c4ff322a6de4f72c06222',
        wif: false,
        confirmations: 1,
      },
    ];

    const { psbt } = await w.createTransaction(
      utxos,
      [{ address: 'bc1qdamevhw3zwm0ajsmyh39x8ygf0jr0syadmzepn', value: 5000 }],
      22,
      'bc1qtutssamysdkgd87df0afjct0mztx56qpze7wqe',
    );
    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAHECAAAAASJiwHJP3qYi80+cYjHn/n8TiJJR6jRbJFx67gnclfVdAAAAAAAAAACAAogTAAAAAAAAFgAUb3eWXdETtv7KGyXiUxyIS+Q3wJ0U5AAAAAAAABYAFF8XCHdkg2yGn81L+plhb9iWamgBAAAAAAABAR8oBAEAAAAAABYAFBAk4ma75DYqawitVrni8qlFzNykIgYDNK9TxoCjQ8P0+qI2Hu4hrnXnJuYAC3h2puZbgRORp+sYFo3WA1QAAIAAAACAAAAAgAAAAAAAAAAAAAAiAgL1DWeV+AfIP5RRB5zHv5vuXsIt8+rF9rrsji3FhQlhzBgWjdYDVAAAgAAAAIAAAACAAQAAAAAAAAAA',
    );
  });

  it('can import coldcard json', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(
      '{"seed_version": 17, "use_encryption": false, "wallet_type": "standard", "keystore": {"type": "hardware", "hw_type": "coldcard", "label": "Coldcard Import 96749544", "ckcc_xfp": 1150645398, "ckcc_xpub": "xpub661MyMwAqRbcGR5LnL22SYYJesG8PAm4wkT5dcJ76U8RT72NNZjaLQFHvaLe88pp45DcdfDSQ1hVzfJ371VHzYGNgVroS9N6Y31C6uGQ9St", "derivation": "m/84h/0h/0h", "xpub": "zpub6rCuTB3jGcJZkGjP7LNwGxg24yBSbi1gCr33DJkrxSsPTwMgYFE8khr8GWEC3bGKA2kG6GTU9WEkLAaYnFFQvn6y3w8MZJZua5GkcbA8nrd"}}',
    );
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rCuTB3jGcJZkGjP7LNwGxg24yBSbi1gCr33DJkrxSsPTwMgYFE8khr8GWEC3bGKA2kG6GTU9WEkLAaYnFFQvn6y3w8MZJZua5GkcbA8nrd',
    );
    assert.strictEqual(w.getMasterFingerprint(), 1150645398);
    assert.strictEqual(w.getMasterFingerprintHex(), '96749544');
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");
    assert.ok(w.useWithHardwareWalletEnabled());
  });

  it('can import Electrum compatible backup wallet, and create a tx with master fingerprint', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(require('fs').readFileSync('./tests/unit/fixtures/skeleton-electrum.txt', 'ascii'));
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx',
    );
    assert.strictEqual(w.getMasterFingerprint(), 64392470);
    assert.strictEqual(w.getMasterFingerprintHex(), '168dd603');
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/1'");
    assert.ok(w.useWithHardwareWalletEnabled());

    const utxos = [
      {
        height: 618811,
        value: 66600,
        address: 'bc1qzqjwye4musmz56cg44ttnchj49zueh9yr0qsxt',
        vout: 0,
        txid: '5df595dc09ee7a5c245b34ea519288137ffee731629c4ff322a6de4f72c06222',
        wif: false,
        confirmations: 1,
      },
    ];

    const { psbt } = await w.createTransaction(
      utxos,
      [{ address: 'bc1qdamevhw3zwm0ajsmyh39x8ygf0jr0syadmzepn', value: 5000 }],
      22,
      'bc1qtutssamysdkgd87df0afjct0mztx56qpze7wqe',
    );
    assert.strictEqual(psbt.data.inputs[0].bip32Derivation[0].path, "m/84'/0'/1'/0/0");
    assert.strictEqual(psbt.data.outputs[1].bip32Derivation[0].path, "m/84'/0'/1'/1/0");
    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAHECAAAAASJiwHJP3qYi80+cYjHn/n8TiJJR6jRbJFx67gnclfVdAAAAAAAAAACAAogTAAAAAAAAFgAUb3eWXdETtv7KGyXiUxyIS+Q3wJ0U5AAAAAAAABYAFF8XCHdkg2yGn81L+plhb9iWamgBAAAAAAABAR8oBAEAAAAAABYAFBAk4ma75DYqawitVrni8qlFzNykIgYDNK9TxoCjQ8P0+qI2Hu4hrnXnJuYAC3h2puZbgRORp+sYFo3WA1QAAIAAAACAAQAAgAAAAAAAAAAAAAAiAgL1DWeV+AfIP5RRB5zHv5vuXsIt8+rF9rrsji3FhQlhzBgWjdYDVAAAgAAAAIABAACAAQAAAAAAAAAA',
    );
  });

  it('can import Electrum compatible backup wallet, and create a tx with master fingerprint hex', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(require('fs').readFileSync('./tests/unit/fixtures/skeleton-electrum-hex-only.txt', 'ascii'));
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx',
    );
    assert.strictEqual(w.getMasterFingerprint(), 1455298230);
    assert.strictEqual(w.getMasterFingerprintHex(), 'b616be56');
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");
    assert.ok(w.useWithHardwareWalletEnabled());
  });

  it('can import Electrum compatible backup wallet, and create a tx with master fingerprint hex with a length of 7', async () => {
    const w = new WatchOnlyWallet();
    let str = require('fs').readFileSync('./tests/unit/fixtures/skeleton-electrum-hex-only.txt', 'ascii');
    str = str.replace('b616be56', '616be56');
    // console.log(str)
    w.setSecret(str);
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx',
    );
    assert.strictEqual(w.getMasterFingerprint(), 1455298054);
    assert.strictEqual(w.getMasterFingerprintHex(), '0616be56');
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");
    assert.ok(w.useWithHardwareWalletEnabled());
  });

  it('will fail to import Electrum compatible backup wallet when fingerprint hex is less than 7', async () => {
    const w = new WatchOnlyWallet();
    let str = require('fs').readFileSync('./tests/unit/fixtures/skeleton-electrum-hex-only.txt', 'ascii');
    str = str.replace('b616be56', '16be56');
    w.setSecret(str);
    w.init();
    assert.throws(w.valid, 'invalid fingerprint hex');
  });

  it('will fail to import Electrum compatible backup wallet when fingerprint is an invalid hex value', async () => {
    const w = new WatchOnlyWallet();
    let str = require('fs').readFileSync('./tests/unit/fixtures/skeleton-electrum-hex-only.txt', 'ascii');
    str = str.replace('b616be56', 'j16be56');
    w.setSecret(str);
    w.init();
    assert.throws(w.valid, 'invalid fingerprint hex');
  });

  it('can import cobo vault JSON skeleton wallet', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(require('fs').readFileSync('./tests/unit/fixtures/skeleton-cobo.txt', 'ascii'));
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rcabYFcdr41zyUNRWRyHYs2Sm86E5XV8RjjRzTFYsiCngteeZnkwaF2xuhjmM6kpHjuNpFW42BMhzPmFwXt48e1FhddMB7xidZzN4SF24K',
    );
    assert.strictEqual(w.getMasterFingerprint(), 1908437330);
    assert.strictEqual(w.getMasterFingerprintHex(), '5271c071');
    assert.strictEqual(w.getLabel(), 'Wallet');
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");
    assert.ok(w.useWithHardwareWalletEnabled());
  });

  it('can import taproot BIP86 from keystone with zpub instead of xpub', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(
      JSON.stringify({
        ExtPubKey: 'zpub6rxQT4vrGrdLmFicJZnLxx1odj1C8xNtHW5pW84hMSXdtoFnCbqBFJm3bF5PrwYL5ScxFhdzRuv3pb9beyoraQLMuQWkV9faGuxstBPgLw4',
        MasterFingerprint: 'B68AF6E4',
        AccountKeyPath: "m/86'/0'/0'",
      }),
    );
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rxQT4vrGrdLmFicJZnLxx1odj1C8xNtHW5pW84hMSXdtoFnCbqBFJm3bF5PrwYL5ScxFhdzRuv3pb9beyoraQLMuQWkV9faGuxstBPgLw4',
    );
    assert.strictEqual(w.getMasterFingerprintHex(), 'B68AF6E4'.toLowerCase());
    assert.strictEqual(w.getLabel(), 'Wallet');
    assert.strictEqual(w.getDerivationPath(), "m/86'/0'/0'");
    assert.ok(w._getExternalAddressByIndex(0).startsWith('bc1p'), `not taproot address generated: ${w._getExternalAddressByIndex(0)}`);
    assert.ok(w.allowMasterFingerprint());
    // assert.ok(w.useWithHardwareWalletEnabled());
  });

  it('can import zpub with master fingerprint and derivation path', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(require('fs').readFileSync('./tests/unit/fixtures/skeleton-walletdescriptor.txt', 'ascii'));
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6s2RJ9qAEBW8Abhojs6LyDzF7gttcDr6EsR3Umu2aptZBb45e734rGtt4KqsCMmNyR1EEzUU2ugdVYez2VywQvAbBjUSKn8ho4Zk2c5otkk',
    );
    assert.strictEqual(w.getMasterFingerprint(), 4167290508);
    assert.strictEqual(w.getMasterFingerprintHex(), '8cce63f8');
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");
    assert.ok(!w.useWithHardwareWalletEnabled());
  });

  it('can import wallet descriptor for BIP84, but with xpub instead of zpub', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(
      '[dafedf1c/84h/0h/0h]xpub6DFMZMLizqqnyyHoWTG7qzmCR1irpiDEGT4JQX7ubeoFtV838ABKPfgAPQbM1TEekEyCuJF1BrmnA7JPrnzqi2VbycD3tVE3v5xsDQqYA3A',
    );
    w.init();
    assert.ok(w.valid());

    assert.strictEqual(w.getMasterFingerprintHex(), 'dafedf1c');
    assert.strictEqual(w.getMasterFingerprint(), 484441818);
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");

    assert.strictEqual(
      w.getSecret(),
      'zpub6rutAggZJCvkgZg3BAqNGAxCkx1khxCE6g6jyJugMfZ1zgkVdUWSdnzSRpWX1GYVZXCpQFS87BUsvgXXJBpsJVroiHbu4Js2TY69zbWcTNb',
    );

    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1q68y6r45k4kvxe42xl37dgjueg2suqwnh4ze0sr');

    assert.ok(!w.useWithHardwareWalletEnabled());
  });

  it('can import wallet descriptor for BIP84 from Sparrow Wallet', async () => {
    const payload =
      'UR:CRYPTO-OUTPUT/TAADMWTAADDLOLAOWKAXHDCLAXINTOCTFTNNIERONTNYGALYEMAAWPHDAXDIEOWPJEGHKPGMKERHIABDTBLUBNMUMWAAHDCXFHSNBGTSGWSWPTDWVTDIHYHNHPLBBSJEOLSNFZBDIYJLTTPFIMEYTEECKTGSBZBDAHTAADEHOEADAEAOAEAMTAADDYOTADLNCSGHYKAEYKAEYKAOCYFNLBCYGMAXAXAYCYSRRTSPGADLMKBGTD';

    const decoder = new BlueURDecoder();
    decoder.receivePart(payload);
    let data;
    if (decoder.isComplete()) {
      data = decoder.toString();
    }

    const w = new WatchOnlyWallet();
    w.setSecret(data);
    w.init();
    assert.ok(w.valid());

    assert.strictEqual(w.getMasterFingerprintHex(), '3c7f1a52');
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");

    assert.strictEqual(w._getExternalAddressByIndex(0), 'bc1qr0y5c96xtfeulnzxnjl086f2njcmf8qmhenvpp');

    assert.strictEqual(
      w.getSecret(),
      'zpub6rkkMBH6dE8bUPM9MC3WTMYQ3pDYR1kHnNDrqEGY3FotR4EUifR1S4xd7ynwczREFCbfWyk5S4mhzPL8YuGsCSgey1AwH7fk4w9AULpyDYL',
    );
  });

  it('can import BIP86 (taproot) wallet descriptor', async () => {
    const descriptors = [
      "tr([97311f91/86'/0'/0']xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw/<0;1>/*)",
      "tr([97311f91/86'/0'/0']xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw)",
      "tr([97311f91/86'/0'/0']xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw",
      "[97311f91/86'/0'/0']xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw",
    ];
    for (const descriptor of descriptors) {
      const w = new WatchOnlyWallet();
      w.setSecret(descriptor);
      w.init();
      assert.ok(w.valid());

      assert.strictEqual(w.getMasterFingerprintHex(), '97311f91');
      assert.strictEqual(w.getDerivationPath(), "m/86'/0'/0'");

      assert.strictEqual(
        w.getSecret(),
        'xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw',
      );

      assert.ok(w._getExternalAddressByIndex(0).startsWith('bc1p'), 'not taproot address, got: ' + w._getExternalAddressByIndex(0));
      assert.ok(w.allowMasterFingerprint());
      assert.ok(!w.useWithHardwareWalletEnabled());
    }
  });

  it('can import BIP86 (taproot) wallet descriptor but with zpub instead of xpub', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret(
      "tr([b68af6e4/86'/0'/0']zpub6rxQT4vrGrdLmFicJZnLxx1odj1C8xNtHW5pW84hMSXdtoFnCbqBFJm3bF5PrwYL5ScxFhdzRuv3pb9beyoraQLMuQWkV9faGuxstBPgLw4)",
    );
    w.init();
    assert.ok(w.valid());

    assert.strictEqual(w.getMasterFingerprintHex(), 'b68af6e4');
    assert.strictEqual(w.getDerivationPath(), "m/86'/0'/0'");

    assert.strictEqual(
      w.getSecret(),
      'zpub6rxQT4vrGrdLmFicJZnLxx1odj1C8xNtHW5pW84hMSXdtoFnCbqBFJm3bF5PrwYL5ScxFhdzRuv3pb9beyoraQLMuQWkV9faGuxstBPgLw4',
    );

    assert.ok(w._getExternalAddressByIndex(0).startsWith('bc1p'), 'not taproot address, got: ' + w._getExternalAddressByIndex(0));

    assert.ok(!w.useWithHardwareWalletEnabled());
  });

  it('can import taproot descriptor with non-BIP86 path', async () => {
    // Regression test: tr() descriptors should be identified by script type, not just path
    // Previously, tr([fp/0/0]xpub...) would incorrectly create a Legacy wallet because
    // the path didn't start with m/86'
    const w = new WatchOnlyWallet();
    w.setSecret(
      'tr([97311f91/0/0]xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw/<0;1>/*)',
    );
    w.init();
    assert.ok(w.valid());

    assert.strictEqual(w.getMasterFingerprintHex(), '97311f91');
    assert.strictEqual(w.getDerivationPath(), 'm/0/0');
    assert.strictEqual(w.segwitType, 'p2tr');

    // Critical: Should create Taproot wallet, not Legacy
    assert.strictEqual(w._hdWalletInstance.type, 'HDtaproot');
    assert.ok(w._getExternalAddressByIndex(0).startsWith('bc1p'), 'not taproot address, got: ' + w._getExternalAddressByIndex(0));
  });

  it('can import wpkh descriptor with custom path', async () => {
    // Test that wpkh() descriptors are identified by script type, not path
    const w = new WatchOnlyWallet();
    w.setSecret(
      'wpkh([97311f91/0/0]xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw)',
    );
    w.init();
    assert.ok(w.valid());

    assert.strictEqual(w.segwitType, 'p2wpkh');
    assert.strictEqual(w._hdWalletInstance.type, 'HDsegwitBech32');
    assert.ok(w._getExternalAddressByIndex(0).startsWith('bc1q'), 'not segwit address, got: ' + w._getExternalAddressByIndex(0));
  });

  it('can import pkh descriptor with custom path', async () => {
    // Test that pkh() descriptors are identified by script type, not path
    const w = new WatchOnlyWallet();
    w.setSecret(
      'pkh([97311f91/0/0]xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw)',
    );
    w.init();
    assert.ok(w.valid());

    assert.strictEqual(w.segwitType, 'p2pkh');
    assert.strictEqual(w._hdWalletInstance.type, 'HDlegacyP2PKH');
    assert.ok(w._getExternalAddressByIndex(0).startsWith('1'), 'not legacy address, got: ' + w._getExternalAddressByIndex(0));
  });

  it('can import sh(wpkh) descriptor with custom path', async () => {
    // Test that sh(wpkh()) descriptors are identified by script type, not path
    const w = new WatchOnlyWallet();
    w.setSecret(
      'sh(wpkh([97311f91/0/0]xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw))',
    );
    w.init();
    assert.ok(w.valid());

    assert.strictEqual(w.segwitType, 'p2sh(p2wpkh)');
    assert.strictEqual(w._hdWalletInstance.type, 'HDsegwitP2SH');
    assert.ok(w._getExternalAddressByIndex(0).startsWith('3'), 'not wrapped segwit address, got: ' + w._getExternalAddressByIndex(0));
  });

  it('can import BIP86 (taproot) wallet descriptor and create transaction', async () => {
    for (const cleanupInternals of [false, true]) {
      const w = new WatchOnlyWallet();
      // MNEMONICS_KEYSTONE
      w.setSecret(
        "tr([b68af6e4/86'/0'/0']zpub6rxQT4vrGrdLmFicJZnLxx1odj1C8xNtHW5pW84hMSXdtoFnCbqBFJm3bF5PrwYL5ScxFhdzRuv3pb9beyoraQLMuQWkV9faGuxstBPgLw4)",
      );
      w.init();
      assert.ok(w.valid());

      assert.strictEqual(w.getMasterFingerprintHex(), 'b68af6e4');
      assert.strictEqual(w.getDerivationPath(), "m/86'/0'/0'");

      assert.strictEqual(
        w.getSecret(),
        'zpub6rxQT4vrGrdLmFicJZnLxx1odj1C8xNtHW5pW84hMSXdtoFnCbqBFJm3bF5PrwYL5ScxFhdzRuv3pb9beyoraQLMuQWkV9faGuxstBPgLw4',
      );

      assert.ok(w._getExternalAddressByIndex(0).startsWith('bc1p'), 'not taproot address, got: ' + w._getExternalAddressByIndex(0));

      const utxos = [
        {
          height: 923789,
          value: 10108,
          address: 'bc1pyren45uwytsghuxelahgyjflrx9dhq9zhavangrcmw2avfre6spqtwxgm4',
          txid: 'dd8a90cfef8b5966781cfaddf8a5e8f1e2dce12e7ceed25c6d329c1df2e17c4f',
          vout: 0,
          wif: false,
          confirmations: 7,
        },
      ];

      if (cleanupInternals) {
        // these might be purged when preparing for serialization before saving to disk
        w._hdWalletInstance._node0 = undefined;
        w._hdWalletInstance._node1 = undefined;
      }

      const { psbt } = w.createTransaction(utxos, [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS' }], 1, w._getInternalAddressByIndex(0));
      assert.ok(psbt);

      assert.ok(!w.useWithHardwareWalletEnabled());
    }
  });

  it('can combine signed PSBT and prepare it for broadcast', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6rjLjQVqVnj7crz9E4QWj4WgczmEseJq22u2B6k2HZr6NE2PQx3ZYg8BnbjN9kCfHymSeMd2EpwpM5iiz5Nrb3TzvddxW2RMcE3VXdVaXHk');
    w.init();
    const signedPsbt =
      'cHNidP8BAHECAAAAAYBbjCRXw4r66Ly1aI/SCvis+CDQsCdQej1BhCoDnjt/AAAAAAAAAACAAogTAAAAAAAAFgAUwM681sPTyox13F7GLr5VMw75EOK3OQAAAAAAABYAFOc6kh7rlKStRwwMvbaeu+oFvB4MAAAAAAAiAgNY4ds4TcPgqK6hHuQe2ZO0VnspdAH7zNvnVAAssnFPH0cwRAIgPR9zZzNTnfPqZJifyUwdM2cWW8PZqCnSCsfCePlZ2aoCIFbhr/5P/bS6eGQZtX3+6q+nUO6KaSKYgaaZrUZENF6BAQAAAA==';
    const unsignedPsbt =
      'cHNidP8BAHECAAAAAYBbjCRXw4r66Ly1aI/SCvis+CDQsCdQej1BhCoDnjt/AAAAAAAAAACAAogTAAAAAAAAFgAUwM681sPTyox13F7GLr5VMw75EOK3OQAAAAAAABYAFOc6kh7rlKStRwwMvbaeu+oFvB4MAAAAAAABAR8gTgAAAAAAABYAFL8PIBBJ6JHVhwsE61MPwWtjtptAIgYDWOHbOE3D4KiuoR7kHtmTtFZ7KXQB+8zb51QALLJxTx8YAAAAAFQAAIAAAACAAAAAgAAAAAAAAAAAAAAiAgM005BVD8MgH5kiSGnwXSfzaxLeDSl3y17Vhrx3F/9XxBgAAAAAVAAAgAAAAIAAAACAAQAAAAAAAAAA';

    const Tx = w.combinePsbt(unsignedPsbt, signedPsbt);

    assert.strictEqual(
      Tx.toHex(),
      '02000000000101805b8c2457c38afae8bcb5688fd20af8acf820d0b027507a3d41842a039e3b7f000000000000000080028813000000000000160014c0cebcd6c3d3ca8c75dc5ec62ebe55330ef910e2b739000000000000160014e73a921eeb94a4ad470c0cbdb69ebbea05bc1e0c0247304402203d1f736733539df3ea64989fc94c1d3367165bc3d9a829d20ac7c278f959d9aa022056e1affe4ffdb4ba786419b57dfeeaafa750ee8a69229881a699ad4644345e8101210358e1db384dc3e0a8aea11ee41ed993b4567b297401fbccdbe754002cb2714f1f00000000',
    );

    // checking that combine can work with both base64 and pure Psbt objects
    const Tx2 = w.combinePsbt(Psbt.fromBase64(unsignedPsbt), Psbt.fromBase64(signedPsbt));

    assert.strictEqual(Tx2.toHex(), Tx.toHex());
  });

  it('ypub watch-only can generate addresses', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('ypub6Y9u3QCRC1HkZv3stNxcQVwmw7vC7KX5Ldz38En5P88RQbesP2oy16hNyQocVCfYRQPxdHcd3pmu9AFhLv7NdChWmw5iNLryZ2U6EEHdnfo');
    w.init();
    assert.ok((await w._getExternalAddressByIndex(0)).startsWith('3'));
    assert.ok(w.getAllExternalAddresses().includes(await w._getExternalAddressByIndex(0)));
  });

  it('xpub watch-only can generate addresses', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps');
    w.init();
    assert.ok((await w._getExternalAddressByIndex(0)).startsWith('1'));
    assert.ok(w.getAllExternalAddresses().includes(await w._getExternalAddressByIndex(0)));
  });

  it('can determine change address for HD wallet', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('ypub6Y9u3QCRC1HkZv3stNxcQVwmw7vC7KX5Ldz38En5P88RQbesP2oy16hNyQocVCfYRQPxdHcd3pmu9AFhLv7NdChWmw5iNLryZ2U6EEHdnfo');
    w.init();
    assert.ok(!w.addressIsChange(await w._getExternalAddressByIndex(0)));
    assert.ok(w.addressIsChange(await w._getInternalAddressByIndex(0)));
  });

  it('can craft correct psbt for HW wallet to sign', async () => {
    const w = new WatchOnlyWallet();
    w.setSecret('ypub6Y9u3QCRC1HkZv3stNxcQVwmw7vC7KX5Ldz38En5P88RQbesP2oy16hNyQocVCfYRQPxdHcd3pmu9AFhLv7NdChWmw5iNLryZ2U6EEHdnfo');
    w.init();

    // a hack to make it find pubkey for address correctly:
    w._hdWalletInstance.next_free_address_index = 110;
    w._hdWalletInstance.next_free_change_address_index = 110;

    const utxos = [
      {
        height: 557538,
        value: 51432,
        address: '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK',
        vout: 0,
        txid: 'b2ac59bc282083498d1e87805d89bef9d3f3bc216c1d2c4dfaa2e2911b547100',
        wif: false,
        confirmations: 132402,
      },
    ];

    const changeAddress = '3DrZBgntD8kBBbuKLJtPVAeGT75BMC7NxU';

    const { psbt } = w.createTransaction(utxos, [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 5000 }], 1, changeAddress);

    assert.strictEqual(
      uint8ArrayToHex(psbt.data.outputs[1].bip32Derivation[0].pubkey),
      '03e060c9b5bb85476caa53e3b8cd3d40c9dc2c36a8a5e8ed87e48bfc9bbe1760ad',
    );
    assert.strictEqual(psbt.data.inputs[0].bip32Derivation[0].path, "m/49'/0'/0'/1/45");
    assert.strictEqual(psbt.data.outputs[1].bip32Derivation[0].path, "m/49'/0'/0'/1/46");

    // now, changing derivation path of a watch-only wallet and expect that new crafted psbt will have this new path:

    const newPath = "m/66'/6'/6'";
    assert.strictEqual(w.getDerivationPath(), "m/49'/0'/0'");
    const idBefore = w.getID();
    w.setDerivationPath(newPath);
    assert.strictEqual(w.getDerivationPath(), newPath);
    assert.strictEqual(w.getID(), idBefore);

    const { psbt: psbt2 } = await w.createTransaction(
      utxos,
      [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 5000 }],
      1,
      changeAddress,
    );

    assert.strictEqual(
      uint8ArrayToHex(psbt2.data.outputs[1].bip32Derivation[0].pubkey),
      '03e060c9b5bb85476caa53e3b8cd3d40c9dc2c36a8a5e8ed87e48bfc9bbe1760ad',
    );
    assert.strictEqual(psbt2.data.inputs[0].bip32Derivation[0].path, newPath + '/1/45');
    assert.strictEqual(psbt2.data.outputs[1].bip32Derivation[0].path, newPath + '/1/46');
  });

  it('xpub watch only has derivation path set to BIP44 default', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps');
    w.init();

    assert.strictEqual(w.getDerivationPath(), "m/44'/0'/0'");
  });

  it('ypub watch only has derivation path set to BIP49 default', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('ypub6Y9u3QCRC1HkZv3stNxcQVwmw7vC7KX5Ldz38En5P88RQbesP2oy16hNyQocVCfYRQPxdHcd3pmu9AFhLv7NdChWmw5iNLryZ2U6EEHdnfo');
    w.init();

    assert.strictEqual(w.getDerivationPath(), "m/49'/0'/0'");
  });

  it('zpub watch only has derivation path set to BIP84 default', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6rjLjQVqVnj7crz9E4QWj4WgczmEseJq22u2B6k2HZr6NE2PQx3ZYg8BnbjN9kCfHymSeMd2EpwpM5iiz5Nrb3TzvddxW2RMcE3VXdVaXHk');
    w.init();

    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");
  });

  // #8803: SendDetails fee used WatchOnlyWallet.coinselect (legacy sizing when segwitType unset)
  // while createTransaction used the HD instance — multi-input fees diverged.
  it('coinselect fee matches createTransaction fee for multi-UTXO zpub', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6rjLjQVqVnj7crz9E4QWj4WgczmEseJq22u2B6k2HZr6NE2PQx3ZYg8BnbjN9kCfHymSeMd2EpwpM5iiz5Nrb3TzvddxW2RMcE3VXdVaXHk');
    w.init();

    // bump gap so both receive addresses resolve
    w._hdWalletInstance.next_free_address_index = 2;
    w._hdWalletInstance.next_free_change_address_index = 1;

    const utxos = [
      {
        value: 100000,
        address: w._getExternalAddressByIndex(0),
        vout: 0,
        txid: '11'.repeat(32),
      },
      {
        value: 100000,
        address: w._getExternalAddressByIndex(1),
        vout: 1,
        txid: '22'.repeat(32),
      },
    ];
    const targets = [{ address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', value: 150000 }];
    const changeAddress = w._getInternalAddressByIndex(0);

    const { fee } = w.createTransaction(utxos, targets, 1, changeAddress);
    const { fee: estimatedFee } = w.coinselect(utxos, targets, 1);
    assert.strictEqual(estimatedFee, fee);
  });

  it('can edit derivation path and master fingerprint without changing addresses', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    w.init();
    const addressBefore = w._getExternalAddressByIndex(0);
    const idBefore = w.getID();
    assert.strictEqual(w.getMasterFingerprintHex(), '00000000');
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");

    // a bare zpub carries no key origin info; the user corrects it,
    // e.g. for an Electrum-seed wallet whose account root is m/0'
    w.setDerivationPath("m/0'");
    w.setMasterFingerprintFromHex('73c5da0a');

    assert.strictEqual(w.getDerivationPath(), "m/0'");
    assert.strictEqual(w.getMasterFingerprintHex(), '73c5da0a');
    assert.strictEqual(w.getID(), idBefore);

    const { psbt } = w.createTransaction(
      [{ value: 100000, address: addressBefore, vout: 0, txid: '11'.repeat(32) }],
      [{ address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', value: 5000 }],
      1,
      w._getInternalAddressByIndex(0),
    );
    assert.strictEqual(psbt.data.inputs[0].bip32Derivation[0].path, "m/0'/0/0");
    assert.strictEqual(uint8ArrayToHex(psbt.data.inputs[0].bip32Derivation[0].masterFingerprint), '73c5da0a');

    // metadata edits must survive re-init and never change address derivation or wallet ID
    w.init();
    w._hdWalletInstance.external_addresses_cache = {};
    assert.strictEqual(w._getExternalAddressByIndex(0), addressBefore);
    assert.strictEqual(w.getDerivationPath(), "m/0'");
    assert.strictEqual(w.getMasterFingerprintHex(), '73c5da0a');
    assert.strictEqual(w.getID(), idBefore);

    // save/load (app restart): path lives on the HD instance, ID stays on this._derivationPath
    w.prepareForSerialization();
    const restored = WatchOnlyWallet.fromJson(JSON.stringify(w));
    restored.init();
    restored._hdWalletInstance.external_addresses_cache = {};
    assert.strictEqual(restored.getID(), idBefore);
    assert.strictEqual(restored.getDerivationPath(), "m/0'");
    assert.strictEqual(restored.getMasterFingerprintHex(), '73c5da0a');
    assert.strictEqual(restored._getExternalAddressByIndex(0), addressBefore);

    // even a path that init() would normally map to another script type must not flip addresses
    w.setDerivationPath("m/49'/0'/0'");
    assert.strictEqual(w.getID(), idBefore);
    w.init();
    w._hdWalletInstance.external_addresses_cache = {};
    assert.strictEqual(w._getExternalAddressByIndex(0), addressBefore);
    assert.strictEqual(w.getID(), idBefore);

    w.prepareForSerialization();
    const restoredHostile = WatchOnlyWallet.fromJson(JSON.stringify(w));
    restoredHostile.init();
    restoredHostile._hdWalletInstance.external_addresses_cache = {};
    assert.strictEqual(restoredHostile.getID(), idBefore);
    assert.strictEqual(restoredHostile.getDerivationPath(), "m/49'/0'/0'");
    assert.strictEqual(restoredHostile._getExternalAddressByIndex(0), addressBefore);
  });

  it('path edit does not flip script type for xpub and ypub', () => {
    const cases = [
      {
        secret: 'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps',
        hostilePath: "m/84'/0'/0'",
        prefix: '1',
      },
      {
        secret: 'ypub6Y9u3QCRC1HkZv3stNxcQVwmw7vC7KX5Ldz38En5P88RQbesP2oy16hNyQocVCfYRQPxdHcd3pmu9AFhLv7NdChWmw5iNLryZ2U6EEHdnfo',
        hostilePath: "m/84'/0'/0'",
        prefix: '3',
      },
    ];
    for (const { secret, hostilePath, prefix } of cases) {
      const w = new WatchOnlyWallet();
      w.setSecret(secret);
      w.init();
      const addressBefore = w._getExternalAddressByIndex(0);
      const idBefore = w.getID();
      assert.ok(addressBefore.startsWith(prefix), addressBefore);
      w.setDerivationPath(hostilePath);
      w.init();
      w._hdWalletInstance.external_addresses_cache = {};
      assert.strictEqual(w._getExternalAddressByIndex(0), addressBefore);
      assert.strictEqual(w.getID(), idBefore);
      assert.ok(w._getExternalAddressByIndex(0).startsWith(prefix));
    }
  });

  it('bare xpub imported at a script-typed path gets that script type', () => {
    // same call order as the custom derivation path import flow
    const xpub = 'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps';
    const cases = [
      { path: "m/84'/0'/0'", secretPrefix: 'zpub', addressPrefix: 'bc1q' },
      { path: "m/49'/0'/0'", secretPrefix: 'ypub', addressPrefix: '3' },
      { path: "m/86'/0'/0'", secretPrefix: 'xpub', addressPrefix: 'bc1p' },
      { path: "m/44'/0'/0'", secretPrefix: 'xpub', addressPrefix: '1' },
      { path: "m/0'", secretPrefix: 'xpub', addressPrefix: '1' }, // path says nothing about script type
    ];
    for (const { path, secretPrefix, addressPrefix } of cases) {
      const w = new WatchOnlyWallet();
      w.setSecretForCustomPathImport(xpub, path);
      w.init();
      w.setDerivationPath(path);
      assert.ok(w.getSecret().startsWith(secretPrefix), `${path}: ${w.getSecret().slice(0, 4)}`);
      assert.ok(w._getExternalAddressByIndex(0).startsWith(addressPrefix), `${path}: ${w._getExternalAddressByIndex(0)}`);
      assert.strictEqual(w.getDerivationPath(), path);
      assert.strictEqual(w.getMasterFingerprintHex(), '00000000'); // synthetic origin carries no fingerprint

      // and what Export/Backup shows restores the same wallet
      const restored = new WatchOnlyWallet();
      restored.setSecret(w.getSecretForExport());
      restored.init();
      assert.strictEqual(restored._getExternalAddressByIndex(0), w._getExternalAddressByIndex(0), path);
    }
  });

  it('setSecretForCustomPathImport changes nothing except a valid bare xpub at an export-safe path', () => {
    const xpub = 'xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps';
    const zpub = 'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP';

    // these must behave exactly as a plain setSecret: script-typed keys, key origins with a
    // genuine fingerprint, an xpub-prefixed string with an embedded origin, and invalid input
    const passthrough = [zpub, `[aabbccdd/44'/0'/0']${xpub}`, `xpubZZZ[beebeeb0/84'/0'/0']${xpub}`, 'xpubGARBAGE', `${xpub}/0/*`];
    for (const input of passthrough) {
      const w = new WatchOnlyWallet();
      w.setSecretForCustomPathImport(input, "m/84'/0'/0'");
      const reference = new WatchOnlyWallet();
      reference.setSecret(input);
      assert.strictEqual(w.getSecret(), reference.getSecret(), input.slice(0, 24));
      assert.strictEqual(w.getMasterFingerprintHex(), reference.getMasterFingerprintHex(), input.slice(0, 24));
    }

    // short and testnet 84/49 paths stay unwrapped: the converted key would not survive an
    // export round trip (the secret would stay xpub while addresses are segwit)
    for (const path of ["m/84'", "m/84'/1'/0'", "m/49'/1'/0'", "m/44'/0'/0'", "m/0'"]) {
      const w = new WatchOnlyWallet();
      w.setSecretForCustomPathImport(xpub, path);
      assert.strictEqual(w.getSecret(), xpub, path);
    }

    // whitespace around a valid bare xpub is tolerated
    const w = new WatchOnlyWallet();
    w.setSecretForCustomPathImport(`  ${xpub}  `, "m/84'/0'/0'");
    assert.ok(w.getSecret().startsWith('zpub'));
  });

  it('can set derivation path right after import, before and without explicit init()', () => {
    // same call order as the custom derivation path import flow
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    const idBefore = w.getID();
    w.setDerivationPath("m/0'"); // no explicit init() — the setter must handle it
    assert.strictEqual(w.getDerivationPath(), "m/0'");
    assert.strictEqual(w.getID(), idBefore);

    const reference = new WatchOnlyWallet();
    reference.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    reference.init();
    assert.strictEqual(w._getExternalAddressByIndex(0), reference._getExternalAddressByIndex(0));
    assert.strictEqual(w.getID(), reference.getID());
  });

  it('setDerivationPath and setMasterFingerprintFromHex reject invalid input', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh'); // plain address, not HD
    assert.throws(() => w.setDerivationPath("m/0'"));

    const hd = new WatchOnlyWallet();
    hd.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    hd.init();
    assert.throws(() => hd.setMasterFingerprintFromHex('nothex00'));
    assert.strictEqual(hd.getMasterFingerprintHex(), '00000000');
  });

  it('master fingerprint with 00 at the end round-trips and can create a PSBT', () => {
    const zpub = 'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP';
    // beeb0000 stores as 0x0000ebbe, so its hex is 4 chars and needs four pad chars —
    // the case a single prepended '0' could never have covered
    const cases = ['beebee00', 'beeb0000', '00beebee', 'be00ebee', 'beebee0a'];
    for (const fp of cases) {
      const w = new WatchOnlyWallet();
      w.setSecret(zpub);
      w.init();
      w.setMasterFingerprintFromHex(fp);
      assert.strictEqual(w.getMasterFingerprintHex(), fp);
      const { psbt } = w.createTransaction(
        [{ value: 100000, address: w._getExternalAddressByIndex(0), vout: 0, txid: '11'.repeat(32) }],
        [{ address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', value: 5000 }],
        1,
        w._getInternalAddressByIndex(0),
      );
      assert.strictEqual(uint8ArrayToHex(psbt.data.inputs[0].bip32Derivation[0].masterFingerprint), fp);
    }
  });

  it('editing the path to m/86 does not make a non-taproot wallet export as a tr() descriptor', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    w.init();
    const addressBefore = w._getExternalAddressByIndex(0);
    w.setDerivationPath("m/86'/0'/0'");
    w.init();

    // still a bech32 wallet, so export must show the bare zpub, not a descriptor
    assert.ok(!(w._hdWalletInstance instanceof HDTaprootWallet));
    assert.strictEqual(w.segwitType, 'p2wpkh');
    assert.strictEqual(w.getSecretForExport(), w.getSecret());

    // and what it exports restores the same wallet
    const restored = new WatchOnlyWallet();
    restored.setSecret(w.getSecretForExport());
    restored.init();
    assert.strictEqual(restored._getExternalAddressByIndex(0), addressBefore);
  });

  it('taproot watch-only exports a tr() descriptor that restores the same wallet, even after a path edit', () => {
    const descriptor =
      "tr([97311f91/86'/0'/0']xpub6C85eQDGy5NKEqCPnrnf4QcvxQCzRiTZFTa6YfuDU1hSQGWQHf6QBHogKXaS8hUhtvk6ND4btTdiWic26UKrk1pWrU4CQGrQoGxd6DP33Sw)";
    const w = new WatchOnlyWallet();
    w.setSecret(descriptor);
    w.init();
    assert.strictEqual(w.segwitType, 'p2tr');
    const addressBefore = w._getExternalAddressByIndex(0);
    assert.ok(addressBefore.startsWith('bc1p'));

    // the secret is stored as a bare xpub, which is why export must rebuild the descriptor
    assert.ok(w.getSecret().startsWith('xpub'));

    const exported = w.getSecretForExport();
    assert.strictEqual(exported, `tr([97311f91/86'/0'/0']${w.getSecret()})`);
    const restored = new WatchOnlyWallet();
    restored.setSecret(exported);
    restored.init();
    assert.strictEqual(restored._getExternalAddressByIndex(0), addressBefore);
    assert.strictEqual(restored.getDerivationPath(), "m/86'/0'/0'");
    assert.strictEqual(restored.getMasterFingerprintHex(), '97311f91');

    // a path edit must not stop the wallet exporting as taproot
    w.setDerivationPath("m/0'");
    assert.ok(w._hdWalletInstance instanceof HDTaprootWallet);
    const exported2 = w.getSecretForExport();
    assert.strictEqual(exported2, `tr([97311f91/0']${w.getSecret()})`);
    const restored2 = new WatchOnlyWallet();
    restored2.setSecret(exported2);
    restored2.init();
    assert.strictEqual(restored2._getExternalAddressByIndex(0), addressBefore);
    assert.strictEqual(restored2.getDerivationPath(), "m/0'");
  });
});

describe('BC-UR', () => {
  it('v1: can decodeUR() and then combine unfinalized signed PSBT', () => {
    const unsignedPayload = decodeUR([
      'UR:BYTES/TYQ4XURNVF607QGQWYPQQQQQQ9U63JU4AD5C93Y057WNRNTV24AE8QK4DDHVT04GHTKNQZCXYHNW5QGQQQQQPLHLLLLS9LRRQQQQQQQQQQTQQ9P9YMAAVV5GVUNKD49W4GDNJ4C9GJP7383QFCQQQQQQQQQPVQQ5CXKNG9PNTGMDRV0GNWNJZS23KGG3V0KXQQQQQQQQQYQ375XRQQQQQQQQQQTQQ98UXJHTKAHE83Q8W5VGHH2G93698VZLP6PZQCPXW47RAFD36W04SNHNTZK8CLCWHXDJJRRZ2EP998STFNRYWFQPC0CC3N8X87Z5QQQGQQQQQZQQQQQQSQQQQQQQQQQQQQQQYGPQY5M4J23F3Z9TK6HZTRDD6M89QX955DEH3HXGXAC6NJQMT3CHYTJHRZXVUCLC2SQQPQQQQQQGQQQQQZQQZQQQQQQQQQQQQQ3QYQK6E2MCA75ZCRMMWZYWXNQKGKNNJC7JUXPNWR5QPYQC3EYRM4NDQ5VGENNRLP2QQQYQQQQQPQQQQQQGQQQQQQQQZQQQQQQQ6GYX3G',
    ]);
    const uPsbtB64 = Buffer.from(unsignedPayload, 'hex').toString('base64');

    const payloadSignedButNotFinalized = decodeUR([
      'UR:BYTES/TR58QUMZWNLSZQR3QGQQQQQP0X5VH90TDXPVFRA8N5CU6MZ40WFC94TTDMZMA296A5CQKP39UM4QZQQQQQQ0ALLLLUP0CCCQQQQQQQQQZCQPGFFXL0TR9ZR8YANDFT42RVU4WP2YS05FUGZWQQQQQQQQQQTQQ9XP456PGV66XMGMR6YM5US5Z5DJZYTRA3SQQQQQQQPZQGPXW47RAFD36W04SNHNTZK8CLCWHXDJJRRZ2EP998STFNRYWFQPC068XPZQYGRH45ESDZ623KSNPTY2VJ37LWA2HTCCLGSDWPDDEPK48JAKNSVZTQPZQD0W5ND2M7D62YYQ74A85DRKM8ESQS2WSTZ5F4V2YNNGY9S7F0NSQYQQQQQ7VRJ5Z',
    ]);
    const sPsbtB64 = Buffer.from(payloadSignedButNotFinalized, 'hex').toString('base64');

    const w = new WatchOnlyWallet();
    w.setSecret('zpub6s2RJ9qAEBW8Abhojs6LyDzF7gttcDr6EsR3Umu2aptZBb45e734rGtt4KqsCMmNyR1EEzUU2ugdVYez2VywQvAbBjUSKn8ho4Zk2c5otkk');
    w.init();

    const tx = w.combinePsbt(uPsbtB64, sPsbtB64);
    assert.strictEqual(
      tx.toHex(),
      '0200000000010179a8cb95eb6982c48fa79d31cd6c557b9382d56b6ec5bea8baed300b0625e6ea0100000000feffffff02fc630000000000001600142526fbd63288672766d4aeaa1b3957054483e89e204e000000000000160014c1ad3414335a36d1b1e89ba7214151b211163ec602473044022077ad33068b4a8da130ac8a64a3efbbaabaf18fa20d705adc86d53cbb69c18258022035eea4daadf9ba51080f57a7a3476d9f300414e82c544d58a24e682161e4be700121026757c3ea5b1d39f584ef358ac7c7f0eb99b290c625642529e0b4cc6472401c3f00000000',
    );
  });

  it('v1: decodeUR() txt works', () => {
    const txtFileFormatMultisigNativeSegwit =
      'UR:BYTES/TYQHKGEQGDHKYM6KV96KCAPQF46KCARFWD5KWGRNV4682UPQVE5KCEFQ9P3HYETPW3JKGGR0DCSYGVEHG4Q5GWPC9Y9ZXZJWV9KK2W3QGDT97VENGG65YWF3G90NYTFJPFGX7MRFVDUN5GPJYPHKVGPJPFZX2UNFWESHG6T0DCAZQMF0XSUZWTESYUHNQFE0XGNS53N0WFKKZAP6YPGRY46NFQ9Q53PNXAZ5Z3PC8QAZQKNSW43RWDRFDFCXV6Z92F9YU6NGGD94S5NNWP2XGNZ22C6K2M69D4F4YKNYFPC5GANS8944VARY2EZHJ62CDVMHQKRC2F3XVKN629M8X3ZXWPNYGJZ9FPT8G4NS0Q6YG73EG3R42468DCE9S6E40FRN2AF5X4G4GNTNT9FNYAN2DA5YU5G2XYMRS3ZYXCCRXW3QTFC82C3HX4K5Z3FCG448J7ZN0FHHJ5RDGAHXGD29XEXHJ3PHG9XYWNNWV3E824MKX5E8SUR6D9K4552TW44HWAJ9VEV9GJR3D4YRSMNZVF3NVCMR2Q6HGVNPF5EK6AMNXDCYKK2NDE9HQJ6DF4UHGERZFEZ453J40P9H57N5T9RY6WZSDC9QWZ5LU2';
    const rez = decodeUR([txtFileFormatMultisigNativeSegwit]);
    const b = Buffer.from(rez, 'hex');
    assert.strictEqual(
      b.toString('ascii'),
      "# CoboVault Multisig setup file (created on D37EAD88)\n#\nName: CV_33B5B91A_2-2\nPolicy: 2 of 2\nDerivation: m/48'/0'/0'/2'\nFormat: P2WSH\n\nD37EAD88: Zpub74ijpfhERJNjhCKXRspTdLJV5eoEmSRZdHqDvp9kVtdVEyiXk7pXxRbfZzQvsDFpfDHEHVtVpx4Dz9DGUWGn2Xk5zG5u45QTMsYS2vjohNQ\n168DD603: Zpub75mAE8EjyxSzoyPmGnd5E6MyD7ALGNndruWv52xpzimZQKukwvEfXTHqmH8nbbc6ccP5t2aM3mws3pKYSnKpKMMytdbNEZFUxKzztYFM8Pn\n",
    );
  });

  it('v2: decodeUR() crypto-account works', () => {
    const payload =
      'UR:CRYPTO-ACCOUNT/OEADCYADWMTNKIAOLYTAADMWTAADDLOSAOWKAXHDCLAXMDRPFXWKHPTPNEWEVAWKYNFPJEDEMNJKAEGHCFQZLKUOTPLRIHMEFRTECWGRVWWDAAHDCXMHIODYPYLEAXZOGRPKEYPTBGBWGWDWHPZEIMVDBAAOIEVEWLZEGRBKRNFTHFAMMOAHTAADEHOEADADAOAEAMTAADDYOTADLNCSGHYKAEYKAEYKAOCYADWMTNKIAXAXATTAADDYOEADLRAEWKLAWKAXAEAYCYBGHFLOPACMIOWZLB';

    const [index, total] = extractSingleWorkload(payload);
    assert.strictEqual(index, 1);
    assert.strictEqual(total, 1);

    const decoded = decodeUR([payload]);

    assert.strictEqual(
      Buffer.from(decoded, 'hex').toString('ascii'),
      '{"ExtPubKey":"zpub6qT7amLcp2exr4mU4AhXZMjD9CFkopECVhUxc9LHW8pNsJG2B9ogs5sFbGZpxEeT5TBjLmc7EFYgZA9EeWEM1xkJMFLefzZc8eigRFhKB8Q","MasterFingerprint":"01EBDA7D","AccountKeyPath":"m/84\'/0\'/0\'"}',
    );

    const w = new WatchOnlyWallet();
    w.setSecret(Buffer.from(decoded, 'hex').toString('ascii'));
    w.init();
    assert.strictEqual(w.getDerivationPath(), "m/84'/0'/0'");
  });

  it('v2: can decodeUR() PSBT', () => {
    const payload = decodeUR([
      'UR:CRYPTO-PSBT/HKADGSJOJKIDJYZMADAEJYAOAEAEAEADWKMTGWJPPFGMCKJLKPNDNDBWAHBEAXCNFHPKRHUTPMGTBAFNWEBTLBECKENNBDJKADAEAEAEAEZMZMZMZMAONBLNADAEAEAEAEAECFKOPTBBCFBGNTGUVAEHNDPECFUYNBHKRNPMCMJNYTBKROYKLOPSVOHTADAEAEAEAEAECMAEBBWEWETAYKBETTTDISVDGYTTGMEHLSDMASFYPSPYDRAEAEAEAEAEADADCTLNZMAOAEAEAEAEAECMAEBBJYLSWNATMWIOEMHTPMFXCWMTGLZSTPVSCMWDLBKKADAYJEAOFLDYFYAOCXGYFNRKKPVYWFWEGLFZTYLDSFWNNEFGCTIMPEFHWMCWNNMTCHHTMYGRSOFRLODSAEAOCXKTKBHDNDCEFLMEBYOESETTIOAACHAXZMVWDNRDHEISHKETAMCHDSEOFXIYDECPHGADCLAOHSHHTYMTPAWKLNFYESCWNBKSWDVDNNYNMNCFLOFNTTWTNYFYNTHERORKDKQDWEGWAEAECPAOAXIHWEMNLPPDZTKSTEJLBNMOWFCSVYKNMNHKHFGDRNKELFRTSFCTSRZSSGJZAXRNHYCSADWMTNKIGHAEAELAAEAEAELAAEAEAELAADAEAEAELNAEAEAEAESSAOMKSP',
    ]);

    const uPsbtB64 = Buffer.from(payload, 'hex').toString('base64');

    const psbtTx = Psbt.fromBase64(uPsbtB64);
    assert.strictEqual(
      psbtTx.extractTransaction().toHex(),
      '02000000000101f4964f72b0521e6f759b9b13051003233faab9ddad4d0e3ced0d7f357c9e0b730100000000ffffffff02a0860100000000001976a91419129d53e6319baf19dba059bead166df90ab8f588ace25a010000000000160014ededd9f510d1d268e751d15231832e0944acab2a024730440220513cbb75e1f3ed4e40d489ccf19f461f6aaf3feb1b9e96175a8f4bc93b8826000220777e589b1c479111a2c1d167041703ffe52bba5f685938061726334366282257012102615cd496b1f48644391ba078eae79ef68e19883cd1f09a449d5fb8bb24b3ed4f00000000',
    );

    // now, full psbt tx via parts:
    const decoder = new BlueURDecoder();
    decoder.receivePart(
      'UR:CRYPTO-PSBT/33-2/LPCSCLAOCFAOIOCYCSKEMSHLHKADEEFZZEMETDFRIEAEAXFPTACLNTMTTKGRAXKTKGUOFPMOGWCWIYMEKKVDVONETLPRKGBSONGAKKEMCNGALGOXBDFTLSJLHERNWKINJPADAYJEZCROTKRKGHJPFEAMSRJNJLMYETDSGYWFBSSNPFUTPFDIJOCYWZFLZENSKOYNSOVLVSPTVTHFPKTAAOCXCPFYMKKPKPBEGLMSCMDNVSPYJNTNLKGTFMZMRSFWSNZEPYVTWFPTQDDTPERPPSLREEHLNSKNLOENSTFYFDTSSOFZNEIAVYTDISWEOTUYHLFMGWOLCNMSTKZSFLNSPFKTWSDNECCFTNOYFGETGMBBJNYTBKROYKNNPSBBJYLSWNATMDIYDEGLTYFWCWMTGLZSTPZECMZEGADMNNLDDWREFSZTGHLOOSYTEMIEWKBWHKHHNTCPGHBNMELSLGBAPDGELAHYSBWLAMYNCSFRNLFRKPMWFNUEKSAEURNNLYPLPMLTVWVDDKBTVWBWLDJKYKWPCTJZIEEHSANYMHZMNDZEDYCWBZDPKBGSBARKIMAYFLGYIMCFLSMKENPEEOPSRFWSJKINLFYLPECYQZZCLBLSKOHLHGJZRHRYVTLOGLCMHGHLPAHNWYMULS',
    );
    decoder.receivePart(
      'UR:CRYPTO-PSBT/47-2/LPCSDLAOCFAOIOCYCSKEMSHLHKADEEFZZEMETDFRIEAEAXFPTACLNTMTTKGRAXKTKGUOFPMOGWCWIYMEKKVDVONETLPRKGBSONGAKKEMCNGALGOXBDFTLSJLHERNWKINJPADAYJEZCROTKRKGHJPFEAMSRJNJLMYETDSGYWFBSSNPFUTPFDIJOCYWZFLZENSKOYNSOVLVSPTVTHFPKTAAOCXCPFYMKKPKPBEGLMSCMDNVSPYJNTNLKGTFMZMRSFWSNZEPYVTWFPTQDDTPERPPSLREEHLNSKNLOENSTFYFDTSSOFZNEIAVYTDISWEOTUYHLFMGWOLCNMSTKZSFLNSPFKTWSDNECCFTNOYFGETGMBBJNYTBKROYKNNPSBBJYLSWNATMDIYDEGLTYFWCWMTGLZSTPZECMZEGADMNNLDDWREFSZTGHLOOSYTEMIEWKBWHKHHNTCPGHBNMELSLGBAPDGELAHYSBWLAMYNCSFRNLFRKPMWFNUEKSAEURNNLYPLPMLTVWVDDKBTVWBWLDJKYKWPCTJZIEEHSANYMHZMNDZEDYCWBZDPKBGSBARKIMAYFLGYIMCFLSMKENPEEOPSRFWSJKINLFYLPECYQZZCLBLSKOHLHGJZRHRYVTLOGLCMHGHLPAYKAOHEGU',
    );
    decoder.receivePart(
      'UR:CRYPTO-PSBT/73-2/LPCSGAAOCFAOIOCYCSKEMSHLHKADEEFZZEMETDFRIEAEAXFPTACLNTMTTKGRAXKTKGUOFPMOGWCWIYMEKKVDVONETLPRKGBSONGAKKEMCNGALGOXBDFTLSJLHERNWKINJPADAYJEZCROTKRKGHJPFEAMSRJNJLMYETDSGYWFBSSNPFUTPFDIJOCYWZFLZENSKOYNSOVLVSPTVTHFPKTAAOCXCPFYMKKPKPBEGLMSCMDNVSPYJNTNLKGTFMZMRSFWSNZEPYVTWFPTQDDTPERPPSLREEHLNSKNLOENSTFYFDTSSOFZNEIAVYTDISWEOTUYHLFMGWOLCNMSTKZSFLNSPFKTWSDNECCFTNOYFGETGMBBJNYTBKROYKNNPSBBJYLSWNATMDIYDEGLTYFWCWMTGLZSTPZECMZEGADMNNLDDWREFSZTGHLOOSYTEMIEWKBWHKHHNTCPGHBNMELSLGBAPDGELAHYSBWLAMYNCSFRNLFRKPMWFNUEKSAEURNNLYPLPMLTVWVDDKBTVWBWLDJKYKWPCTJZIEEHSANYMHZMNDZEDYCWBZDPKBGSBARKIMAYFLGYIMCFLSMKENPEEOPSRFWSJKINLFYLPECYQZZCLBLSKOHLHGJZRHRYVTLOGLCMHGHLPASAVWCXNE',
    );
    decoder.receivePart(
      'UR:CRYPTO-PSBT/75-2/LPCSGRAOCFAOIOCYCSKEMSHLHKADEECFZTYKOEFDAMJYZTFZTALNNEMTTKGRAEADADCTCYWMAOAEAEAEAEAECMAEBBTYKNASSBGUVSCFDYOEUOWYDRKPSEJOUYMORPISJPADAYJEAOFLDYFYAOCXBYYKBYFMMTSPFYFZFYWESNHNEYSWGDWSIOBNHYBTGETNSBJOEYLNOSGUGOVOPYTAAOCXCPRKIOLELEVETPTPIENDRDREAOPECHTBDPZSPEFPWYSEADHKDMAAZEDIMUHPOYZOADCLAOJSZOEMSTFYFDTSENRSHNNSVTLNFGWDOTUYHLFMGWRSGOFMUYVLGOADVLMEUEPFNYAEADADCTLNZMAOAEAEAEAEAECMAEBBJYLSWNATMWIOEMHTPMFXCWMTGLZSTPVSCMWDLBKKADAYJEAOFLDYFYAOCXIYQZMEGUDAAXSOKNWMGOAAZSLYSGFMWPFDNBDPBDJEFSMSDLPFJSWMHLAXKNTDGEAOCXDKHEPTGMZMYACWCEDEJEEORHOYCAHYSRJTFYDSMHROFTDYPEFGZMRSRLJZBDAMONADCLAOHSHHTYMTPAWKLNFYESCWNBKSWDVDNNYNMNCFLOFNTTWTNYFYNTHERORKDKQDWEGWAEAEAEPDBAJSAH',
    );
    assert.strictEqual(decoder.estimatedPercentComplete(), 1);
    const psbt = Psbt.fromBase64(decoder.toString());
    assert.ok(psbt);
  });

  it('v2: can decodeUR() multipart bytes', () => {
    const decoder = new BlueURDecoder();
    decoder.receivePart(
      'UR:BYTES/246-2/LPCSYNAOCFADKECYCEBTIDBGHDRNGRISEEECIOEYFWFLGEFPGOKOFWKSFXGTKTKKHTKOEYEEGOJLECKNJPEEGRGRIAHKHKESEEEOFXFYGEGMGEJNETHSJNFDGOIHJOIOFPHFIEKPGOGOEYINKSGOJOGYESIYGYKNEHBKDYEHFEFWFYFPEMFYFTCXHTJOKPIDEMECENJYGDKSKSKTFDINHKJEHKINGHEHEYFLEYHGGOFYEYIAJOFPFDKKHFHGISIMKOGRGDIDHDJLHKECIMFYHTGUKKJLEMEHKKFLECFXEHEEGSFXKPKTISKKIAGHGHFPKNIOGHGOIAGYIYIEIEGMETFGFGGHGYEHIDGUHGGMENJEKNJNGLIDGTFEHSHFKNGOJPIMEEGSISKSIDJLJTIMJLBKCFCFRYME',
    );
    decoder.receivePart(
      'UR:BYTES/243-2/LPCSWFAOCFADKECYCEBTIDBGHDRNBGINGTCMFLKKDIFMESECFTCSDIHDBAETCWBTEOAHHPGUKPCEGDBAATFYJEDPBKECFNCFCEGDEHCLDNDSDLASCSBAAXISIHGHECDAAHCHGUEHKEHEBYIAENEECAEEAXFGCEBSHLKBHKFWDWDAIECHHFEHHFGHGDCXCYBAHYHFGWGLJOGEHDCSDMGAJEHSCABNDSHDFYDSFGFMFTDRAYFXCAJTKEFPJSKSHDGTHKKGKTGTIMFDGUJKAHENEMEYBTGOCHHSGRBEIYBDFRFMASKTEOFLDWFRGMIYJTHSCXCHCLEMGHIHCNDRCKCHJTCTATDKFRHKGYASENDRGWCFAYGHAABGAXFHFRCHFMADDYDYKPDNCWBKHPCEBDAODIJTBBFGRHFH',
    );
    decoder.receivePart(
      'UR:BYTES/240-2/LPCSWTAOCFADKECYCEBTIDBGHDRNHKADKKCNCXGRIHKKJKJYJLJTIHCXGTKPJZJYINJKINIOCXJKIHJYKPJOCXIYINJZIHCXDEIAJPIHHSJYIHIECXJLJTCXDYEHFEFWFYFPEMFYDTBKCNBKGLHSJNIHFTCXGTKPJZJYINJKINIOCXHFHSKPJZJYBKGDJLJZINIAKKFTCXEYCXJLIYCXEYBKFYIHJPINKOHSJYINJLJTFTCXJNDLEEETDIDLDYDIDLDYDIDLEYDIBKFGJLJPJNHSJYFTCXGDEYHGGUFDBKBKFEEEFGDYFYFWEHEYFTCXHTJOKPIDEMEEFEGLKNFEHFHKFPJOIMISEOHTHSKSKKJPJPESGEJOGLKNHTFPFYGHFWHTFPIOJKJPESJKIHISFDIEIYENASAX',
    );
    decoder.receivePart(
      'UR:BYTES/238-2/LPCSWYAOCFADKECYCEBTIDBGHDRNGRISEEECIOEYFWFLGEFPGOKOFWKSFXGTKTKKHTKOEYEEGOJLECKNJPEEGRGRIAHKHKESEEEOFXFYGEGMGEJNETHSJNFDGOIHJOIOFPHFIEKPGOGOEYINKSGOJOGYESIYGYKNEHBKDYEHFEFWFYFPEMFYFTCXHTJOKPIDEMECENJYGDKSKSKTFDINHKJEHKINGHEHEYFLEYHGGOFYEYIAJOFPFDKKHFHGISIMKOGRGDIDHDJLHKECIMFYHTGUKKJLEMEHKKFLECFXEHEEGSFXKPKTISKKIAGHGHFPKNIOGHGOIAGYIYIEIEGMETFGFGGHGYEHIDGUHGGMENJEKNJNGLIDGTFEHSHFKNGOJPIMEEGSISKSIDJLJTIMJLBKNYBTOSBE',
    );
    decoder.receivePart(
      'UR:BYTES/235-2/LPCSWMAOCFADKECYCEBTIDBGHDRNHKADKKCNCXGRIHKKJKJYJLJTIHCXGTKPJZJYINJKINIOCXJKIHJYKPJOCXIYINJZIHCXDEIAJPIHHSJYIHIECXJLJTCXDYEHFEFWFYFPEMFYDTBKCNBKGLHSJNIHFTCXGTKPJZJYINJKINIOCXHFHSKPJZJYBKGDJLJZINIAKKFTCXEYCXJLIYCXEYBKFYIHJPINKOHSJYINJLJTFTCXJNDLEEETDIDLDYDIDLDYDIDLEYDIBKFGJLJPJNHSJYFTCXGDEYHGGUFDBKBKFEEEFGDYFYFWEHEYFTCXHTJOKPIDEMEEFEGLKNFEHFHKFPJOIMISEOHTHSKSKKJPJPESGEJOGLKNHTFPFYGHFWHTFPIOJKJPESJKIHISFDIETODMPFCY',
    );
    decoder.receivePart(
      'UR:BYTES/224-2/LPCSVTAOCFADKECYCEBTIDBGHDRNBGINGTCMFLKKDIFMESECFTCSDIHDBAETCWBTEOAHHPGUKPCEGDBAATFYJEDPBKECFNCFCEGDEHCLDNDSDLASCSBAAXISIHGHECDAAHCHGUEHKEHEBYIAENEECAEEAXFGCEBSHLKBHKFWDWDAIECHHFEHHFGHGDCXCYBAHYHFGWGLJOGEHDCSDMGAJEHSCABNDSHDFYDSFGFMFTDRAYFXCAJTKEFPJSKSHDGTHKKGKTGTIMFDGUJKAHENEMEYBTGOCHHSGRBEIYBDFRFMASKTEOFLDWFRGMIYJTHSCXCHCLEMGHIHCNDRCKCHJTCTATDKFRHKGYASENDRGWCFAYGHAABGAXFHFRCHFMADDYDYKPDNCWBKHPCEBDAODIJTSAPMYNHK',
    );
    assert.strictEqual(decoder.estimatedPercentComplete(), 1);
    const str = decoder.toString();

    assert.ok(str.includes('E4F0DB12'));
    assert.ok(str.includes('Keystone Multisig setup file'));
  });

  it('v2: can decodeUR() into accounts', () => {
    const decoder = new BlueURDecoder();
    decoder.receivePart(
      'UR:CRYPTO-ACCOUNT/OEADCYJKSKTNBKAOLSTAADMWTAADDLONAXHDCLAOJOKNIDZCPSSAJTPTRPFRCECFKKAMYKJTVTCSBTBDTKCFIYVYOETNEEYKWFNBNYNDAAHDCXGEGUNBPYCLRHUOMDLNNSGLMOOYHSCFGLAXRTWSFHYKADGESWMOWKEOSSKOGHMHZTAMTAADDYOTADLNCSGHYKAEYKAEYKAOCYJKSKTNBKAXAXATTAADDYOYADLRAEWKLAWKAYCYKBWFDNUYTAADMHTAADMWTAADDLONAXHDCLAOWNWFFLLDCWCXYLHFMNPLFMSOLNNERSRPKGSGRPWFHDEYJLBEWPSSCNHFRYGOMUNTAAHDCXJTPKVLIHPLBABKBKPYLREYHHZEKETSJZFRMHMHECYALDVDTEWNROFLPTNBKKKBSBAMTAADDYOTADLNCSEHYKAEYKAEYKAOCYJKSKTNBKAXAXATTAADDYOYADLRAEWKLAWKAYCYFSAHZMKPTAADMUTAADDLONAXHDCLAXKTGSMEBSTKATZSMTLOJTOSMWWTTLSGWENYZEDYQZGRLSYLVOBWRKMOMUBAKIWKRYAAHDCXFSOXRFCFBKDSLABYCAEHZSURUOMHHEDRLBJZVDKEJLBENLCFBYJLDAFSFXFYGMCFAMTAADDYOTADLNCSDWYKAEYKAEYKAOCYJKSKTNBKAXAXATTAADDYOYADLRAEWKLAWKAYCYBZHPSGHKSOPAJSLN',
    );
    let data = '';
    if (decoder.isComplete()) {
      data = decoder.toString();
    }

    const json = JSON.parse(data);

    assert.ok(Array.isArray(json));
    assert.strictEqual(json.length, 3);

    assert.ok(json[0].ExtPubKey.startsWith('zpub'));
    assert.ok(json[0].AccountKeyPath.startsWith('m/84'));
    assert.ok(json[0].MasterFingerprint === '73C5DA0A');

    assert.ok(json[1].ExtPubKey.startsWith('ypub'));
    assert.ok(json[1].AccountKeyPath.startsWith('m/49'));
    assert.ok(json[1].MasterFingerprint === '73C5DA0A');

    assert.ok(json[2].ExtPubKey.startsWith('xpub'));
    assert.ok(json[2].AccountKeyPath.startsWith('m/44'));
    assert.ok(json[2].MasterFingerprint === '73C5DA0A');
  });

  it('v1: decodeUR() works', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // sleep
    // sleep is needed because in test envirnment setUseURv1() and init function have a race condition
    await setUseURv1();
    const txt = 'hello world';
    const b = Buffer.from(txt, 'ascii');
    let fragments = encodeUR(b.toString('hex'), 666);
    assert.deepStrictEqual(fragments, ['ur:bytes/fd5x2mrvdus8wmmjd3jqugwtl9']);
    assert.strictEqual(Buffer.from(decodeUR(fragments), 'hex').toString('ascii'), txt);

    fragments = encodeUR(b.toString('hex'), 10);
    assert.deepStrictEqual(fragments, [
      'ur:bytes/1of3/fc38n9ue84vu8ra8ue6cdnrghws0dwep4f46q4rlrgdncwsg49lsw38e6m/fd5x2mrvdu',
      'ur:bytes/2of3/fc38n9ue84vu8ra8ue6cdnrghws0dwep4f46q4rlrgdncwsg49lsw38e6m/s8wmmjd3jq',
      'ur:bytes/3of3/fc38n9ue84vu8ra8ue6cdnrghws0dwep4f46q4rlrgdncwsg49lsw38e6m/ugwtl9',
    ]);
    assert.strictEqual(Buffer.from(decodeUR(fragments), 'hex').toString('ascii'), txt);
  });

  it('v2: decodeUR() bytes works', () => {
    const payload =
      'UR:BYTES/HKADKNCNCXGRIHKKJKJYJLJTIHCXGTKPJZJYINJKINIOCXJKIHJYKPJOCXIYINJZIHCXDEIAJPIHHSJYIHIECXJLJTCXDYEHFEFWFYFPEMFYDTBKCNBKGLHSJNIHFTCXGRGHHEFGFPFPESDYFEFWENHEEYDPEYBKGDJLJZINIAKKFTCXEYCXJLIYCXEYBKFYIHJPINKOHSJYINJLJTFTCXJNDLEEETDIDLDYDIDLDYDIDLEYDIBKFGJLJPJNHSJYFTCXGDEYHGGUFDBKBKDYEHFEFWFYFPEMFYFTCXHTJOKPIDEMECENJYGDKSKSKTFDINHKJEHKINGHEHEYFLEYHGGOFYEYIAJOFPFDKKHFHGISIMKOGRGDIDHDJLHKECIMFYHTGUKKJLEMEHKKFLECFXEHEEGSFXKPKTISKKIAGHGHFPKNIOGHGOIAGYIYIEIEGMETFGFGGHGYEHIDGUHGGMENJEKNJNGLIDGTFEHSHFKNGOJPIMEEGSISKSIDJLJTIMJLBKESEMFXFWEHECEEEYFTCXHTJOKPIDEMECHFKPHKIYKTJPFXIMEYGLHDKTFGGSGMIEIDKKKOGDGDJNGDKOEMGMJYIHGYKTFGGTHDFDGEGTGDJKFYKPFXEMKOISKOIDHGJSJLJNFEIEEMETHKJOJLGRIEEMJEGRJEIAIAGHGHFXFPJNJNIDECHFJNHDFPEHESHSISEMIMHDGYINIOGRGOIHKSJEIHGSIHKPGRIMKTJYFDKKENECJLBKYLYAHNRS';
    const result = Buffer.from(decodeUR([payload]), 'hex').toString();
    assert.ok(result.includes('Keystone Multisig setup file'));
  });

  it('v2: encodeUR() psbt works', async () => {
    await clearUseURv1();
    const psbtHex =
      '70736274ff01009a020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff838d0427d0ec650a68aa46bb0b098aea4422c071b2ca78352a077959d07cea1d0100000000ffffffff0270aaf00800000000160014d85c2b71d0060b09c9886aeb815e50991dda124d00e1f5050000000016001400aea9a2e5f0f876a588df5546e8742d1d87008f000000000000000000';

    const fragments = encodeUR(psbtHex, 100);
    assert.strictEqual(fragments.length, 2);
    assert.deepStrictEqual(fragments, [
      'ur:crypto-psbt/1-2/lpadaocsptcybkgdcarhhdgohdosjojkidjyzmadaenyaoaeaeaeaohdvsknclrejnpebncnrnmnjojofejzeojlkerdonspkpkkdkykfelokgprpyutkpaeaeaeaeaezmzmzmzmlslgaaditiwpihbkispkfgrkbdaslewdfycprtjsprsgksecdratkkhktimndacnch',
      'ur:crypto-psbt/2-2/lpaoaocsptcybkgdcarhhdgokewdcaadaeaeaeaezmzmzmzmaojopkwtayaeaeaeaecmaebbtphhdnjstiambdassoloimwmlyhygdnlcatnbggtaevyykahaeaeaeaecmaebbaeplptoevwwtyakoonlourgofgvsjydpcaltaemyaeaeaeaeaeaeaeaeaeaeswhhtptt',
    ]);
  });

  it('v2: encodeUR() psbt works BBQR', async () => {
    await clearUseURv1();
    const psbtHex =
      '70736274ff01009a020000000258e87a21b56daf0c23be8e7070456c336f7cbaa5c8757924f545887bb2abdd750000000000ffffffff838d0427d0ec650a68aa46bb0b098aea4422c071b2ca78352a077959d07cea1d0100000000ffffffff0270aaf00800000000160014d85c2b71d0060b09c9886aeb815e50991dda124d00e1f5050000000016001400aea9a2e5f0f876a588df5546e8742d1d87008f000000000000000000';

    const fragments = encodeUR(psbtHex, 100, null, 'BBQR');
    assert.strictEqual(fragments.length, 2);
    assert.deepStrictEqual(fragments, [
      'B$ZP0200FMUE4KXZZ7EDBC4JQGAYCKPCIWK6FVW46U6MV672BIFFY44M6NVXMLJ5KFNKT4WVWWRXVU7KXOSQYIHQD4EJU62Z2QX3YSPFZJMOLNU3TOZ6XFML2KA4ETNHFJGLLWBLEMX5JPESMWCCSZBK',
      'B$ZP0201LD2YCA6ECFRRBOIRUNOXRAMNTPZWIR6W5PDLRAEZWK3YI7AZDZ7GLBKKGOWFXOPI5GDR6ZKLHPXIPOV5FDIZK3LH5BTYAAIA',
    ]);
  });

  it('v1: extractSingleWorkload() works', () => {
    const [index, total] = extractSingleWorkload('ur:bytes/2of3/fc38n9ue84vu8ra8ue6cdnrghws0dwep4f46q4rlrgdncwsg49lsw38e6m/s8wmmjd3jq');
    assert.strictEqual(index, 2);
    assert.strictEqual(total, 3);
  });
});
