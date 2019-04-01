/* global it, describe, afterAll, beforeAll, jasmine */
global.net = require('net');
let BlueElectrum = require('./BlueElectrum');
let assert = require('assert');
jasmine.DEFAULT_TIMEOUT_INTERVAL = 150 * 1000;

afterAll(() => {
  // after all tests we close socket so the test suite can actually terminate
  return BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  try {
    await BlueElectrum.waitTillConnected();
  } catch (Err) {
    console.log('failed to connect to Electrum:', Err);
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
        await mainClient.server_version('2.7.11', '1.2');
      } catch (e) {
        mainClient.reconnect = mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
        mainClient.close();
        throw new Error('bad connection: ' + JSON.stringify(peer));
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
      assert.ok(balance.confirmed === 51432);

      // let peers = await mainClient.serverPeers_subscribe();
      // console.log(peers);
      mainClient.reconnect = mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
      mainClient.close();
    }
  });

  it('BlueElectrum works', async function() {
    let address = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
    let balance = await BlueElectrum.getBalanceByAddress(address);
    assert.strictEqual(balance.confirmed, 51432);
    assert.strictEqual(balance.unconfirmed, 0);
    assert.strictEqual(balance.addr, address);

    let txs = await BlueElectrum.getTransactionsByAddress(address);
    assert.strictEqual(txs.length, 1);
    for (let tx of txs) {
      assert.ok(tx.tx_hash);
      assert.ok(tx.height);
    }
  });
});
