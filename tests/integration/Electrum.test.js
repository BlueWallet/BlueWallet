/* global it, describe, afterAll, beforeAll, jasmine */
const bitcoin = require('bitcoinjs-lib');
global.net = require('net');
let BlueElectrum = require('../../BlueElectrum');
let assert = require('assert');
jasmine.DEFAULT_TIMEOUT_INTERVAL = 150 * 1000;

afterAll(() => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
  return new Promise(resolve => setTimeout(resolve, 10000)); // simple sleep to wait for all timeouts termination
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

describe('Electrum', () => {
  it('ElectrumClient can test connection', async () => {
    assert.ok(await BlueElectrum.testConnection('electrum1.bluewallet.io', '50001'));
  });

  it('ElectrumClient can estimate fees', async () => {
    assert.ok((await BlueElectrum.estimateFee(1)) > 1);
  });

  it('ElectrumClient can connect and query', async () => {
    const ElectrumClient = require('electrum-client');

    for (let peer of BlueElectrum.hardcodedPeers) {
      let mainClient = new ElectrumClient(peer.tcp, peer.host, 'tcp');

      try {
        await mainClient.connect();
        await mainClient.server_version('2.7.11', '1.4');
      } catch (e) {
        mainClient.reconnect = mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
        mainClient.close();
        throw new Error('bad connection: ' + JSON.stringify(peer) + ' ' + e.message);
      }

      let addr4elect = 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej';
      let script = bitcoin.address.toOutputScript(addr4elect);
      let hash = bitcoin.crypto.sha256(script);
      let reversedHash = Buffer.from(hash.reverse());
      let start = +new Date();
      let balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
      let end = +new Date();
      console.warn(peer.host, 'took', (end - start) / 1000, 'seconds to fetch balance');
      assert.ok(balance.confirmed > 0);

      addr4elect = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
      script = bitcoin.address.toOutputScript(addr4elect);
      hash = bitcoin.crypto.sha256(script);
      reversedHash = Buffer.from(hash.reverse());
      balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));

      // let peers = await mainClient.serverPeers_subscribe();
      // console.log(peers);
      mainClient.reconnect = mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
      mainClient.close();
    }
  });

  it('BlueElectrum can do getBalanceByAddress()', async function() {
    let address = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
    let balance = await BlueElectrum.getBalanceByAddress(address);
    assert.strictEqual(balance.confirmed, 51432);
    assert.strictEqual(balance.unconfirmed, 0);
    assert.strictEqual(balance.addr, address);
  });

  it('BlueElectrum can do getTransactionsByAddress()', async function() {
    let txs = await BlueElectrum.getTransactionsByAddress('bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].tx_hash, 'ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d');
    assert.strictEqual(txs[0].height, 563077);
  });

  it('BlueElectrum can do getTransactionsFullByAddress()', async function() {
    let txs = await BlueElectrum.getTransactionsFullByAddress('bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
    for (let tx of txs) {
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

  it('BlueElectrum can do multiGetBalanceByAddress()', async function() {
    let balances = await BlueElectrum.multiGetBalanceByAddress([
      'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh',
      'bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p',
      'bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r',
      'bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy',
    ]);

    assert.strictEqual(balances.balance, 200000);
    assert.strictEqual(balances.unconfirmed_balance, 0);
    assert.strictEqual(balances.addresses['bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh'].confirmed, 50000);
    assert.strictEqual(balances.addresses['bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh'].unconfirmed, 0);
    assert.strictEqual(balances.addresses['bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p'].confirmed, 50000);
    assert.strictEqual(balances.addresses['bc1qvd6w54sydc08z3802svkxr7297ez7cusd6266p'].unconfirmed, 0);
    assert.strictEqual(balances.addresses['bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r'].confirmed, 50000);
    assert.strictEqual(balances.addresses['bc1qwp58x4c9e5cplsnw5096qzdkae036ug7a34x3r'].unconfirmed, 0);
    assert.strictEqual(balances.addresses['bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy'].confirmed, 50000);
    assert.strictEqual(balances.addresses['bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy'].unconfirmed, 0);
  });

  it('BlueElectrum can do multiGetUtxoByAddress()', async () => {
    let utxos = await BlueElectrum.multiGetUtxoByAddress(
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
      utxos['bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh'][0].txId,
      'ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d',
    );
    assert.strictEqual(utxos['bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh'][0].vout, 1);
    assert.strictEqual(utxos['bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh'][0].value, 50000);
    assert.strictEqual(utxos['bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh'][0].address, 'bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh');
  });

  it('ElectrumClient can do multiGetHistoryByAddress()', async () => {
    let histories = await BlueElectrum.multiGetHistoryByAddress(
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
      histories['bc1qt4t9xl2gmjvxgmp5gev6m8e6s9c85979ta7jeh'][0]['tx_hash'] ===
        'ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d',
    );
    assert.ok(
      histories['bc1qcg6e26vtzja0h8up5w2m7utex0fsu4v0e0e7uy'][0]['tx_hash'] ===
        '5e2fa84148a7389537434b3ad12fcae71ed43ce5fb0f016a7f154a9b99a973df',
    );
    assert.ok(Object.keys(histories).length === 4);
  });

  it('ElectrumClient can do multiGetTransactionByTxid()', async () => {
    let txdatas = await BlueElectrum.multiGetTransactionByTxid(
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
      txdatas['ad00a92409d8982a1d7f877056dbed0c4337d2ebab70b30463e2802279fb936d'].txid ===
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
  });

  it('ElectrumClient can do multiGetHistoryByAddress() to obtain txhex', async () => {
    let txdatas = await BlueElectrum.multiGetTransactionByTxid(
      ['881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e'],
      3,
      false,
    );

    assert.strictEqual(
      txdatas['881c54edd95cbdd1583d6b9148eb35128a47b64a2e67a5368a649d6be960f08e'],
      '02000000000102f1155666b534f7cb476a0523a45dc8731d38d56b5b08e877c968812423fbd7f3010000000000000000d8a2882a692ee759b43e6af48ac152dd3410cc4b7d25031e83b3396c16ffbc8900000000000000000002400d03000000000017a914e286d58e53f9247a4710e51232cce0686f16873c870695010000000000160014d3e2ecbf4d91321794e0297e0284c47527cf878b02483045022100d18dc865fb4d087004d021d480b983b8afb177a1934ce4cd11cf97b03e17944f02206d7310687a84aab5d4696d535bca69c2db4449b48feb55fff028aa004f2d1744012103af4b208608c75f38e78f6e5abfbcad9c360fb60d3e035193b2cd0cdc8fc0155c0247304402207556e859845df41d897fe442f59b6106c8fa39c74ba5b7b8e3268ab0aebf186f0220048a9f3742339c44a1e5c78b491822b96070bcfda3f64db9dc6434f8e8068475012102456e5223ed3884dc6b0e152067fd836e3eb1485422eda45558bf83f59c6ad09f00000000',
    );
  });
});
