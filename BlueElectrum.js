import config from './config';

const BigNumber = require('bignumber.js');
const bitcoin = require('bitcoinjs-lib');
const reverse = require('buffer-reverse');
const ElectrumClient = require('electrum-client');

export const defaultPeer = { host: 'e1.electrumx.bitcoinvault.global', tcp: '50001' };
const hardcodedPeers = [
  { host: 'e1.electrumx.bitcoinvault.global', tcp: '50001' },
  { host: '157.245.20.66', tcp: '50001' },
];

let mainClient = false;
let mainConnected = false;
let wasConnectedAtLeastOnce = false;

async function connectMain() {
  const usingPeer = { host: config.host, tcp: config.port, protocol: config.protocol };
  try {
    console.log('begin connection:', JSON.stringify(usingPeer));
    mainClient = new ElectrumClient(usingPeer.tcp, usingPeer.host, usingPeer.protocol);
    mainClient.onError = function(e) {
      console.log('ElectrumClient error: ' + e);
      mainConnected = false;
    };
    await mainClient.connect();

    const ver = await mainClient.server_version('2.7.11', config.electrumXProtocolVersion);
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
 *
 * @param address {String}
 * @returns {Promise<Object>}
 */
module.exports.getBalanceByAddress = async function(address) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  const script = bitcoin.address.toOutputScript(address, config.network);
  const hash = bitcoin.crypto.sha256(script);
  const reversedHash = Buffer.from(reverse(hash));
  const balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
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
  const script = bitcoin.address.toOutputScript(address, config.network);
  const hash = bitcoin.crypto.sha256(script);
  const reversedHash = Buffer.from(reverse(hash));
  const history = await mainClient.blockchainScripthash_getHistory(reversedHash.toString('hex'));

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

module.exports.multiGetTransactionsFullByAddress = async function(addresses) {
  const addrTxMap = await this.multiGetHistoryByAddress(addresses);
  const txList = [];
  const ret = [];
  for (const addr in addrTxMap) {
    for (const tx of addrTxMap[addr]) {
      txList.push(tx.tx_hash);
    }
  }
  const txfull = await this.multiGetTransactionByTxid(txList);
  for (const txid in txfull) {
    const full = txfull[txid];
    for (const input of full.vin) {
      if (!input.txid) continue;
      // now we need to fetch previous TX where this VIN became an output, so we can see its amount
      const prevTxForVin = await mainClient.blockchainTransaction_get(input.txid, true);
      if (prevTxForVin && prevTxForVin.vout && prevTxForVin.vout[input.vout]) {
        input.value = prevTxForVin.vout[input.vout].value;
        // also, we extract destination address from prev output:
        if (prevTxForVin.vout[input.vout].scriptPubKey && prevTxForVin.vout[input.vout].scriptPubKey.addresses) {
          input.addresses = prevTxForVin.vout[input.vout].scriptPubKey.addresses;
        }
      }
    }
    for (const output of full.vout) {
      if (output.scriptPubKey && output.scriptPubKey.addresses) output.addresses = output.scriptPubKey.addresses;
    }
    full.inputs = full.vin;
    full.outputs = full.vout;
    delete full.vin;
    delete full.vout;
    delete full.hex;
    ret.push(full);
  }
  return ret;
};

module.exports.multiGetTransactionsFullByTxid = async function(txid_list) {
  const ret = [];
  const txfull = await this.multiGetTransactionByTxid(txid_list);
  for (const txid in txfull) {
    const full = txfull[txid];

    for (const input of full.vin) {
      if (!input.txid) continue;
      // now we need to fetch previous TX where this VIN became an output, so we can see its amount
      const prevTxForVin = await mainClient.blockchainTransaction_get(input.txid, true);
      if (prevTxForVin && prevTxForVin.vout && prevTxForVin.vout[input.vout]) {
        input.value = prevTxForVin.vout[input.vout].value;
        // also, we extract destination address from prev output:
        if (prevTxForVin.vout[input.vout].scriptPubKey && prevTxForVin.vout[input.vout].scriptPubKey.addresses) {
          input.addresses = prevTxForVin.vout[input.vout].scriptPubKey.addresses;
        }
      }
    }
    for (const output of full.vout) {
      if (output.scriptPubKey && output.scriptPubKey.addresses) output.addresses = output.scriptPubKey.addresses;
    }
    full.inputs = full.vin;
    full.outputs = full.vout;
    delete full.vin;
    delete full.vout;
    delete full.hex;
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
  const ret = { balance: 0, unconfirmed_balance: 0, incoming_balance: 0, outgoing_balance: 0, addresses: {} };

  const chunks = splitIntoChunks(addresses, batchsize);
  for (const chunk of chunks) {
    const scripthashes = [];
    const scripthash2addr = {};
    for (const addr of chunk) {
      const script = bitcoin.address.toOutputScript(addr, config.network);
      const hash = bitcoin.crypto.sha256(script);
      let reversedHash = Buffer.from(reverse(hash));
      reversedHash = reversedHash.toString('hex');
      scripthashes.push(reversedHash);
      scripthash2addr[reversedHash] = addr;
    }

    const balances = await mainClient.blockchainScripthash_getBalanceBatch(scripthashes);

    for (const bal of balances) {
      ret.incoming_balance += +bal.result.alert_incoming;
      ret.outgoing_balance += +bal.result.alert_outgoing;
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
  const ret = {};
  const res = [];
  const uniq = {};
  const chunks = splitIntoChunks(addresses, batchsize);
  for (const chunk of chunks) {
    const scripthashes = [];
    const scripthash2addr = {};
    for (const addr of chunk) {
      const script = bitcoin.address.toOutputScript(addr, config.network);
      const hash = bitcoin.crypto.sha256(script);
      let reversedHash = Buffer.from(reverse(hash));
      reversedHash = reversedHash.toString('hex');
      scripthashes.push(reversedHash);
      scripthash2addr[reversedHash] = addr;
    }

    const results = await mainClient.blockchainScripthash_listunspentBatch(scripthashes);

    for (const utxos of results) {
      ret[scripthash2addr[utxos.param]] = utxos.result;
      for (const utxo of ret[scripthash2addr[utxos.param]]) {
        utxo.address = scripthash2addr[utxos.param];
        utxo.txid = utxo.tx_hash;
        utxo.vout = utxo.tx_pos;
        utxo.spend_tx_num = utxo.spend_tx_num;
        res.push(utxo);
      }
    }
  }

  return res;
};

module.exports.multiGetHistoryByAddress = async function(addresses, batchsize) {
  batchsize = batchsize || 100;
  if (!mainClient) throw new Error('Electrum client is not connected');
  const ret = {};

  const chunks = splitIntoChunks(addresses, batchsize);
  for (const chunk of chunks) {
    const scripthashes = [];
    const scripthash2addr = {};
    for (const addr of chunk) {
      const script = bitcoin.address.toOutputScript(addr, config.network);
      const hash = bitcoin.crypto.sha256(script);
      let reversedHash = Buffer.from(reverse(hash));
      reversedHash = reversedHash.toString('hex');
      scripthashes.push(reversedHash);
      scripthash2addr[reversedHash] = addr;
    }

    const results = await mainClient.blockchainScripthash_getHistoryBatch(scripthashes);

    for (const history of results) {
      ret[scripthash2addr[history.param]] = history.result;
      for (const hist of ret[scripthash2addr[history.param]]) {
        hist.address = scripthash2addr[history.param];
      }
    }
  }

  return ret;
};

module.exports.multiGetTransactionByTxid = async function(txids, batchsize, verbose) {
  batchsize = batchsize || 100;
  verbose = verbose !== false;
  if (!mainClient) throw new Error('Electrum client is not connected');
  const ret = {};

  const chunks = splitIntoChunks(txids, batchsize);
  for (const chunk of chunks) {
    const results = await mainClient.blockchainTransaction_getBatch(chunk, verbose);
    for (const txdata of results) {
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
  let fast = await mainClient.blockchainEstimatefee(1);
  let medium = await mainClient.blockchainEstimatefee(5);
  let slow = await mainClient.blockchainEstimatefee(10);
  if (fast < 1) fast = 1;
  if (medium < 1) medium = 1;
  if (slow < 1) slow = 1;
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
  const coinUnitsPerKilobyte = await mainClient.blockchainEstimatefee(numberOfBlocks);
  if (coinUnitsPerKilobyte < 1) return 1;
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

/**
 *
 * @param host
 * @param tcpPort
 * @returns {Promise<boolean>} Whether provided host:port is a valid electrum server
 */
module.exports.testConnection = async function(host, tcpPort) {
  const client = new ElectrumClient(tcpPort, host, 'tcp');
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

const splitIntoChunks = function(arr, chunkSize) {
  const groups = [];
  let i;
  for (i = 0; i < arr.length; i += chunkSize) {
    groups.push(arr.slice(i, i + chunkSize));
  }
  return groups;
};
