/* global it, describe, afterAll, beforeAll, jasmine */
global.net = require('net');
let BlueElectrum = require('./BlueElectrum');
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
  it('ElectrumClient can connect and query', async () => {
    const ElectrumClient = require('electrum-client');
    let bitcoin = require('bitcoinjs-lib');

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
});
