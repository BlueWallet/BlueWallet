import assert from 'assert';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 150 * 1000;

afterAll(() => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  try {
    await BlueElectrum.waitTillConnected();
  } catch (err) {
    console.log('failed to connect to Electrum:', err);
    process.exit(1);
  }
});

describe('BlueElectrum', () => {
  it('ElectrumClient can estimate fees from histogram', async () => {
    assert.strictEqual(
      BlueElectrum.calcEstimateFeeFromFeeHistorgam(1, [
        [96, 105086],
        [83, 124591],
        [64, 108207],
        [50, 131141],
        [22, 148800],
        [17, 156916],
        [11, 413222],
        [10, 361384],
        [9, 294146],
        [8, 121778],
        [7, 1153727],
        [6, 283925],
        [5, 880946],
        [4, 825703],
        [3, 2179023],
        [2, 590559],
        [1, 1648473],
      ]),
      22,
    );
    assert.strictEqual(
      BlueElectrum.calcEstimateFeeFromFeeHistorgam(18, [
        [96, 105086],
        [83, 124591],
        [64, 108207],
        [50, 131141],
        [22, 148800],
        [17, 156916],
        [11, 413222],
        [10, 361384],
        [9, 294146],
        [8, 121778],
        [7, 1153727],
        [6, 283925],
        [5, 880946],
        [4, 825703],
        [3, 2179023],
        [2, 590559],
        [1, 1648473],
      ]),
      4,
    );
    assert.strictEqual(
      BlueElectrum.calcEstimateFeeFromFeeHistorgam(144, [
        [96, 105086],
        [83, 124591],
        [64, 108207],
        [50, 131141],
        [22, 148800],
        [17, 156916],
        [11, 413222],
        [10, 361384],
        [9, 294146],
        [8, 121778],
        [7, 1153727],
        [6, 283925],
        [5, 880946],
        [4, 825703],
        [3, 2179023],
        [2, 590559],
        [1, 1648473],
      ]),
      4,
    );
  });

  it('ElectrumClient can test connection', async () => {
    assert.ok(!(await BlueElectrum.testConnection('electrum1.bluewallet.io', 444, false)));
    assert.ok(!(await BlueElectrum.testConnection('electrum1.bluewallet.io', false, 444)));
    assert.ok(!(await BlueElectrum.testConnection('ya.ru', 444, false)));
    assert.ok(!(await BlueElectrum.testConnection('google.com', false, 80)));
    assert.ok(!(await BlueElectrum.testConnection('google.com', 80, false)));
    assert.ok(!(await BlueElectrum.testConnection('google.com', false, 443)));
    assert.ok(!(await BlueElectrum.testConnection('google.com', 443, false)));
    assert.ok(!(await BlueElectrum.testConnection('joyreactor.cc', false, 443)));
    assert.ok(!(await BlueElectrum.testConnection('joyreactor.cc', 443, false)));
    assert.ok(!(await BlueElectrum.testConnection('joyreactor.cc', 80, false)));
    assert.ok(!(await BlueElectrum.testConnection('joyreactor.cc', false, 80)));

    assert.ok(await BlueElectrum.testConnection('electrum1.bluewallet.io', '50001'));
    assert.ok(await BlueElectrum.testConnection('electrum1.bluewallet.io', false, 443));
  });

  it('ElectrumClient can estimate fees', async () => {
    assert.ok((await BlueElectrum.estimateFee(1)) > 1);
    const fees = await BlueElectrum.estimateFees();
    assert.ok(fees.fast > 0);
    assert.ok(fees.medium > 0);
    assert.ok(fees.slow > 0);
  });

  it('ElectrumClient can request server features', async () => {
    const features = await BlueElectrum.serverFeatures();
    // console.warn({features});
    assert.ok(features.server_version);
    assert.ok(features.protocol_min);
    assert.ok(features.protocol_max);
  });

  it('BlueElectrum can do getBalanceByAddress()', async function () {
    const address = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
    const balance = await BlueElectrum.getBalanceByAddress(address);
    assert.strictEqual(balance.confirmed, 51432);
    assert.strictEqual(balance.unconfirmed, 0);
    assert.strictEqual(balance.addr, address);
  });

  it('BlueElectrum can do getTransactionsByAddress()', async function () {
    const txs = await BlueElectrum.getTransactionsByAddress('bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].tx_hash, 'ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d');
    assert.strictEqual(txs[0].height, 563077);
  });

  it('BlueElectrum can do getTransactionsFullByAddress()', async function () {
    const txs = await BlueElectrum.getTransactionsFullByAddress('bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
    for (const tx of txs) {
      assert.ok(tx.address === 'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
      assert.ok(tx.txid);
      assert.ok(tx.confirmations);
      assert.ok(!tx.vin);
      assert.ok(!tx.vout);
      assert.ok(tx.inputs);
      assert.ok(tx.inputs[0].addresses.length > 0);
      assert.ok(tx.inputs[0].value > 0);
      assert.ok(tx.outputs);
      assert.ok(tx.outputs[0].value > 0);
      assert.ok(tx.outputs[0].scriptPubKey);
      assert.ok(tx.outputs[0].addresses.length > 0);
    }
  });

  it.each([false, true])('BlueElectrum can do multiGetBalanceByAddress(), disableBatching=%p', async function (diableBatching) {
    if (diableBatching) BlueElectrum.setBatchingDisabled();
    const balances = await BlueElectrum.multiGetBalanceByAddress([
      'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh',
      'bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p',
      'bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r',
      '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK',
      'bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy',
    ]);

    assert.strictEqual(balances.balance, 200000 + 51432);
    assert.strictEqual(balances.unconfirmed_balance, 0);
    assert.strictEqual(balances.addresses.bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh.confirmed, 50000);
    assert.strictEqual(balances.addresses.bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh.unconfirmed, 0);
    assert.strictEqual(balances.addresses.bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p.confirmed, 50000);
    assert.strictEqual(balances.addresses.bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p.unconfirmed, 0);
    assert.strictEqual(balances.addresses.bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r.confirmed, 50000);
    assert.strictEqual(balances.addresses.bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r.unconfirmed, 0);
    assert.strictEqual(balances.addresses.bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy.confirmed, 50000);
    assert.strictEqual(balances.addresses.bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy.unconfirmed, 0);
    assert.strictEqual(balances.addresses['3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK'].confirmed, 51432);
    assert.strictEqual(balances.addresses['3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK'].unconfirmed, 0);
    if (diableBatching) BlueElectrum.setBatchingEnabled();
  });

  it('BlueElectrum can do multiGetUtxoByAddress()', async () => {
    const utxos = await BlueElectrum.multiGetUtxoByAddress(
      [
        'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh',
        'bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p',
        'bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r',
        'bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy',
      ],
      3,
    );

    assert.strictEqual(Object.keys(utxos).length, 4);
    assert.strictEqual(
      utxos.bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh[0].txId,
      'ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d',
    );
    assert.strictEqual(utxos.bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh[0].vout, 1);
    assert.strictEqual(utxos.bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh[0].value, 50000);
    assert.strictEqual(utxos.bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh[0].address, 'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
  });

  it.each([false, true])('ElectrumClient can do multiGetHistoryByAddress(), disableBatching=%p', async disableBatching => {
    if (disableBatching) BlueElectrum.setBatchingDisabled();
    const histories = await BlueElectrum.multiGetHistoryByAddress(
      [
        'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh',
        'bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p',
        'bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r',
        'bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy',
        'bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy', // duplicate intended
      ],
      3,
    );

    assert.ok(
      histories.bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh[0].tx_hash ===
        'ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d',
    );
    assert.ok(
      histories.bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy[0].tx_hash ===
        '5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df',
    );
    assert.ok(Object.keys(histories).length === 4);
    if (disableBatching) BlueElectrum.setBatchingEnabled();
  });

  it.each([false, true])('ElectrumClient can do multiGetTransactionByTxid(), disableBatching=%p', async disableBatching => {
    if (disableBatching) BlueElectrum.setBatchingDisabled();
    const txdatas = await BlueElectrum.multiGetTransactionByTxid(
      [
        'ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d',
        '042c9e276c2d06b0b84899771a7f218af90dd60436947c49a844a05d7c104b26',
        '2cf439be65e7cc7c6e4db721b1c8fcb1cd95ff07cde79a52a73b3d15a12b2eb6',
        '5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df',
        '5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df', // duplicate intended
      ],
      3,
    );

    assert.ok(
      txdatas.ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d.txid ===
        'ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d',
    );
    assert.ok(
      txdatas['5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df'].txid ===
        '5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df',
    );
    assert.ok(txdatas['5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df'].size);
    assert.ok(txdatas['5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df'].vin);
    assert.ok(txdatas['5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df'].vout);
    assert.ok(txdatas['5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df'].blocktime);
    assert.ok(Object.keys(txdatas).length === 4);
    if (disableBatching) BlueElectrum.setBatchingEnabled();
  });

  it('multiGetTransactionByTxid() can work with big batches', async () => {
    // eslint-disable-next-line
    let vinTxids = ["fb083ca5fb98451314836bbf31d08bf658deddcc8947d76eefe44b5aa49f3a48","5f0f4ac816af5717f6e049454ef698c5d46b2303b1622a17b42eed0d914ea412","8f58af45a9375ed2516237e6910186f4c9c5655a873396e71721057bdd68b3f2","e3cca3df55a880adbe639955c68772d2c491b36e28368380241ac096d9967095","5aef653da43618151ea24ed13b26e67415a397212a60dbb3609a67ba1c01373b","b67c9ce40020584b82085f4093d066c2759542d9aa612bd1cc2e561548e2f9bb","28f29df4660afa58dd6e0f9c31d3e3c204b575029c4b429dbab7da834748f097","147aa266b25fb24bfd7f2e66a1d8eeaa5086c35922c59a36a7a7c4e6a7805d5d","40f00b01d2173c46fc1b4f462132f183beb368bd43df7b88869a8bb7a8bb3b5f","b67c9ce40020584b82085f4093d066c2759542d9aa612bd1cc2e561548e2f9bb","147aa266b25fb24bfd7f2e66a1d8eeaa5086c35922c59a36a7a7c4e6a7805d5d","ba4a6c71c3b3d738609526693bdf87ed5b441f3546d70a2a83128cf6645c10dd","b1b7410fb84def2a3fa0ba54e587e3ce373c4f6e1972b5a7044c804e53101131","a4a0790f7d00ad7da97e349062cff61da12bc2b1ee06223a41d4960621ad6781","b1b7410fb84def2a3fa0ba54e587e3ce373c4f6e1972b5a7044c804e53101131","15e499177b871ac205bf509e1abd81c29a72475661957ea82db69f4afde6cc3f","6702bf9dc679c9086d0cb3f43c10d48bb200e1b29d73b4b4a399bd3eae31f4d0","51c07c5c882b49931d18adf2f62afed25db53ef4264b1f3144152b6c4dfeda1c","38eba464479c79a230e0256b7e9cc9b9cc8539b9a7297bc9961046df29d63b4a","5d29eef47330797e9b37cf0d57e48a871a6e249a0102e4744ec9d30613b054b8","3af7c1fa064a2c74e0d34972895daba4b78f32eae596774bb4bb35d44cf069c1","cc5485827920ea5de1375c9806a1b6f7db1f87f2e4074481778d1e44183b3cf6","38eba464479c79a230e0256b7e9cc9b9cc8539b9a7297bc9961046df29d63b4a","217b99f47c1a05076b68e98cf65b08df8aa485c28c74e43a0ab5a4aa98a89fa0","fb2b8dcb2997c331bd8d9f4d611293874bde116184ef38dfd5a0d5745f9d475d","2ef35d16748d56d4ec19fb458bc0147e85dd1d78e25f71f0ddd71ba22f0f49ec","05b4009d2ec7c6472a10d652efdbd7e4fa72a2e2448287e386c4d68864ba75af","cd801bc012c361fd6be0bc5b440c71d656d2fa14af90af1f469fc91ca3be0967","24807d3563342275bee7cc4b98dc2fadb9e39d074534e79c7921b46596988344","2b29aaa43d344393769f38e1d3dc0ba1d89b2f9868311ff9ec9eb44183d21250","b07747a598d4f1f0beae08332568292104f4360929057396c5637c1900e4f3ff","f13a237529bfd21edad34678f1da8ebd4606422a85b5f92ee270f3808c286e44","20264987b20aa1d6975cf9bad62855c3f8c1492e38ea7a73963eb355bd18b77f","65e0a29033eb3cea6b4c9eaa7448754e468585cf1877e0b228281138421f30cb","133874b546cdc715439d1d1dba865419a9640ee740f8a72191d1221ac29d066b","b056e86b160b08d3e944f1d61368d3523e9c0820ebc8f755b98ac38eb3e307d1","4bb01e9b0388441442a04bb36fe932c3e3da525c4c09413c90f0a6a74c57d280","2fc80afde86a45f5f113067f44433d44da28d6e17dd8dbe19f511bc371863a1c","e7650f7fa769c2b1aee41477278633a342017c81009feff8b6566b3f3664b6dc","01315e63a7b852f1dfd83bc7a405351492c076d88f2ae4adc3c32d3431fd5a35","7cb1e59903fb72e4f618ba7ab078765e9117d8aca2421268fe24b41986df37ba","7fd27c38816b461eba58b547a524747b28eec2b58e2c8fd29fa9858de96265f5","38b95ee03adf62feb5188c1a8c5ac6334e95e0e21bba6b30e667b54f6ad7b728","8927bc71680f4a9f25af6f2c0c4e1956e0e703124ac725d842c64bba5e92a6e5","48d0b1d45f8e228d41f01f71e56618d0f2ce8263bbd9b59352760640eb2df66c","8f41920019edb0924b861daa6feaf2922d0ce0a9c45b777ba88f6e026cb9a6ea","7a4dad8678a23b608ce8acacd9a2f4c24929bc68037fb2991a43cc022e977b60","684daad794ebc87661f8250eb42621db03f6b3f31185e0f760ee3db73286e6c9","69080677f9b643e100e62a2edf12e2dbd529b047d584ff922e5458381761a05d","ccc4c5111cc02d243b67fc20fd93026d88add65c6fd2055602152227903c703c","242fc7936d4480e5fba4b9515aca0b97de121a9effcc1be26d4e455c7adef9f1","833db41cd8b9c20470bc3b5e70249d243aacfcf6b69593ac460a0029467689b9","5fd098cace35e4c0d08f10059d520bae1b2b074ac1059d2980a1be82a8f77f31","e445ff4d77e50cd5d04d2dd3c482677c5531c2198494768dacb624d4f7f7bfc5","c4e521e8f00cc3979bdd0e0c99970374fa1f92ff742a3e9fdf52c1e4bbcfd78d","a1d6296a9801ee538e0d27feb10f8be41b00b0fccc6c83fcb49e98f23c42dcd3","aa368285e0e05d9bc3f957b89b95260349684cc872b167f36a61982bf63c2201","f4fa04c284d1f3eb907f9e7f8adf6e1e832a21ed763d6d23857e45926f9ce10a","fb9e869cf8465c71c8f4a1756a6dbd8dcd1eca4246d8645b037ad0cc65e800f0","e059ad921e8a07dacd01727774bd17821768e61d3f7062f77131f517a9197e50","8736be2b2a646ce5a471e16baf9d11aadd818a71dfe790395b0b2809e115c1e6","4fe6b558e435fdad3843b2db5d14915501c147148dbeb4985e3e596feda17d99","e8318e5e612c6d48b4711e5414abc396ab3d7633a2529eaabe3a82d7c851ccb4","804b049e776174f3eded63d18185d769841f7abc5b0751109a5942862c939fdf","3d263a914bb8e82f1566490d2e8d20ab66542f223089cc4cce9b034930e775f1","1daf03c9dabfd10483a637b59f18d44b8e5fc8a4b2d44e72ffa610824f71879b","3bd025508217aeba5c4a616ea6c30969f252f58231087ce11714db7110b2005c","1a66088cb7d460aeb56c00dd069156adc5cef549648e5481ee5c5e589879b731","4ff1cc8b15a09062bed7a53124c3af351ceda82d439aa3606fe3ca277a20bc2a","ca2095f1eced85cb8e07f785b4e1b8c3f7d9e8ee60f87458c40bdfe731d09c30","d7f31a681b35a7012ced38f106f3b478e9a31f8d58fbf244c721ca1ba89cb394","4bd47e0c626359950fc09888e1a505dfe7286800d0ec0a21b49c66d8de32c901","1a66088cb7d460aeb56c00dd069156adc5cef549648e5481ee5c5e589879b731","3bd025508217aeba5c4a616ea6c30969f252f58231087ce11714db7110b2005c","19ebfbba4c51e79099c031e91a36621312a50c46d0f87d83183a71a0834afe3f","e8ebe53a94ee73fa803f0f144c8ac31d5075de45e2f798b383a6d88164d6113a","944569d8a887d238cf2d7c104ea3fe558bdea38e961b73a0378bfd7969e13157","a08897fe730d7de1f2d5376e1d6e9e500c6e20dce4bd9225c5694667464bf8eb","472a92ca21fe52d676dca31266943a87745bec8b04450b83e5ea29559253e902","3c86ca512b36c13218249dede37b9ed2813b368115926931c08df7dfb049822b","b49c0fce3665545d887872e927e76d7df0927e4baec27c7106181651611424ab","8881027cfa2be033b7a9724b5547b710f5ba8aef1becb3ed53d34d614a54e3bc","bb5ee6ed47f61fc2cc33c29540f1e778a9c9583083e2441c9b23439c5e46820f","cbd9c2e1782d72fae42254f615caba2cc28de5f222ba142ff2020c5499990cc4","52b39e96c6672ecc70554cea0a10c57ad4636526a8f51477d2108bdda78d30e8","c2c4cb3164f6576cf559ab0e7180ad3d1f5ba27156727085ddf3ec36b4fccf33","af940582b1416ab699abc542994f2f8da43c0af0c5518e57c2087eb33dc0503d","d7eace81b9bb79318113d2f30f9d18d90d78f0dffaee7f3bacbcc343ee0101cd","aaf156826bb506f93fc4aaee3bed00172819f02a06ecd5a446afce5321f93ba3","ca2e3b7dde57407212bc4017621f6433908dc2f8b725d365fc7109c7b8067097","d6fdbf77be6e2979543798f41b6cf36fca557c17d0a9d367cc52701770eb2d46","1af6c454434e19d802f83f600982e083de6b4f925c90938783c55236174640b2","66a5abcb3210724cc93b9e4eb537ef9f28e987f2915f00620eb887a419521125","91df6caa3a703fbaebaf35a3ed61d7b80eae59e0daf3f4443c41e2ed69d8cadf","cf62992c60c36cd327652e93bfb0fb7fa14d1f80195616907128ca7fd2b8b24c","1cf9269f1c03276f21bd0f939ee83f9319df7516f9efb06cdbc8ad4f2e985d15","39e051909a54e187a21500c3ab48966058414320a881dbb90517ef770e18b553","696d6bab49f36a42c10486bb4db41f6c7ab89e1f615c221a3c8115b9813246d6","ce01648dfa0c14f86836404e745a9d071c992675d8899b837233a1ccf6e8d9d1","6e60a751d87946c28cbbd6d19115a036edc083b61d981efe513327bbe4e035cf","c73a7a623ffe18351b51942f10371950a5afc5b967ad8e831fc1b4339078b004","2ababd951785b88b19c609338df9bf5f3b25f33d85196410533dc02f6e3d2e60","4edfa2ade6895b198d53dfe5070148c920cc55e810ab4b7c109192d045289669","be8e83fa02962e432fea91f9d49fade6a781c8e85d277ac4f90ab73d7ec1c75e","297256d3db749c28489984d33e3a44118068c71dee801f6c8f7e61dec30e7103","7df23870105909c9c390e97527ea9a37f5fc4dab7a2d11b5bce48ac97e81fcb5","5fcef9d6d418f7a47bbbff082d97b4cf789403df2a0eb75f1ae18b873362f8fb","b3ca2274cc0a5bd844df396ee075344a210fa95b50738d6f8938a76b865fe874","fd2606fc511fa58038c9e9511f3db2d0163ee4615b1c58af53ad1c419b85a7b7","75386c3230b6eab0dd67207ade52679d6fb3c8f9003bca870e0bde8980971146","35c7d91dfcecac4ea844a26f4650e0c7455722359d2299f265ab609da6a7e885","7d67395f69c72c319b991b8c0a8c550cdc7124aa73b86edb5dc78125c8cb2b06","45c7b3879a07324548d034d5698166f8e0fcfcfdf596c18640fe3f7636913bdb","a069791dbb92acabe3ade5dcc6f88f4310abcd6e77927764c71db4c850190542","60c8f1368add0de87f0849d0e93a92d707fecd6f476a850f242dd2c283e05fcc","8d32423d43a5a22332c312975ed03e1e8131dc35c846a16a7cfc3abc255b8eb5","9717ce2d17c080a6bbc635ec15295d0b6567442f8f6e247e56d61a35fed8f574","618d565513599b0cfcee5ab01f6ef86aabaf11615eafd56f66eaba29df6073ca","e53cde1fccab2a904f542a9cad704843a71964be0223113d8c229a706b1d3120","ced6089c414f9deceb70228e42ad0281ec8b13ef4f3a8b3952b6417f9f69346e","b1cb1f5a8b04e3cd5d4e736ed3c703dac8db6376bfa74f4ca5ed0264ffcb6992","326b5964ab27e31c3952520bae0e06c66daf576e3a70faca2a891228831cc3ee","40a0b058213a2e3540c9fc3a5dcbd1eb5bd876c9748f81bb12dc89a944e45a29","12bc66fa8c86611d2785bec80faad4b880cd48bc4ff30f337022d9e8675e30c4","3a7ef749c28ab552daa4fb7e54c3980e86aefa92506caded4feedb4bb70a03c9","4ed789a4d9adc6777c585653267b1d22292d992adfb5224faa1115a1c2b3734c","dc0de14bc6290725ef57d2a54a4044dbb83b425af4a94d609ed7ef516d4d03b1","bc83071647ec91f147f83635bcf99faf8f3431b0af41094ad9a574f117618adc","adce7a0971cd0a515e31e761f4f76113347548d792e0d14cedd683c9221a006a","8fbc8775ab4a90aabc860679fa9ec02be810d1076b607f0f0573baa37ca759fe","ad24ecdfbacb2e8f49425aec400f028e3cc26fb2f0bb7e1dda3ca9ccd98b2c65","01864c0c6901c8e0214987703d75b6f7248bde19964d1c3460dcb8b447296c52","91bcfb9559bb4ea9890c403cc8d0420b4312b4f1f233838636b1f1cf0d03cca1","74ea7961e345714f014bea53111b23952f5309f318af4c373388308971c481ab","1a0df705f0bdf61d9474d949395fbed08f9ffa73668b1201ff6eb4be6ecc94a8","d65d0447197ac25105c8b6fed1675be1940e595eed94aa552140d0027c3a14ae","52d1fcdb4899521daf0b36fd46e0daf8a0e3d1fcd80246f8ac6bd9b92e1bf814","fc26e159b9ba609a0c3abb098f800ddfdc124f0150f6bcd6ef28a73edcfc46b1","fa04269ada73e905ae9b70e0b348c04e980ce0c9a5f92813642691c90fff9b4c","6f67910e966aed715c97a3f34123895e5f12cc3eac821b35519f14410ed84217","2e3f3493cacf15681f4587b2ddccf16bf24c93025cb62b5c9c7c725303c18e42","ff5aaeb07738cecc1ec9c5959254005fa20ca2fd331dd2f15dc80ad6dd8810d2","de1e6715cd6c6ab48a4fed996c168d40cbaa8a47356deb9729ae3df1430e6ccd","b005828433393021f9db66d6e8ad6928f0a9d5c3dc2cf4dbfa0e264b6d4f9e3f","8e67b23999d09515a11fcb142bd1c843580eba1e07df1a89e97bfc61db430739","9a69f53c94388a60f1b16f7d2861bd554fcd7f6aceef6b1c1e3f48ca9030fbff","65ead8101d45973f10664e840193ae01ff8179a81e0a143e6a4cb90a4f0a78f8","ffa35cc1ab3169651692b80f3c91a16ff5136d7c15fba57f43101fc31b9c45f7","c3f038db69e3d5f661f109b711ad04e7f596b68b2d555a081ea422a18109016b","2a07e0970916588dc3d1cf8274c0e54672232a55cc01437deea383fbc9fd8903","6ef42127f51e88ba7505c920e77897d5b983bc86955439492094f1966bb17dd0","d22a5dfe87c858a69e1470dcc8d2fb14dc7b1c30002ca6c2ab85ee8d11f26c01","088131dc57db44873dca6ecc79ac8fbef7d37dccb1618ce9373526512956dde6","4ef88767cc4a4234fd487165ca4d733eac96f5d0f69d0da3668509ad8322a6e7","0b9171dd1de9b00df7c5ca401acf9d715cc5a1c4a77082996beb166e661197a8","dab64e620f07903bd218338db299f48cd21a578e18b54d21d75d9f887d4cdee5","0f357a93a11c2921ac7d078ba2fc01ed6142141ad27170a70d6ca1e7bcd216da","935d138f548875f2700aad732286be9f9b7a27950e49b8a9d9a26d4a04984849","97049b7cc03e75ca4d88e5fc499d028e0efd36426f983e7cc62e79ac25bacd74","29ce849f696e358d3d191165dd0b5a0fe877551d8076a13545bb42e4c1f2628a","d612e39e947aaa4ead5ba2b9f117f9f0f66eaa7b6f8e9ce3fad27840d048c4bb","2f9e1b6669b51121d81ee2f8e7ff070d55501e478b27d9bcd5b517037dbb907a","09fb6c5cf76713fc1aa2cba8cff23a15706ebc69a0ace264ab97b1d27f87b25b","dfe8efc67c47bc2a09806ef1a7b795223b7d200fce0a41173382c8d5d15f4e1d","25c9af80002c3cafcf9a71a115d5cf1fb52ee5e2bbb92e7fe5af2ac498bdade1","dfe8efc67c47bc2a09806ef1a7b795223b7d200fce0a41173382c8d5d15f4e1d","d3f431413d390d24af4f8bfa5f72768f4e1dfd2d84ae1235a27961405c6b8660","d3f431413d390d24af4f8bfa5f72768f4e1dfd2d84ae1235a27961405c6b8660","4bbbbc9591fe8270da47b29df25e14322e6560ac547382ae2a42ee35ecaa44bf","d56c5203a816443e1823372533b711434c45e25a09e5cedad076c9d8038065e9","44c9d492e1374aafb3f6d71f8f408eb74394550ad8e4665c0169bb7dd930ffea","11610aae481891ec2a0fc552d7f3c569d6ebcd8150c322c1d58b94f3a0f1c3df","3dac2a5afb3d345b6276c42ed4a69aee7b9600e0562ad6d3a9828fcbdba78267","67c759d4395f8b91e82a43a13be121e6924def3f3ce88c6a62bd45ec04e2a0a8","d6a7a8d9fe420579dd5351ac769cbd5c1d2454ef8f1b142a71cef10ecc70ec56","7f34eecdda77971fc96007d90eebd2f7addc85c214e0442f40990a28b840a032","153b939a629f12f0802d21bc0b335bb49daef00c6b9c4535c6144883a02a05a3","2f61964ca74a3b0f3c845426395a2d4cefa51ff5b0716bf1d9933274c40cefe9","83cb85c0863bc46fbac3879b4c67a60629008c02eaa88ddd1d51cf8d6013eadc","1e7c81072f87b7d817c8583a78a4d4056178b21f9ecf3d237b19bcc8cee1d391","736af4be184ea560f3010dd6bd796846e773e223f14ba13c1b9cec272788126a","0addef1e4c530c74fbaa56d65b00e9a0929bf64375fa6bf848d8afc8e1da3c3d","77bfab96a52e4fbf3b9afac9447ca6be2c64564f2c58fc560f7104611e646128","af32a73e481f2825f2dd83e5aa06fea0ee2d064a997a203af95d5e33ccf91ad5","37974afcd645a15237810a6785d78cfb51d791d6cd074b96770781248675a838","e0374bccc25125fb6b18555d7ec9761df443bd5801185359534ecdbae8c34a05","e26c3a19188fc8e9fee4962df6d30cf57d238463e79e92c7c65e77dcbd317d8f","17a4fafbf186721a4088d5f3d4373c74bd00af9a86e09bf5f056ba72c36748a4","41a0d9e099ee0c58affff9765cb0536174b98eda38bf403eaeb4d7f014180a48","b032980d1dfdf8f6692c1eac85f7d24134c075e6071e1cc1453a340ce04c94c2","a2fa19621c26c64773920e21c5ddd2758bdd992759a5124e1b4ae761d31d81b6","2a97222ee8383b85a17cdf9e868d1a04eedc5a7bd2b9813f1333fda730fd8149","7e278244c39cea3270f540d7add70595cb73204951030e9a6062ab9f3528a20a","f7be68d1757c477d837c754a5aebb96d44e7668d74204a6e471101acc2e3c331","0de6045abf24a55ffbe03db5517e1b619239e76d9308681899e6c115f10936bb","dfb894c450cef578aa27499be753b8945b759a6006f498e8a808da9362e60420","99727700bf127721388f7ebbe23188da7e87beaee64f775b0d6dff3e6ee9f499","09bbfdb57c117eb7b11b386d388923f8e6caf2a3c6b29fff81041c5ce427f6f3","3d3a1c0602c0e00c01efd86425ae6cdf9abc81fff15679bdcdaccea56cf992ac","4bf67246834d6fa98ec500cb519f39afd2159b4f932f7438c3f8afca62781215","8d2c3da3e0514f5f4dc88c4157bd320f89101c392be1a323b6eb42e94a47c415","fcf5d4d250a4967064b3c571f7e63decf50802e2ca6ac841cefe66aee6b6f1a9","fc44a49a0431b10c27c130da37ee6dcd1b0dc695d0b65ca6f57b89ca32030d69","ac58809688940109655913fea3cd3f4c37dc3192124d4b3bd6597cff4a9a6fc4","034243891e1c94fdf12a7008ed3db1e162c39a6b722e2226615e9d28ab233a38","acc6c6cd91d8cc9b37bcccd7385d98a95708b79ebd3a048b84499e33a988329c","90fb75c59748fd82c8052bb7ead9623d5a8cd1f8d0d75b743678b750a61d5647","071c3b31cca18e2c879dff4a8202cd2fdcb25045b64b6f1a035c5a712ba6f4e7","327e9f1a1b1d630314b5fe11e3cd5b2b2288e1044d3b98cc553523cdb765c5c8","6fe963af6a8576cc6190979a7fa46f71100d7468f01ae6fd3a1f60d293d95fec","d6adfc9ada50609dbfd6f598a9402a235f270aeb895cbd3433bfa1611301313a","0dd9f649e2f2afa45cd17181f55a01c76cb3f631770ea75952c4ad48fbd57d72","89622477e7d7cf0ff4ad038876b2231878a4f21976f6949af7b6876e0a0ccaf0","ddee132dd2a5b78962d0e6195a4990646e8d4567df5df058eb8280c2854b1b8d","d030c924c80a977415ba752a59eb8c359fc255608a72d137e5a3995e4f3dd09a","55e93a772bb8fd4851dfb79014d40f11d9dd714eff39acef6045776d6ee7abb7","79f0fe9adab2a9c45054ca0665649f702284d435fcecf6963f426494c4685177","9350f517362ea8d2e2a14ad23e77820b7f811a57b740ac145aa9607aebfbbcc1","f20bd6e5f63e3751b65cc0f69f800d1386b71f7bcf831df63a3e0a1980940f3a","e58d90563ede6de8f27a04736ae935f918c840b8c4d3ba2e9fd37197bd6dd776","a26368de811b9f9b4982bf58d3dcf926929b1768c9140cf52e6628f75699c92c","70b58e0eedf00c7424eee4693ed777f70cce8d9db6a3d41e7e7f911e1f3b7f94","eb5768d60f8b0323f07f7e89c0879617fedc960c37c85cf7c25c50e0165f0597","a90e6b3648ef7e2cd8951ee712a1b186c1092a11a149a1ddd96b97e01ce7d4f0","d2641c4410d3add40bf7a4dbdbc80c3f056c2a5b15fff09282eb06022c951ed7","8732005fd6e34080693fa81e4227187c05e70cefa43726fe459ae1b80a041437","124e5d8278708bd1a32a51c452508e15dfd06e7191c3994933cadb8f072fec4f","27f82563dc1dfcf0172267da16a4adae713cd2980e02577450530f36fd9aceba","e5dd6efb0064688f3857440b97e231045c4a1b3f708a00cd18ee721b4ac71db0","1aa08a948bc8b6bd3285973f97a14e4ad4a04b8c1cd696dbc4654f2689b3b4a4","20acd54cc349c30313c76e850d2d9a381540514d6330722fbb4d17c1d94fffcc","d934c22a6d997a8a1ecbc6c085587a52ec21a29d56803eb6e40d0c5f7bf79761","02ab03784d559a467cb4b720a8ce8f203f6968c2ecff93a79114fa13f7f8a3b6","01fc012c78c3f28beaa494e3b3cc45aaeea52923e24c1ea0bf5aaf6715fbddb8","e737cc7650ebe1801bbd87523a015431a9a2b44d090af8d84ff780e2fc0a7570","d8ee63e1d52dc44c682966ff8fc53b0d00646400a92df4adf02cfa0418c2823e","b6dfc2022e2a716dcf0e5c8057126c03fa75844e893bcd9461d2c24172ca0e0f","231cc8f40e3456165c8667715a40b9538bfb73d48668aca51db481b0b485bccd","f289532af57cb7e80c0f670205b64d27d2b9c6cdb6f78df475b585cbbc2d1a69","0a766fd0048fd37119a4bdad28dc2c952369a3e8fcc04892dd39adbd3700f818","d1cd8572518e8bbd33be0c841ced2e9bbe9d67471f27e4b9374c26b8e62473d9","5fcef9d6d418f7a47bbbff082d97b4cf789403df2a0eb75f1ae18b873362f8fb","42362a794b85db5592eaab0e21c9b6894a932653d59a97f3e081a7f9760ece61","70631829bbf1208cb277a988224efeedff692a6a44bb0d33b99a5750652cc2e3","269c8261cc14dd76365a9ed49f71332c0ce95198a51746c4343e6a8c99842bc7","7219f03e489efd3648c5182bc96a3f7bd9d39c1d656d25ae57314ab281eadb79","09fb6c5cf76713fc1aa2cba8cff23a15706ebc69a0ace264ab97b1d27f87b25b","2f9e1b6669b51121d81ee2f8e7ff070d55501e478b27d9bcd5b517037dbb907a","3879367de390469ac48196f22e461e58e03545f79e4ec5f6c4f935db5f26c7a8","4e65324ae5d788ba5e8982eb9af30ef9db63d454576aee979b183bdbf822bd10","18f46b4609876d1d108434c8207317f0f11a602aba8f899e3371f91887442bd9","23fd40eaa32f83a635fdba9ee1dbcb2308a3f6f651428c339dbe083bc10b1379","4785d461d01c6c9ad6fb294478df3ff76f677bb239b1434eea096f18e82508e1","f402bac0eae54e6d72b832962e2224eeddd330ae8df85bc1e02c4e47c831fd9a","d2da86368f860bd524a9bc9a6a3fc68fd822e18d921e20a68843e41946aaea20","07377d1ffb0e5f4582c311e11e5d5598ffd9d4b40d6b431a783d89d34e9597ff","a06e59909846a40b8ff6936ccb25279ae7152f0d1213cbcc52bc702601b1af1b","3632eb0ec85c5d95efeafca8a6237cb594d83f98779bdd763edf2e79b4e9e19a","387eb7e0dad26484d9f00d39e40658e4271d1c82b9f0c0365a211a12a536353a","090ce294c0ba760c0338591af254b03ed4310defe2fa6c4ff8096de17d3ee856","e0b84355712e3f0c4cc076a40e96c5991667ee17b746db73f52e67f5b1d59b1c","5444a9606d8aacf4b8f4779a00df1fb9f28b6d275f519011b6c511ff2419b745","f59ea6fd64694fdb9d7e94577a33a95725967b72bc01069a285e52caf78704ab"];
    const vintxdatas = await BlueElectrum.multiGetTransactionByTxid(vinTxids);
    assert.ok(vintxdatas['8881027cfa2be033b7a9724b5547b710f5ba8aef1becb3ed53d34d614a54e3bc']);
  });

  it.skip('multiGetTransactionByTxid() can work with huge tx', async () => {
    // electrum cant return verbose output because of "response too large (over 1,000,000 bytes"
    // for example:
    // echo '[{"jsonrpc":"2.0","method":"blockchain.transaction.get","params":["484a11c5e086a281413b9192b4f60c06abf745f08c2c28c4b4daefe6df3b9e5c", true],"id":1}]' | nc bitkoins.nl  50001 -i 1
    // @see https://electrumx.readthedocs.io/en/latest/protocol-methods.html#blockchain-transaction-get
    //
    // possible solution: fetch it without verbose and decode locally. unfortunatelly it omits such info as confirmations, time etc
    // so whoever uses it should be prepared for this.
    // tbh consumer wallets dont usually work with such big txs, so probably we dont need it
    const txdatas = await BlueElectrum.multiGetTransactionByTxid(['484a11c5e086a281413b9192b4f60c06abf745f08c2c28c4b4daefe6df3b9e5c']);
    assert.ok(txdatas['484a11c5e086a281413b9192b4f60c06abf745f08c2c28c4b4daefe6df3b9e5c']);
  });

  it.each([false, true])('ElectrumClient can do multiGetHistoryByAddress() to obtain txhex, disableBatching=%p', async disableBatching => {
    if (disableBatching) BlueElectrum.setBatchingDisabled();
    const txdatas = await BlueElectrum.multiGetTransactionByTxid(
      ['881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e'],
      3,
      false,
    );

    assert.strictEqual(
      txdatas['881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e'],
      '02000000000102f1155666b534f7cb476a0523a45dc8731d38d56b5b08e877c968812423fbd7f3010000000000000000d8a2882a692ee759b43e6af48ac152dd3410cc4b7d25031e83b3396c16ffbc8900000000000000000002400d03000000000017a914e286d58e53f9247a4710e51232cce0686f16873c870695010000000000160014d3e2ecbf4d91321794e0297e0284c47527cf878b02483045022100d18dc865fb4d087004d021d480b983b8afb177a1934ce4cd11cf97b03e17944f02206d7310687a84aab5d4696d535bca69c2db4449b48feb55fff028aa004f2d1744012103af4b208608c75f38e78f6e5abfbcad9c360fb60d3e035193b2cd0cdc8fc0155c0247304402207556e859845df41d897fe442f59b6106c8fa39c74ba5b7b8e3268ab0aebf186f0220048a9f3742339c44a1e5c78b491822b96070bcfda3f64db9dc6434f8e8068475012102456e5223ed3884dc6b0e152067fd836e3eb1485422eda45558bf83f59c6ad09f00000000',
    );
    if (disableBatching) BlueElectrum.setBatchingEnabled();
  });
});
