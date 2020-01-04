import AsyncStorage from '@react-native-community/async-storage';
import { AppStorage } from './class';
const bitcoin = require('bitcoinjs-lib');
const ElectrumClient = require('electrum-client');
let reverse = require('buffer-reverse');
let BigNumber = require('bignumber.js');

const storageKey = 'ELECTRUM_PEERS';
const defaultPeer = { host: 'electrum1.bluewallet.io', tcp: '50001' };
const hardcodedPeers = [
  // { host: 'noveltybobble.coinjoined.com', tcp: '50001' }, // down
  // { host: 'electrum.be', tcp: '50001' },
  // { host: 'node.ispol.sk', tcp: '50001' }, // down
  // { host: '139.162.14.142', tcp: '50001' },
  // { host: 'electrum.coinucopia.io', tcp: '50001' }, // SLOW
  // { host: 'Bitkoins.nl', tcp: '50001' }, // down
  // { host: 'fullnode.coinkite.com', tcp: '50001' },
  // { host: 'preperfect.eleCTruMioUS.com', tcp: '50001' }, // down
  { host: 'electrum1.bluewallet.io', tcp: '50001' },
  { host: 'electrum1.bluewallet.io', tcp: '50001' }, // 2x weight
  { host: 'electrum2.bluewallet.io', tcp: '50001' },
  { host: 'electrum3.bluewallet.io', tcp: '50001' },
  { host: 'electrum3.bluewallet.io', tcp: '50001' }, // 2x weight
];

let mainClient = false;
let mainConnected = false;
let wasConnectedAtLeastOnce = false;

async function connectMain() {
  let usingPeer = await getRandomHardcodedPeer();
  let savedPeer = await getSavedPeer();
  if (savedPeer && savedPeer.host && savedPeer.tcp) {
    usingPeer = savedPeer;
  }

  try {
    console.log('begin connection:', JSON.stringify(usingPeer));
    mainClient = new ElectrumClient(usingPeer.tcp, usingPeer.host, 'tcp');
    mainClient.onError = function(e) {
      console.log('ElectrumClient error: ' + e);
      mainConnected = false;
    };
    await mainClient.connect();
    const ver = await mainClient.server_version('2.7.11', '1.4');
    if (ver && ver[0]) {
      console.log('connected to ', ver);
      mainConnected = true;
      wasConnectedAtLeastOnce = true;
      // AsyncStorage.setItem(storageKey, JSON.stringify(peers));  TODO: refactor
    }
  } catch (e) {
    mainConnected = false;
    console.log('bad connection:', JSON.stringify(usingPeer), e);
  }

  if (!mainConnected) {
    console.log('retry');
    mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
    mainClient.reconnect = () => {}; // dirty hack to make it stop reconnecting
    mainClient.close();
    setTimeout(connectMain, 500);
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
  return hardcodedPeers[(hardcodedPeers.length * Math.random()) | 0];
}

async function getSavedPeer() {
  let host = await AsyncStorage.getItem(AppStorage.ELECTRUM_HOST);
  let port = await AsyncStorage.getItem(AppStorage.ELECTRUM_TCP_PORT);
  return { host, tcp: port };
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
module.exports.getBalanceByAddress = async function(address) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  let script = bitcoin.address.toOutputScript(address);
  let hash = bitcoin.crypto.sha256(script);
  let reversedHash = Buffer.from(reverse(hash));
  let balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
  balance.addr = address;
  return balance;
};

module.exports.getConfig = async function() {
  if (!mainClient) throw new Error('Electrum client is not connected');
  return {
    host: mainClient.host,
    port: mainClient.port,
    status: mainClient.status,
  };
};

/**
 *
 * @param address {String}
 * @returns {Promise<Array>}
 */
module.exports.getTransactionsByAddress = async function(address) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  let script = bitcoin.address.toOutputScript(address);
  let hash = bitcoin.crypto.sha256(script);
  let reversedHash = Buffer.from(reverse(hash));
  let history = await mainClient.blockchainScripthash_getHistory(reversedHash.toString('hex'));
  return history;
};

module.exports.ping = async function() {
  try {
    await mainClient.server_ping();
  } catch (_) {
    mainConnected = false;
    return false;
  }
  return true;
};

module.exports.getTransactionsFullByAddress = async function(address) {
  let txs = await this.getTransactionsByAddress(address);
  let ret = [];
  for (let tx of txs) {
    let full = await mainClient.blockchainTransaction_get(tx.tx_hash, true);
    full.address = address;
    for (let input of full.vin) {
      // now we need to fetch previous TX where this VIN became an output, so we can see its amount
      let prevTxForVin = await mainClient.blockchainTransaction_get(input.txid, true);
      if (prevTxForVin && prevTxForVin.vout && prevTxForVin.vout[input.vout]) {
        input.value = prevTxForVin.vout[input.vout].value;
        // also, we extract destination address from prev output:
        if (prevTxForVin.vout[input.vout].scriptPubKey && prevTxForVin.vout[input.vout].scriptPubKey.addresses) {
          input.addresses = prevTxForVin.vout[input.vout].scriptPubKey.addresses;
        }
      }
    }

    for (let output of full.vout) {
      if (output.scriptPubKey && output.scriptPubKey.addresses) output.addresses = output.scriptPubKey.addresses;
    }
    full.inputs = full.vin;
    full.outputs = full.vout;
    delete full.vin;
    delete full.vout;
    delete full.hex; // compact
    delete full.hash; // compact
    ret.push(full);
  }

  return ret;
};

/**
 *
 * @param addresses {Array}
 * @param batchsize {Number}
 * @returns {Promise<{balance: number, unconfirmed_balance: number, addresses: object}>}
 */
module.exports.multiGetBalanceByAddress = async function(addresses, batchsize) {
  batchsize = batchsize || 100;
  if (!mainClient) throw new Error('Electrum client is not connected');
  let ret = { balance: 0, unconfirmed_balance: 0, addresses: {} };

  let chunks = splitIntoChunks(addresses, batchsize);
  for (let chunk of chunks) {
    let scripthashes = [];
    let scripthash2addr = {};
    for (let addr of chunk) {
      let script = bitcoin.address.toOutputScript(addr);
      let hash = bitcoin.crypto.sha256(script);
      let reversedHash = Buffer.from(reverse(hash));
      reversedHash = reversedHash.toString('hex');
      scripthashes.push(reversedHash);
      scripthash2addr[reversedHash] = addr;
    }

    let balances = await mainClient.blockchainScripthash_getBalanceBatch(scripthashes);

    for (let bal of balances) {
      ret.balance += +bal.result.confirmed;
      ret.unconfirmed_balance += +bal.result.unconfirmed;
      ret.addresses[scripthash2addr[bal.param]] = bal.result;
    }
  }

  return ret;
};

module.exports.multiGetUtxoByAddress = async function(addresses, batchsize) {
  batchsize = batchsize || 100;
  if (!mainClient) throw new Error('Electrum client is not connected');
  let ret = {};

  let chunks = splitIntoChunks(addresses, batchsize);
  for (let chunk of chunks) {
    let scripthashes = [];
    let scripthash2addr = {};
    for (let addr of chunk) {
      let script = bitcoin.address.toOutputScript(addr);
      let hash = bitcoin.crypto.sha256(script);
      let reversedHash = Buffer.from(reverse(hash));
      reversedHash = reversedHash.toString('hex');
      scripthashes.push(reversedHash);
      scripthash2addr[reversedHash] = addr;
    }

    let results = await mainClient.blockchainScripthash_listunspentBatch(scripthashes);

    for (let utxos of results) {
      ret[scripthash2addr[utxos.param]] = utxos.result;
      for (let utxo of ret[scripthash2addr[utxos.param]]) {
        utxo.address = scripthash2addr[utxos.param];
        utxo.txId = utxo.tx_hash;
        utxo.vout = utxo.tx_pos;
        delete utxo.tx_pos;
        delete utxo.tx_hash;
      }
    }
  }

  return ret;
};

module.exports.multiGetHistoryByAddress = async function(addresses, batchsize) {
  batchsize = batchsize || 100;
  if (!mainClient) throw new Error('Electrum client is not connected');
  let ret = {};

  let chunks = splitIntoChunks(addresses, batchsize);
  for (let chunk of chunks) {
    let scripthashes = [];
    let scripthash2addr = {};
    for (let addr of chunk) {
      let script = bitcoin.address.toOutputScript(addr);
      let hash = bitcoin.crypto.sha256(script);
      let reversedHash = Buffer.from(reverse(hash));
      reversedHash = reversedHash.toString('hex');
      scripthashes.push(reversedHash);
      scripthash2addr[reversedHash] = addr;
    }

    let results = await mainClient.blockchainScripthash_getHistoryBatch(scripthashes);

    for (let history of results) {
      ret[scripthash2addr[history.param]] = history.result;
      for (let hist of ret[scripthash2addr[history.param]]) {
        hist.address = scripthash2addr[history.param];
      }
    }
  }

  return ret;
};

module.exports.multiGetTransactionByTxid = async function(txids, batchsize, verbose) {
  batchsize = batchsize || 81;
  // this value is fine-tuned so althrough wallets in test suite will occasionally
  // throw 'response too large (over 1,000,000 bytes', test suite will pass
  verbose = verbose !== false;
  if (!mainClient) throw new Error('Electrum client is not connected');
  let ret = {};

  let chunks = splitIntoChunks(txids, batchsize);
  for (let chunk of chunks) {
    let results = await mainClient.blockchainTransaction_getBatch(chunk, verbose);

    for (let txdata of results) {
      ret[txdata.param] = txdata.result;
    }
  }

  return ret;
};

/**
 * Simple waiter till `mainConnected` becomes true (which means
 * it Electrum was connected in other function), or timeout 30 sec.
 *
 *
 * @returns {Promise<Promise<*> | Promise<*>>}
 */
module.exports.waitTillConnected = async function() {
  let waitTillConnectedInterval = false;
  let retriesCounter = 0;
  return new Promise(function(resolve, reject) {
    waitTillConnectedInterval = setInterval(() => {
      if (mainConnected) {
        clearInterval(waitTillConnectedInterval);
        resolve(true);
      }

      if (wasConnectedAtLeastOnce && mainClient.status === 1) {
        clearInterval(waitTillConnectedInterval);
        mainConnected = true;
        resolve(true);
      }

      if (retriesCounter++ >= 30) {
        clearInterval(waitTillConnectedInterval);
        reject(new Error('Waiting for Electrum connection timeout'));
      }
    }, 1000);
  });
};

module.exports.estimateFees = async function() {
  if (!mainClient) throw new Error('Electrum client is not connected');
  const fast = await mainClient.blockchainEstimatefee(1);
  const medium = await mainClient.blockchainEstimatefee(5);
  const slow = await mainClient.blockchainEstimatefee(10);
  return { fast, medium, slow };
};

/**
 * Returns the estimated transaction fee to be confirmed within a certain number of blocks
 *
 * @param numberOfBlocks {number} The number of blocks to target for confirmation
 * @returns {Promise<number>} Satoshis per byte
 */
module.exports.estimateFee = async function(numberOfBlocks) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  numberOfBlocks = numberOfBlocks || 1;
  let coinUnitsPerKilobyte = await mainClient.blockchainEstimatefee(numberOfBlocks);
  if (coinUnitsPerKilobyte === -1) return 1;
  return Math.round(
    new BigNumber(coinUnitsPerKilobyte)
      .dividedBy(1024)
      .multipliedBy(100000000)
      .toNumber(),
  );
};

module.exports.broadcast = async function(hex) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  try {
    const broadcast = await mainClient.blockchainTransaction_broadcast(hex);
    return broadcast;
  } catch (error) {
    return error;
  }
};

module.exports.broadcastV2 = async function(hex) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  return mainClient.blockchainTransaction_broadcast(hex);
};

/**
 *
 * @param host
 * @param tcpPort
 * @returns {Promise<boolean>} Whether provided host:port is a valid electrum server
 */
module.exports.testConnection = async function(host, tcpPort) {
  let client = new ElectrumClient(tcpPort, host, 'tcp');
  try {
    await client.connect();
    await client.server_version('2.7.11', '1.4');
    await client.server_ping();

    client.keepAlive = () => {}; // dirty hack to make it stop reconnecting
    client.reconnect = () => {}; // dirty hack to make it stop reconnecting
    client.close();
    return true;
  } catch (_) {
    return false;
  }
};

module.exports.forceDisconnect = () => {
  mainClient.keepAlive = () => {}; // dirty hack to make it stop reconnecting
  mainClient.reconnect = () => {}; // dirty hack to make it stop reconnecting
  mainClient.close();
};

module.exports.hardcodedPeers = hardcodedPeers;

let splitIntoChunks = function(arr, chunkSize) {
  let groups = [];
  let i;
  for (i = 0; i < arr.length; i += chunkSize) {
    groups.push(arr.slice(i, i + chunkSize));
  }
  return groups;
};
