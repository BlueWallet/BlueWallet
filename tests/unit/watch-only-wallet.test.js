import { WatchOnlyWallet } from '../../class';
import { decodeUR, encodeUR, setUseURv1, clearUseURv1, extractSingleWorkload, BlueURDecoder } from '../../blue_modules/ur';
import { Psbt } from 'bitcoinjs-lib';
const assert = require('assert');

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
      assert.strictEqual(w.getMasterFingerprint(), false);
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

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAFUCAAAAAZaLfDcOPs2Jk1UefwZZOzPCdTJF+ugLOsYZYagnIEPQAQAAAAAAAACAASgDAAAAAAAAGXapFP6ZRvxlaU5S/9HQFr1i2lsgp58AiKwAAAAAAAEA4gEAAAABtjCsNkoEuDVImU3tRwW5gxay0f4Yuf/6Jie+nu8Rv2AAAAAAa0gwRQIhAJbmjZTTdOOmiO0uZgUon4EXJUCrqrX2zEMcIxkZhgdGAiB17k5kyGftnTadAamzXYsWiaghvo1yn/9/s9/MddFvZAEhAoHS5AumQi/Je2H9VkO+6D3XSdg2kzntx5XXs/AOlsaB/f///wLvAgAAAAAAABl2qRTkJx756aA6ibmBxz09aTbS9vzMBois6AMAAAAAAAAZdqkUEgrXhUFSkB6+smmsts7yDnGzz1mIrOoZCAAiBgPGm5BfckKzaIEi8GlRM5oe4A2mUvbsxlJ+pmMhRsrOYhgAAAAALAAAgAAAAIAAAACAAAAAAAAAAAAAAA==',
    );
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
        txId: '7f3b9e032a84413d7a5027b0d020f8acf80ad28f68b5bce8fa8ac357248c5b80',
        vout: 0,
      },
    ];
    // hardcoding utxo so we wont have to call w.fetchUtxo() and w.getUtxo()

    const { psbt } = await w.createTransaction(
      utxos,
      [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 5000 }],
      1,
      changeAddress,
    );

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
        txId: '5df595dc09ee7a5c245b34ea519288137ffee731629c4ff322a6de4f72c06222',
        vout: 0,
        txid: '5df595dc09ee7a5c245b34ea519288137ffee731629c4ff322a6de4f72c06222',
        amount: 66600,
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
        txId: '5df595dc09ee7a5c245b34ea519288137ffee731629c4ff322a6de4f72c06222',
        vout: 0,
        txid: '5df595dc09ee7a5c245b34ea519288137ffee731629c4ff322a6de4f72c06222',
        amount: 66600,
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
        txId: 'b2ac59bc282083498d1e87805d89bef9d3f3bc216c1d2c4dfaa2e2911b547100',
        vout: 0,
        txid: 'b2ac59bc282083498d1e87805d89bef9d3f3bc216c1d2c4dfaa2e2911b547100',
        amount: 51432,
        wif: false,
        confirmations: 132402,
      },
    ];

    const changeAddress = '3DrZBgntD8kBBbuKLJtPVAeGT75BMC7NxU';

    const { psbt } = await w.createTransaction(
      utxos,
      [{ address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', value: 5000 }],
      1,
      changeAddress,
    );

    assert.strictEqual(
      psbt.data.outputs[1].bip32Derivation[0].pubkey.toString('hex'),
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
      psbt2.data.outputs[1].bip32Derivation[0].pubkey.toString('hex'),
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

  it('v1: extractSingleWorkload() works', () => {
    const [index, total] = extractSingleWorkload('ur:bytes/2of3/fc38n9ue84vu8ra8ue6cdnrghws0dwep4f46q4rlrgdncwsg49lsw38e6m/s8wmmjd3jq');
    assert.strictEqual(index, 2);
    assert.strictEqual(total, 3);
  });
});
