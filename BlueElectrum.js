import { AsyncStorage } from 'react-native';
const ElectrumClient = require('electrum-client');
let bitcoin = require('bitcoinjs-lib');
let reverse = require('buffer-reverse');

const defaultPeer = { host: 'electrum.coinucopia.io', ssl: 50002, tcp: 50001, pruning: null, http: null, https: null };
console.log('begin connection:', JSON.stringify(defaultPeer));

let mainClient = new ElectrumClient(defaultPeer.tcp, defaultPeer.host, 'tcp');

(async () => {
  try {
    await mainClient.connect();
    const ver = await mainClient.server_version('2.7.11', '1.2');
    console.log('connected to ', ver);
    let peers = await mainClient.serverPeers_subscribe();
    // console.log('peers', peers);
    if (peers && peers.length > 0) {
      AsyncStorage.setItem('ELECTRUM_PEERS', JSON.stringify(peers));
    }
  } catch (e) {
    console.log('bad connection:', JSON.stringify(defaultPeer));
    throw new Error();
  }
})();

/**
 *
 * @param address {String}
 * @returns {Promise<Object>}
 */
async function getBalanceByAddress(address) {
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
  let balance = 0;
  let unconfirmedBalance = 0;
  for (let addr of addresses) {
    let b = await getBalanceByAddress(addr);

    balance += b.confirmed;
    unconfirmedBalance += b.unconfirmed_balance;
  }

  return { balance, unconfirmed_balance: unconfirmedBalance };
}

module.exports.getBalanceByAddress = getBalanceByAddress;
module.exports.getTransactionsByAddress = getTransactionsByAddress;
module.exports.multiGetBalanceByAddress = multiGetBalanceByAddress;

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
