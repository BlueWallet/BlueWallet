import { AsyncStorage } from 'react-native';
const ElectrumClient = require('electrum-client');
let bitcoin = require('bitcoinjs-lib');
let reverse = require('buffer-reverse');

const storageKey = 'ELECTRUM_PEERS';
const defaultPeer = { host: 'electrum.coinucopia.io', tcp: 50001 };

let mainClient = false;
let mainConnected = false;

async function connectMain() {
  let usingPeer = await getRandomHardcodedPeer();
  try {
    console.log('begin connection:', JSON.stringify(usingPeer));
    mainClient = new ElectrumClient(usingPeer.tcp, usingPeer.host, 'tcp');
    await mainClient.connect();
    const ver = await mainClient.server_version('2.7.11', '1.2');
    console.log('connected to ', ver);
    let peers = await mainClient.serverPeers_subscribe();
    if (peers && peers.length > 0) {
      mainConnected = true;
      AsyncStorage.setItem(storageKey, JSON.stringify(peers));
    }
  } catch (e) {
    mainConnected = false;
    console.log('bad connection:', JSON.stringify(usingPeer));
  }

  if (!mainConnected) {
    console.log('retry');
    setTimeout(connectMain, 5000);
  }
}

connectMain();

/**
 * Returns random hardcoded electrum server guaranteed to work
 * at the time of writing.
 *
 * @returns {Promise<{tcp, host}|*>}
 */
async function getRandomHardcodedPeer() {
  let hardcodedPeers = [
    { host: 'node.ispol.sk', tcp: '50001' },
    { host: 'electrum.vom-stausee.de', tcp: '50001' },
    { host: 'orannis.com', tcp: '50001' },
    { host: '139.162.14.142', tcp: '50001' },
    { host: 'daedalus.bauerj.eu', tcp: '50001' },
    { host: 'electrum.eff.ro', tcp: '50001' },
    { host: 'electrum.anduck.net', tcp: '50001' },
    { host: 'mooo.not.fyi', tcp: '50011' },
    { host: 'electrum.coinucopia.io', tcp: '50001' },
  ];
  return hardcodedPeers[(hardcodedPeers.length * Math.random()) | 0];
}

/**
 * Returns random electrum server out of list of servers
 * previous electrum server told us. Nearly half of them is
 * usually offline.
 * Not used for now.
 *
 * @returns {Promise<{tcp: number, host: string}>}
 */
// eslint-disable-next-line
async function getRandomDynamicPeer() {
  try {
    let peers = JSON.parse(await AsyncStorage.getItem(storageKey));
    peers = peers.sort(() => Math.random() - 0.5); // shuffle
    for (let peer of peers) {
      let ret = {};
      ret.host = peer[1];
      for (let item of peer[2]) {
        if (item.startsWith('t')) {
          ret.tcp = item.replace('t', '');
        }
      }
      if (ret.host && ret.tcp) return ret;
    }

    return defaultPeer; // failed to find random client, using default
  } catch (_) {
    return defaultPeer; // smth went wrong, using default
  }
}

/**
 *
 * @param address {String}
 * @returns {Promise<Object>}
 */
async function getBalanceByAddress(address) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  let script = bitcoin.address.toOutputScript(address);
  let hash = bitcoin.crypto.sha256(script);
  let reversedHash = Buffer.from(reverse(hash));
  let balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
  balance.addr = address;
  return balance;
}

/**
 *
 * @param address {String}
 * @returns {Promise<Array>}
 */
async function getTransactionsByAddress(address) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  let script = bitcoin.address.toOutputScript(address);
  let hash = bitcoin.crypto.sha256(script);
  let reversedHash = Buffer.from(reverse(hash));
  let history = await mainClient.blockchainScripthash_getHistory(reversedHash.toString('hex'));
  return history;
}

/**
 *
 * @param addresses {Array}
 * @returns {Promise<{balance: number, unconfirmed_balance: number}>}
 */
async function multiGetBalanceByAddress(addresses) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  let balance = 0;
  let unconfirmedBalance = 0;
  for (let addr of addresses) {
    let b = await getBalanceByAddress(addr);

    balance += b.confirmed;
    unconfirmedBalance += b.unconfirmed_balance;
  }

  return { balance, unconfirmed_balance: unconfirmedBalance };
}

/**
 * Simple waiter till `mainConnected` becomes true (which means
 * it Electrum was connected in other function), or timeout 30 sec.
 *
 *
 * @returns {Promise<Promise<*> | Promise<*>>}
 */
async function waitTillConnected() {
  let waitTillConnectedInterval = false;
  let retriesCounter = 0;
  return new Promise(function(resolve, reject) {
    waitTillConnectedInterval = setInterval(() => {
      if (mainConnected) {
        clearInterval(waitTillConnectedInterval);
        resolve(true);
      }
      if (retriesCounter++ >= 30) {
        clearInterval(waitTillConnectedInterval);
        reject(new Error('Waiting for Electrum connection timeout'));
      }
    }, 1000);
  });
}

module.exports.getBalanceByAddress = getBalanceByAddress;
module.exports.getTransactionsByAddress = getTransactionsByAddress;
module.exports.multiGetBalanceByAddress = multiGetBalanceByAddress;
module.exports.waitTillConnected = waitTillConnected;

module.exports.forceDisconnect = () => {
  mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
  mainClient.reconnect = () => {}; // dirty hack to make it stop reconnecting
  mainClient.close();
};

/*



let addr4elect = 'bc1qwqdg6squsna38e46795at95yu9atm8azzmyvckulcc7kytlcckxswvvzej';
let script = bitcoin.address.toOutputScript(addr4elect);
let hash = bitcoin.crypto.sha256(script);
let reversedHash = Buffer.from(hash.reverse());
console.log(addr4elect, ' maps to ', reversedHash.toString('hex'));
console.log(await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex')));

addr4elect = '1BWwXJH3q6PRsizBkSGm2Uw4Sz1urZ5sCj';
script = bitcoin.address.toOutputScript(addr4elect);
hash = bitcoin.crypto.sha256(script);
reversedHash = Buffer.from(hash.reverse());
console.log(addr4elect, ' maps to ', reversedHash.toString('hex'));
console.log(await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex')));

// let peers = await mainClient.serverPeers_subscribe();
// console.log(peers);
mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
mainClient.reconnect = () => {}; // dirty hack to make it stop reconnecting
mainClient.close();
// setTimeout(()=>process.exit(), 3000); */
