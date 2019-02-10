/* global it, describe, jasmine */
global.net = require('net');
let BlueElectrum = require('./BlueElectrum');
let assert = require('assert');

describe('Electrum', () => {
  it('ElectrumClient can connect and query', async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100 * 1000;
    const ElectrumClient = require('electrum-client');
    let bitcoin = require('bitcoinjs-lib');
    // let bitcoin = require('bitcoinjs-lib');

    const peer = { host: 'electrum.coinucopia.io', ssl: 50002, tcp: 50001, pruning: null, http: null, https: null };
    console.log('begin connection:', JSON.stringify(peer));
    let mainClient = new ElectrumClient(peer.tcp, peer.host, 'tcp');

    try {
      await mainClient.connect();
      const ver = await mainClient.server_version('2.7.11', '1.2');
      console.log('connected to ', ver);
    } catch (e) {
      console.log('bad connection:', JSON.stringify(peer));
      throw new Error();
    }

    let addr4elect = 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej';
    let script = bitcoin.address.toOutputScript(addr4elect);
    let hash = bitcoin.crypto.sha256(script);
    let reversedHash = Buffer.from(hash.reverse());
    let balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
    assert.ok(balance.confirmed > 0);

    addr4elect = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
    script = bitcoin.address.toOutputScript(addr4elect);
    hash = bitcoin.crypto.sha256(script);
    reversedHash = Buffer.from(hash.reverse());
    balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
    assert.ok(balance.confirmed === 51432);

    // let peers = await mainClient.serverPeers_subscribe();
    // console.log(peers);
    mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
    mainClient.reconnect = () => {}; // dirty hack to make it stop reconnecting
    mainClient.close();
    // setTimeout(()=>process.exit(), 3000);
  });

  it('BlueElectrum works', async function() {
    let address = '3GCvDBAktgQQtsbN6x5DYiQCMmgZ9Yk8BK';
    await BlueElectrum.waitTillConnected();
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

    BlueElectrum.forceDisconnect();
  });
});
