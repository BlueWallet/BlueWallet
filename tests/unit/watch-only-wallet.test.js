import { WatchOnlyWallet } from '../../class';
import { decodeUR } from 'bc-ur/dist';
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
    }
  });

  it('can validate xpub', () => {
    const w = new WatchOnlyWallet();
    w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6DXDs4PJDk5QVL2G2xaVjv7SM4roWHr1gR4xB3Z7Ps');
    assert.ok(w.isXpubValid());
    w.setSecret('ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXrYjjXEzcPDX5VqnHEnuNf5VAXgLfSaytMkJ2rwVqy');
    assert.ok(w.isXpubValid());
    w.setSecret('zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP');
    assert.ok(w.isXpubValid());
    w.setSecret('xpub6CQdfC3v9gU86eaSn7AhUFcBVxiGhdtYxdC5Cw2vLmFkfth2KXCMmYcPpvZviA89X6D');
    assert.ok(!w.isXpubValid());
    w.setSecret('ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXr');
    assert.ok(!w.isXpubValid());
    w.setSecret('ypub6XRzrn3HB1tjhhvrHbk1vnXCecZEdXohGzCk3GXwwbDoJ3VBzZ34jNGWbC6WrS7idXr');
    assert.ok(!w.isXpubValid());
  });

  it('can create PSBT base64 without signature for HW wallet', async () => {
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
      'cHNidP8BAHECAAAAAYBbjCRXw4r66Ly1aI/SCvis+CDQsCdQej1BhCoDnjt/AAAAAAAAAACAAogTAAAAAAAAFgAUwM681sPTyox13F7GLr5VMw75EOK2OQAAAAAAABYAFOc6kh7rlKStRwwMvbaeu+oFvB4MAAAAAAABAR8gTgAAAAAAABYAFL8PIBBJ6JHVhwsE61MPwWtjtptAIgYDWOHbOE3D4KiuoR7kHtmTtFZ7KXQB+8zb51QALLJxTx8YAAAAAFQAAIAAAACAAAAAgAAAAAAAAAAAAAAiAgM005BVD8MgH5kiSGnwXSfzaxLeDSl3y17Vhrx3F/9XxBgAAAAAVAAAgAAAAIAAAACAAQAAAAAAAAAA',
    );
  });

  it('can import coldcard/electrum compatible JSON skeleton wallet, and create a tx with master fingerprint', async () => {
    const skeleton =
      '{"keystore": {"ckcc_xpub": "xpub661MyMwAqRbcGmUDQVKxmhEESB5xTk8hbsdTSV3Pmhm3HE9Fj3s45R9Y8LwyaQWjXXPytZjuhTKSyCBPeNrB1VVWQq1HCvjbEZ27k44oNmg", "xpub": "zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx", "label": "Coldcard Import 168DD603", "ckcc_xfp": 64392470, "type": "hardware", "hw_type": "coldcard", "derivation": "m/84\'/0\'/0\'"}, "wallet_type": "standard", "use_encryption": false, "seed_version": 17}';
    const w = new WatchOnlyWallet();
    w.setSecret(skeleton);
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx',
    );
    assert.strictEqual(w.getMasterFingerprint(), 64392470);
    assert.strictEqual(w.getMasterFingerprintHex(), '168dd603');

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
      'cHNidP8BAHECAAAAASJiwHJP3qYi80+cYjHn/n8TiJJR6jRbJFx67gnclfVdAAAAAAAAAACAAogTAAAAAAAAFgAUb3eWXdETtv7KGyXiUxyIS+Q3wJ003QAAAAAAABYAFF8XCHdkg2yGn81L+plhb9iWamgBAAAAAAABAR8oBAEAAAAAABYAFBAk4ma75DYqawitVrni8qlFzNykIgYDNK9TxoCjQ8P0+qI2Hu4hrnXnJuYAC3h2puZbgRORp+sYFo3WA1QAAIAAAACAAAAAgAAAAAAAAAAAAAAiAgL1DWeV+AfIP5RRB5zHv5vuXsIt8+rF9rrsji3FhQlhzBgWjdYDVAAAgAAAAIAAAACAAQAAAAAAAAAA',
    );
  });

  it('can import Electrum compatible backup wallet, and create a tx with master fingerprint', async () => {
    const skeleton =
      '{"addr_history":{"bc1q2jaqard66jw6l9h6xkfmr9lhfvxqmujwpzrcc3":[["59aa0eea3833c4ceb605c37e5e4f2dfcf30b1f381e263362684591347e931345",668857]],"bc1q2mghqtxmqhx5r3tl8f4ls54mstjh4t6gsut6p7":[],"bc1q2rvpxtsedfd4c7f2q8v0745aycpu08teq43gd0":[],"bc1q2zccw0mf0t3340hksy379k9p2f2y22z6txr5cf":[],"bc1q3r46dug4ayxqpdlh98wf4j9w8nuxu2s25pkqcp":[],"bc1q3vjcf40hpurace60zruzes4c8plqak40t8mws0":[],"bc1q4f3qqcas5893dj032pycnhjeyh3dcp9xt47uj9":[],"bc1q7365nq9fzlycrtk0226pzptjs856m9utxsvrmv":[],"bc1q8qkx38rlv0rnj5ncjtey0uyallvfgxwg0df0tq":[],"bc1q8qzr45yphgn97eupqpvp9pj8gv4prah9z2zztn":[],"bc1q94td9e2m4yj9ry7v5csreusx43fwzrza77eae7":[],"bc1qe04gtngw0d0cjkq0any838tjn33sr53tlxvsg4":[],"bc1qeaty2ddvr9avakrypxsje5kzk6pzj4x5yyhle5":[],"bc1qenh8p3xz7e978jz3rzhfcg0snj23kuddxhcrzj":[],"bc1qexh7mdq3ud0c4h5rwypysgm2htvjut8sp30lxv":[],"bc1qf2faweyjtr3y9rpax8yr2n6rf5g9kcvzwxerv7":[],"bc1qg06yf3jvfgtx4wc7wrh763p8jy3jsgnt2tkegl":[],"bc1qgs7eqljkg2ngu6s857quyjuwha0fdgy6hevsc3":[],"bc1qgw7xtp8mu4lr2kavdlhfqexj0ha2mjyfz5ceuf":[],"bc1qhtjfx7fpw2zka902dnuam2z7jpyyamaedkhf8h":[],"bc1qlaj23t7jqgw5ktxywthuaxjx60pzsfhqq74m69":[],"bc1qrdygemvvljqef40m7hdu68j9sm70wn4dcfw4l9":[],"bc1qsnq4qdwq70nl4949dnq38sp306duywk603un4a":[],"bc1qta4dyjsc40pqhrn9xcqr7unwlskd733r9dr3f4":[],"bc1qtl7dmlskk6gwmzkt39shh8leq7fslr2dn68h0j":[],"bc1qv8vee62rvhe784wlmwct2llv2euk9lutj0497j":[],"bc1qvmlvfgl5rd3r2ayqhfqfkkftqwye0zaql44y5a":[],"bc1qx22qha842r5jg8z40x86yj8ss5cxrpdfplpv4r":[],"bc1qx7kl0sy53tpd9jj9atfv0gn9nkzjg5ef7rz8s0":[],"bc1qz6je3l5nq5628v09upuqf4zf4dqe6j0tfhk6d4":[],"bc1qzam4mc3fx33mxfw9nyhjwk5fse0g87suuhwdh0":[]},"addresses":{"change":["bc1qf2faweyjtr3y9rpax8yr2n6rf5g9kcvzwxerv7","bc1qzam4mc3fx33mxfw9nyhjwk5fse0g87suuhwdh0","bc1q7365nq9fzlycrtk0226pzptjs856m9utxsvrmv","bc1q2mghqtxmqhx5r3tl8f4ls54mstjh4t6gsut6p7","bc1qe04gtngw0d0cjkq0any838tjn33sr53tlxvsg4","bc1qta4dyjsc40pqhrn9xcqr7unwlskd733r9dr3f4","bc1qvmlvfgl5rd3r2ayqhfqfkkftqwye0zaql44y5a","bc1qz6je3l5nq5628v09upuqf4zf4dqe6j0tfhk6d4","bc1q8qzr45yphgn97eupqpvp9pj8gv4prah9z2zztn","bc1qgw7xtp8mu4lr2kavdlhfqexj0ha2mjyfz5ceuf"],"receiving":["bc1q2jaqard66jw6l9h6xkfmr9lhfvxqmujwpzrcc3","bc1qv8vee62rvhe784wlmwct2llv2euk9lutj0497j","bc1q3vjcf40hpurace60zruzes4c8plqak40t8mws0","bc1q2zccw0mf0t3340hksy379k9p2f2y22z6txr5cf","bc1q94td9e2m4yj9ry7v5csreusx43fwzrza77eae7","bc1qexh7mdq3ud0c4h5rwypysgm2htvjut8sp30lxv","bc1qenh8p3xz7e978jz3rzhfcg0snj23kuddxhcrzj","bc1q8qkx38rlv0rnj5ncjtey0uyallvfgxwg0df0tq","bc1qhtjfx7fpw2zka902dnuam2z7jpyyamaedkhf8h","bc1qx22qha842r5jg8z40x86yj8ss5cxrpdfplpv4r","bc1qsnq4qdwq70nl4949dnq38sp306duywk603un4a","bc1qlaj23t7jqgw5ktxywthuaxjx60pzsfhqq74m69","bc1qgs7eqljkg2ngu6s857quyjuwha0fdgy6hevsc3","bc1qeaty2ddvr9avakrypxsje5kzk6pzj4x5yyhle5","bc1qtl7dmlskk6gwmzkt39shh8leq7fslr2dn68h0j","bc1qrdygemvvljqef40m7hdu68j9sm70wn4dcfw4l9","bc1qg06yf3jvfgtx4wc7wrh763p8jy3jsgnt2tkegl","bc1q3r46dug4ayxqpdlh98wf4j9w8nuxu2s25pkqcp","bc1qx7kl0sy53tpd9jj9atfv0gn9nkzjg5ef7rz8s0","bc1q2rvpxtsedfd4c7f2q8v0745aycpu08teq43gd0","bc1q4f3qqcas5893dj032pycnhjeyh3dcp9xt47uj9"]},"channel_backups":{},"channels":{},"fiat_value":{},"invoices":{},"keystore":{"ckcc_xpub":"xpub661MyMwAqRbcFG7osGX7Td2YTmiPEoizenPoxSRQKhirBamV4V8gpSsh8raBSkwPNyVcRFLEKyQg2FtNq6k3zA7yoc7RFMmMYcXGwEjwrVa","derivation":"m/84\u0027/0\u0027/1\u0027","hw_type":"coldcard","label":"Coldcard Import 64392470 Acct#1","root_fingerprint":"64392470","type":"hardware","xpub":"zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx"},"labels":{},"lightning_payments":{},"lightning_preimages":{},"lightning_privkey2":"xprv9s21ZrQH143K3FbGsjrhgoAjhfnztx2Q4CMTMSbWnrxotqStr6YKDvLFmadjb9ymp8dvH1x2ei57EzVkbnXEsaPTZ87LxeoPxrXbvQZXMQW","payment_requests":{},"prevouts_by_scripthash":{"2655301797aedc6f6b9c20cc987d0880576bc537f432e1df4f7887a8878987c3":[["59aa0eea3833c4ceb605c37e5e4f2dfcf30b1f381e263362684591347e931345:0",269295]]},"qt-console-history":[],"seed_version":33,"spent_outpoints":{"c2d31f0754a8271f10f6484cb6b84cc2339b9b64b86324b62ba4ee807becb731":{"2":"59aa0eea3833c4ceb605c37e5e4f2dfcf30b1f381e263362684591347e931345"}},"stored_height":668854,"submarine_swaps":{},"transactions":{"59aa0eea3833c4ceb605c37e5e4f2dfcf30b1f381e263362684591347e931345":"0100000000010131b7ec7b80eea42bb62463b8649b9b33c24cb8b64c48f6101f27a854071fd3c20200000000ffffffff01ef1b04000000000016001454ba0e8dbad49daf96fa3593b197f74b0c0df24e02483045022100c1c305a4d61dd58b8f669a18fec979aba09925b56f4ad1313131eccdc031613f022033c63b479f21275a3efa05e2e30401c638e43d43acea9eef43b3dcf09854091d012103539fedf51f0750b3b8106e39bbaa775d8bf9047e9c0585a05d62ea5bde9f880000000000"},"tx_fees":{"59aa0eea3833c4ceb605c37e5e4f2dfcf30b1f381e263362684591347e931345":[1290,false,1]},"txi":{},"txo":{"59aa0eea3833c4ceb605c37e5e4f2dfcf30b1f381e263362684591347e931345":{"bc1q2jaqard66jw6l9h6xkfmr9lhfvxqmujwpzrcc3":{"0":[269295,false]}}},"use_encryption":false,"verified_tx3":{"59aa0eea3833c4ceb605c37e5e4f2dfcf30b1f381e263362684591347e931345":[668857,1612327310,1309,"0000000000000000000acb0563f55d7e8e171d36c36bac8c326024d358ca83ea"]},"wallet_type":"standard","winpos-qt":[323,341,873,437]}';
    const w = new WatchOnlyWallet();
    w.setSecret(skeleton);
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rFDtF1nuXZ9PUL4XzKURh3vJBW6Kj6TUrYL4qPtFNtDXtcTVfiqjQDyrZNwjwzt5HS14qdqo3Co2282Lv3Re6Y5wFZxAVuMEpeygnnDwfx',
    );
    assert.strictEqual(w.getMasterFingerprint(), 64392470);
    assert.strictEqual(w.getMasterFingerprintHex(), '168dd603');

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
      'cHNidP8BAHECAAAAASJiwHJP3qYi80+cYjHn/n8TiJJR6jRbJFx67gnclfVdAAAAAAAAAACAAogTAAAAAAAAFgAUb3eWXdETtv7KGyXiUxyIS+Q3wJ003QAAAAAAABYAFF8XCHdkg2yGn81L+plhb9iWamgBAAAAAAABAR8oBAEAAAAAABYAFBAk4ma75DYqawitVrni8qlFzNykIgYDNK9TxoCjQ8P0+qI2Hu4hrnXnJuYAC3h2puZbgRORp+sYFo3WA1QAAIAAAACAAAAAgAAAAAAAAAAAAAAiAgL1DWeV+AfIP5RRB5zHv5vuXsIt8+rF9rrsji3FhQlhzBgWjdYDVAAAgAAAAIAAAACAAQAAAAAAAAAA',
    );
  });

  it('can import cobo vault JSON skeleton wallet', async () => {
    const skeleton =
      '{"ExtPubKey":"zpub6rcabYFcdr41zyUNRWRyHYs2Sm86E5XV8RjjRzTFYsiCngteeZnkwaF2xuhjmM6kpHjuNpFW42BMhzPmFwXt48e1FhddMB7xidZzN4SF24K","MasterFingerprint":"5271c071","CoboVaultFirmwareVersion":"1.2.4(BTC-Only)"}';
    const w = new WatchOnlyWallet();
    w.setSecret(skeleton);
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6rcabYFcdr41zyUNRWRyHYs2Sm86E5XV8RjjRzTFYsiCngteeZnkwaF2xuhjmM6kpHjuNpFW42BMhzPmFwXt48e1FhddMB7xidZzN4SF24K',
    );
    assert.strictEqual(w.getMasterFingerprint(), 1908437330);
    assert.strictEqual(w.getMasterFingerprintHex(), '5271c071');
    assert.strictEqual(w.getLabel(), 'Cobo Vault 5271c071');
  });

  it('can import zpub with master fingerprint', async () => {
    const zpub =
      '[8cce63f8/84h/0h/0h]zpub6s2RJ9qAEBW8Abhojs6LyDzF7gttcDr6EsR3Umu2aptZBb45e734rGtt4KqsCMmNyR1EEzUU2ugdVYez2VywQvAbBjUSKn8ho4Zk2c5otkk';
    const w = new WatchOnlyWallet();
    w.setSecret(zpub);
    w.init();
    assert.ok(w.valid());
    assert.strictEqual(
      w.getSecret(),
      'zpub6s2RJ9qAEBW8Abhojs6LyDzF7gttcDr6EsR3Umu2aptZBb45e734rGtt4KqsCMmNyR1EEzUU2ugdVYez2VywQvAbBjUSKn8ho4Zk2c5otkk',
    );
    assert.strictEqual(w.getMasterFingerprint(), 4167290508);
    assert.strictEqual(w.getMasterFingerprintHex(), '8cce63f8');
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
});

describe('BC-UR', () => {
  it('can decodeUR() and then combine unfinalized signed PSBT', () => {
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
});
