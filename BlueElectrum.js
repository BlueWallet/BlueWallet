import AsyncStorage from '@react-native-community/async-storage';
import { Platform } from 'react-native';
import { AppStorage, LegacyWallet, SegwitBech32Wallet, SegwitP2SHWallet } from './class';
const bitcoin = require('bitcoinjs-lib');
const ElectrumClient = require('electrum-client');
let reverse = require('buffer-reverse');
let BigNumber = require('bignumber.js');

const storageKey = 'ELECTRUM_PEERS';
const defaultPeer = { host: 'electrum1.bluewallet.io', ssl: '443' };
const hardcodedPeers = [
  // { host: 'noveltybobble.coinjoined.com', tcp: '50001' }, // down
  // { host: 'electrum.be', tcp: '50001' },
  // { host: 'node.ispol.sk', tcp: '50001' }, // down
  // { host: '139.162.14.142', tcp: '50001' },
  // { host: 'electrum.coinucopia.io', tcp: '50001' }, // SLOW
  // { host: 'Bitkoins.nl', tcp: '50001' }, // down
  // { host: 'fullnode.coinkite.com', tcp: '50001' },
  // { host: 'preperfect.eleCTruMioUS.com', tcp: '50001' }, // down
  { host: 'electrum1.bluewallet.io', ssl: '443' },
  { host: 'electrum1.bluewallet.io', ssl: '443' }, // 2x weight
  { host: 'electrum2.bluewallet.io', ssl: '443' },
  { host: 'electrum3.bluewallet.io', ssl: '443' },
  { host: 'electrum3.bluewallet.io', ssl: '443' }, // 2x weight
];

let mainClient: ElectrumClient = false;
let mainConnected = false;
let wasConnectedAtLeastOnce = false;
let serverName = false;
let disableBatching = false;

let txhashHeightCache = {};

async function connectMain() {
  let usingPeer = await getRandomHardcodedPeer();
  let savedPeer = await getSavedPeer();
  if (savedPeer && savedPeer.host && (savedPeer.tcp || savedPeer.ssl)) {
    usingPeer = savedPeer;
  }

  try {
    console.log('begin connection:', JSON.stringify(usingPeer));
    mainClient = new ElectrumClient(usingPeer.ssl || usingPeer.tcp, usingPeer.host, usingPeer.ssl ? 'tls' : 'tcp');
    mainClient.onError = function(e) {
      if (Platform.OS === 'android' && mainConnected) {
        // android sockets are buggy and dont always issue CLOSE event, which actually makes the persistence code to reconnect.
        // so lets do it manually, but only if we were previously connected (mainConnected), otherwise theres other
        // code which does connection retries
        mainClient.close();
        mainConnected = false;
        setTimeout(connectMain, 500);
        console.warn('reconnecting after socket error');
        return;
      }
      mainConnected = false;
    };
    const ver = await mainClient.initElectrum({ client: 'bluewallet', version: '1.4' });
    if (ver && ver[0]) {
      console.log('connected to ', ver);
      serverName = ver[0];
      mainConnected = true;
      wasConnectedAtLeastOnce = true;
      if (ver[0].startsWith('ElectrumPersonalServer') || ver[0].startsWith('electrs')) {
        // TODO: once they release support for batching - disable batching only for lower versions
        disableBatching = true;
      }
      // AsyncStorage.setItem(storageKey, JSON.stringify(peers));  TODO: refactor
    }
  } catch (e) {
    mainConnected = false;
    console.log('bad connection:', JSON.stringify(usingPeer), e);
  }

  if (!mainConnected) {
    console.log('retry');
    mainClient.close && mainClient.close();
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
  let sslPort = await AsyncStorage.getItem(AppStorage.ELECTRUM_SSL_PORT);
  return { host, tcp: port, ssl: sslPort };
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
    status: mainClient.status && mainConnected ? 1 : 0,
    serverName,
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
  if (history.tx_hash) txhashHeightCache[history.tx_hash] = history.height; // cache tx height
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

    let balances = [];

    if (disableBatching) {
      for (let sh of scripthashes) {
        let balance = await mainClient.blockchainScripthash_getBalance(sh);
        balances.push({ result: balance, param: sh });
      }
    } else {
      balances = await mainClient.blockchainScripthash_getBalanceBatch(scripthashes);
    }

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

    let results = [];

    if (disableBatching) {
      // ElectrumPersonalServer doesnt support `blockchain.scripthash.listunspent`
    } else {
      results = await mainClient.blockchainScripthash_listunspentBatch(scripthashes);
    }

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

    let results = [];

    if (disableBatching) {
      for (let sh of scripthashes) {
        let history = await mainClient.blockchainScripthash_getHistory(sh);
        results.push({ result: history, param: sh });
      }
    } else {
      results = await mainClient.blockchainScripthash_getHistoryBatch(scripthashes);
    }

    for (let history of results) {
      ret[scripthash2addr[history.param]] = history.result;
      if (history.result[0]) txhashHeightCache[history.result[0].tx_hash] = history.result[0].height; // cache tx height
      for (let hist of ret[scripthash2addr[history.param]]) {
        hist.address = scripthash2addr[history.param];
      }
    }
  }

  return ret;
};

module.exports.multiGetTransactionByTxid = async function(txids, batchsize, verbose) {
  batchsize = batchsize || 61;
  // this value is fine-tuned so althrough wallets in test suite will occasionally
  // throw 'response too large (over 1,000,000 bytes', test suite will pass
  verbose = verbose !== false;
  if (!mainClient) throw new Error('Electrum client is not connected');
  let ret = {};
  txids = [...new Set(txids)]; // deduplicate just for any case

  let chunks = splitIntoChunks(txids, batchsize);
  for (let chunk of chunks) {
    let results = [];

    if (disableBatching) {
      for (let txid of chunk) {
        try {
          // in case of ElectrumPersonalServer it might not track some transactions (like source transactions for our transactions)
          // so we wrap it in try-catch
          let tx = await mainClient.blockchainTransaction_get(txid, verbose);
          if (typeof tx === 'string' && verbose) {
            // apparently electrum server (EPS?) didnt recognize VERBOSE parameter, and  sent us plain txhex instead of decoded tx.
            // lets decode it manually on our end then:
            tx = txhexToElectrumTransaction(tx);
            if (txhashHeightCache[txid]) {
              // got blockheight where this tx was confirmed
              tx.confirmations = this.estimateCurrentBlockheight() - txhashHeightCache[txid];
              if (tx.confirmations < 0) {
                // ugly fix for when estimator lags behind
                tx.confirmations = 1;
              }
              tx.time = this.calculateBlockTime(txhashHeightCache[txid]);
              tx.blocktime = this.calculateBlockTime(txhashHeightCache[txid]);
            }
          }
          results.push({ result: tx, param: txid });
        } catch (_) {}
      }
    } else {
      results = await mainClient.blockchainTransaction_getBatch(chunk, verbose);
    }

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
    }, 500);
  });
};

module.exports.estimateFees = async function() {
  const fast = await module.exports.estimateFee(1);
  const medium = await module.exports.estimateFee(18);
  const slow = await module.exports.estimateFee(144);
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

module.exports.serverFeatures = async function() {
  if (!mainClient) throw new Error('Electrum client is not connected');
  return mainClient.server_features();
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

module.exports.estimateCurrentBlockheight = function() {
  const baseTs = 1587570465609; // uS
  const baseHeight = 627179;
  return Math.floor(baseHeight + (+new Date() - baseTs) / 1000 / 60 / 9.5);
};

/**
 *
 * @param height
 * @returns {number} Timestamp in seconds
 */
module.exports.calculateBlockTime = function(height) {
  const baseTs = 1585837504; // sec
  const baseHeight = 624083;
  return baseTs + (height - baseHeight) * 10 * 60;
};

/**
 *
 * @param host
 * @param tcpPort
 * @param sslPort
 * @returns {Promise<boolean>} Whether provided host:port is a valid electrum server
 */
module.exports.testConnection = async function(host, tcpPort, sslPort) {
  let client = new ElectrumClient(sslPort || tcpPort, host, sslPort ? 'tls' : 'tcp');
  try {
    await client.connect();
    await client.server_version('2.7.11', '1.4');
    await client.server_ping();
    client.close();
    return true;
  } catch (_) {
    return false;
  }
};

module.exports.forceDisconnect = () => {
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

function txhexToElectrumTransaction(txhex) {
  let tx = bitcoin.Transaction.fromHex(txhex);

  let ret = {
    txid: tx.getId(),
    hash: tx.getId(),
    version: tx.version,
    size: Math.ceil(txhex.length / 2),
    vsize: tx.virtualSize(),
    weight: tx.weight(),
    locktime: tx.locktime,
    vin: [],
    vout: [],
    hex: txhex,
    blockhash: '',
    confirmations: 0,
    time: 0,
    blocktime: 0,
  };

  for (let inn of tx.ins) {
    let txinwitness = [];
    if (inn.witness[0]) txinwitness.push(inn.witness[0].toString('hex'));
    if (inn.witness[1]) txinwitness.push(inn.witness[1].toString('hex'));

    ret.vin.push({
      txid: reverse(inn.hash).toString('hex'),
      vout: inn.index,
      scriptSig: { hex: inn.script.toString('hex'), asm: '' },
      txinwitness,
      sequence: inn.sequence,
    });
  }

  let n = 0;
  for (let out of tx.outs) {
    let value = new BigNumber(out.value).dividedBy(100000000).toNumber();
    let address = false;
    let type = false;

    if (SegwitBech32Wallet.scriptPubKeyToAddress(out.script.toString('hex'))) {
      address = SegwitBech32Wallet.scriptPubKeyToAddress(out.script.toString('hex'));
      type = 'witness_v0_keyhash';
    } else if (SegwitP2SHWallet.scriptPubKeyToAddress(out.script.toString('hex'))) {
      address = SegwitP2SHWallet.scriptPubKeyToAddress(out.script.toString('hex'));
      type = '???'; // TODO
    } else if (LegacyWallet.scriptPubKeyToAddress(out.script.toString('hex'))) {
      address = LegacyWallet.scriptPubKeyToAddress(out.script.toString('hex'));
      type = '???'; // TODO
    }

    ret.vout.push({
      value,
      n,
      scriptPubKey: {
        asm: '',
        hex: out.script.toString('hex'),
        reqSigs: 1, // todo
        type,
        addresses: [address],
      },
    });
    n++;
  }
  return ret;
}
