import assert from 'assert';
import { Psbt } from 'bitcoinjs-lib';

import { BlueURDecoder, clearUseURv1, decodeUR, encodeUR, extractSingleWorkload, setUseURv1 } from '../../blue_modules/ur';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
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
    w.setDerivationPath(newPath);
    assert.strictEqual(w.getDerivationPath(), newPath);

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

  // #8803: SeedSigner returns a trimmed PSBT (global tx + partial_sigs only). Fixtures below were
  // produced offline with embit (SeedSigner's signer) from abandon…about / BIP84; 22 inputs.
  it('combinePsbt accepts SeedSigner-trimmed multi-UTXO signed PSBT', () => {
    const w = new WatchOnlyWallet();
    w.setSecret(
      JSON.stringify({
        ExtPubKey: 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs',
        MasterFingerprint: '73C5DA0A',
        AccountKeyPath: "m/84'/0'/0'",
      }),
    );
    w.init();

    const unsignedPsbt =
      'cHNidP8BAP2vAwIAAAAWAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAAAAAAAAIACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgEAAAAAAAAAgAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAgAAAAAAAACABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQDAAAAAAAAAIAFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQAAAAAAAAAgAYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBQAAAAAAAACABwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcGAAAAAAAAAIAICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAcAAAAAAAAAgAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCAAAAAAAAACACgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoJAAAAAAAAAIALCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwoAAAAAAAAAgAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCwAAAAAAAACADQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0MAAAAAAAAAIAODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg0AAAAAAAAAgA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDgAAAAAAAACAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAPAAAAAAAAAIARERERERERERERERERERERERERERERERERERERERERERAAAAAAAAAAgBISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEQAAAAAAAACAExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMSAAAAAAAAAIAUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBMAAAAAAAAAgBUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFAAAAAAAAACAFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYW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';
    const trimmedSignedPsbt =
      'cHNidP8BAP2vAwIAAAAWAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAAAAAAAAIACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgEAAAAAAAAAgAMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAgAAAAAAAACABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQDAAAAAAAAAIAFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQAAAAAAAAAgAYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBQAAAAAAAACABwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcGAAAAAAAAAIAICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAcAAAAAAAAAgAkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCAAAAAAAAACACgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoJAAAAAAAAAIALCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwoAAAAAAAAAgAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCwAAAAAAAACADQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0MAAAAAAAAAIAODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg0AAAAAAAAAgA8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDgAAAAAAAACAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAPAAAAAAAAAIARERERERERERERERERERERERERERERERERERERERERERAAAAAAAAAAgBISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEQAAAAAAAACAExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMSAAAAAAAAAIAUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBMAAAAAAAAAgBUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFAAAAAAAAACAFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYW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';

    const tx = w.combinePsbt(unsignedPsbt, trimmedSignedPsbt);
    assert.strictEqual(tx.ins.length, 22);
    assert.strictEqual(
      tx.toHex(),
      '020000000001160101010101010101010101010101010101010101010101010101010101010101000000000000000080020202020202020202020202020202020202020202020202020202020202020201000000000000008003030303030303030303030303030303030303030303030303030303030303030200000000000000800404040404040404040404040404040404040404040404040404040404040404030000000000000080050505050505050505050505050505050505050505050505050505050505050504000000000000008006060606060606060606060606060606060606060606060606060606060606060500000000000000800707070707070707070707070707070707070707070707070707070707070707060000000000000080080808080808080808080808080808080808080808080808080808080808080807000000000000008009090909090909090909090909090909090909090909090909090909090909090800000000000000800a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0900000000000000800b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0a00000000000000800c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0b00000000000000800d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0d0c00000000000000800e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0d00000000000000800f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0e000000000000008010101010101010101010101010101010101010101010101010101010101010100f0000000000000080111111111111111111111111111111111111111111111111111111111111111110000000000000008012121212121212121212121212121212121212121212121212121212121212121100000000000000801313131313131313131313131313131313131313131313131313131313131313120000000000000080141414141414141414141414141414141414141414141414141414141414141413000000000000008015151515151515151515151515151515151515151515151515151515151515151400000000000000801616161616161616161616161616161616161616161616161616161616161616150000000000000080015c55030000000000160014e8df018c7e326cc253faac7e46cdc51e68542c4202473044022062d1003e240e3f49f66ab560d1c8d35ce158f89ab377319b9cdca45487738df502205ce4806d11a10a60447de35a3566b76d96f698b241803bf312b0c424dc515a7c01210330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c02473044022007f277309e7acd4eb350966bbb6adb4b956ffc054f2b721bb0455f11368fe77202204a677ac6a5bf8bcf963c820447503fa2626666e5d08d62725f5c7de657fd323b012103e775fd51f0dfb8cd865d9ff1cca2a158cf651fe997fdc9fee9c1d3b5e995ea7702473044022000cbfc6fdb24cad430d068fa246768edd344d09b12010f619678f6ae1f1594480220061b4b82800338a94c91f20504cff480503818b7a61e893e38ea8e9d99075c570121038ffea936b2df76bf31220ebd56a34b30c6b86f40d3bd92664e2f5f98488dddfa0247304402201b01e968949bac7c5b7ed3586e17a7a17cbcc2b4d57a4a6d2be6d44049d1f0ac022043b013e80a17749a9df4a64abef64b2821d301381be0a38f01d4a35bfe1d9d6c012103de7490bcca92a2fb57d782c3fd60548ce3a842cad6f3a8d4e76d1f2ff7fcdb890247304402206dc0b9d9577d3bb8d1f36651be88878d0bc1516277cf66fdafda7393579950ed02204cd9683873554519b84c8addc847b3f43b79ba7deab66aa681516ae82575bd8c012103995137c8eb3b223c904259e9b571a8939a0ec99b0717684c3936407ca8538c1b024730440220596014e9b5d8340ef4403fa0afcd9cc98a7e91fc2b729fbaa66335a6004dc89f022031dfd118346aa7491018419a38dc623fdb1a30e0b8253c58e74a4828c4d06c5101210284ae0efbe5cb35b24036d48d49d3c55a84fa75552bd162fc3a2a55e2997dd4590247304402200f81503068af11f55d870463628ae7bbf1adeeeff87cbbd68fe2f0f13712181a0220786d8efacfddddd3944c111fe127cafb390b7016fccc5c19ca30e39ac6f0061901210299b4cb4809f52dac21bbd8c997d8bf052cf4d68bfe966c638c312fbfff636e1702473044022059bc5bbf66c4a37ff3b49aa0ece9e04d470dd2d260eb425d2ced5a8d7f84d244022032427a5b8cd1b3ffa9621dfaba073757267396912c5fe2c0f62857c30d6a01cf01210275ceec11410ac8d730acd0f99e50a530e1c28b1cf89133ec5f798fb675bddc8e0247304402202b74f2a9121f0fc95bd3d63c3e1c58942a41799b0cb6d9395c04a111613db1db022071d33d80c8c3bdf8a500dd4afea59bbb9719b854497d42ae8436a0069fdb52c10121032099986cdbb0a76bd5e1aa88114dd1ee42373941e732dcb5605895ee35bc683f024730440220033ef397c1412eba381d3274106a320df67025733874e49adbac164241bf9ba50220684e6d113054c1824163872ff99621d31a3edcd33384608c7a65a640bd6a723001210249a46ee1ccc04b3ba244747d5be3f388865b6742b4f88073d574407ca0a91a800247304402201261f9469e2d8d1b92bd15d683786914d91a214ccd0fce27ed723fbb7f7f355302203d6adea4915d08a028240266cf02e4c8cdd379ede377f5f684765ad33fc2bdd9012102f472754ce00903b9916eef916aa21a98aa70aa026b51cd70a307a838c56a15ec02473044022055faab6056e23804689204b9d133ff31da5bb856be9259410aaa5f960c3191860220697cd8433ceef86c5595748413e7e03239cb281612ed6205468cc02e6b64a69301210226a07edd0227fa6bc36239c0bd4db83d5e488f8fb1eeb68f89a5be916aad2d600247304402202c1c319ebbbc5d3099c9f7e67d23ed25ba73cc74d403b70b3965bdfd14c129b502204cf28366196daa6ce3ee047454d4167150fc8858b498e6f7108d232909caf35a0121031c34a6bce9676e0b011c93bcf8a2d1007add7ce07f9a502a537f0fee56325944024730440220783bce21d57e2c0088e1bb2f21edbb8108ac79291eefd6e8f6cccf7fad32183a022049bae08ea51438085778133d1b51aab3840738238713f4ff6a1d7600135491a9012103f6b67175aab6f80dabb4fdaf71fb3d0e5a63b2da432963e7e9be02e74f387139024730440220521df4ee52e052bbff1b42c39a2f1f283e777c50b00a4f5d6d512f3bc4cf576a0220790d8cf6938ef465ad9dc9f23955f8589d5307de883f414034207bea1b84b3600121028c6433a7d168293d7e61238d52a200a60ed9cae7d685f7cae100619b6184f6fa024730440220257f9e2a1a36d0f3f2874404bcf4ef6c20558c1607fad86834ed57953fdd631e022012fb14567672caa8ef58caee5cdc74dd29e6da057afe12fffdc23765f1d6c9a7012102b05e67ab098575526f23a7c4f3b69449125604c34a9b34909def7432a792fbf60247304402205be1d3f3b6680ae320359b8cb2d6142ecf4040b5a2bd8de87d1af5e02d3c7147022010334d44108f5724e90ce0ac9159f8f6f575b07dba34b4631f77a6663edb5f24012103721ae11a20d7dc9cf374a5bf3062bb4f07d1055c68a15c873b74e54b1d7e30300247304402204db2d7210d8e52ca675dadff74b0e2b40a83eac2f069e08da375edf48119751c0220121ceb36753e5a215c4ff1718a9072d903431540ccf2d70bf133f9ebd2b7032101210390d1feb19684674564df87854f3892d9e8a7d3551148c2f299a75d262c950ee002473044022040165cd2f86a1c7880b6688dba6a0b1b1ad0db4485e873a01d0388231f118af8022028fdc7181fc85a58b6b3855da5e67b4d0efc469a335cb65f6b956f3b17ba2910012102d56ba8cc5cb6c4e3995c2b73e7bc934d2456299cd74cb311d1c8612b46add0540247304402206bd9f551ed7f132f937e52238f00bde792a1716597ad55f36123109172860e9d0220752f7dbbfe001f7137ef192c6198b27ab9841582f78885edfb20cd9c9760eb05012103fc8771c531b40e1202f91a779faf0a7955cebceb38bd18924163a99dafaaa64702473044022045b82bbeb350c82d72ef8c0a49ceeb4a0bf83e1e8b977e3de278f944a2e188770220092cec1eab6d2403d60e0bfe6c3bb51da2a72d92f3e6bddf83bb560d731313680121028583737eacb0324e62d1978340e4c5980f64cb58a51b19766e1a4bce4610963d0247304402204cf1f5ce69c18f68a90ee24cd01ba3806b267746a6b3432747fe01318a044da10220454c2022f122bfcf115a1607a9df73906f35c0ed695cf3947dfd06816df7359201210240d4a69611dd6e758516b29bb26e2b3dd159caa9fbe8a313b704ba8959826b6600000000',
    );
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
