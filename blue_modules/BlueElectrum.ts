import BigNumber from 'bignumber.js';
import * as bitcoin from 'bitcoinjs-lib';
import DefaultPreference from 'react-native-default-preference';
import RNFS from 'react-native-fs';
import Realm from 'realm';

import { LegacyWallet, SegwitBech32Wallet, SegwitP2SHWallet, TaprootWallet } from '../class';
import presentAlert from '../components/Alert';
import loc from '../loc';
import { GROUP_IO_BLUEWALLET } from './currency';
import { ElectrumServerItem } from '../screen/settings/ElectrumSettings';
import { triggerWarningHapticFeedback } from './hapticFeedback';
import { AlertButton } from 'react-native';

const ElectrumClient = require('electrum-client');
const net = require('net');
const tls = require('tls');

type Utxo = {
  height: number;
  value: number;
  address: string;
  txid: string;
  vout: number;
  wif?: string;
};

type ElectrumTransaction = {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: {
    txid: string;
    vout: number;
    scriptSig: { asm: string; hex: string };
    txinwitness: string[];
    sequence: number;
    addresses?: string[];
    value?: number;
  }[];
  vout: {
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      hex: string;
      reqSigs: number;
      type: string;
      addresses: string[];
    };
  }[];
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
};

type ElectrumTransactionWithHex = ElectrumTransaction & {
  hex: string;
};

export type MempoolTransaction = {
  height: 0;
  tx_hash: string;
  fee: number;
};

type Peer = {
  host: string;
  ssl?: number;
  tcp?: number;
};

export const ELECTRUM_HOST = 'electrum_host';
export const ELECTRUM_TCP_PORT = 'electrum_tcp_port';
export const ELECTRUM_SSL_PORT = 'electrum_ssl_port';
export const ELECTRUM_SERVER_HISTORY = 'electrum_server_history';
const ELECTRUM_CONNECTION_DISABLED = 'electrum_disabled';
const storageKey = 'ELECTRUM_PEERS';
const defaultPeer = { host: 'electrum1.bluewallet.io', ssl: 443 };
export const hardcodedPeers: Peer[] = [
  { host: 'mainnet.foundationdevices.com', ssl: 50002 },
  // { host: 'bitcoin.lukechilds.co', ssl: 50002 },
  // { host: 'electrum.jochen-hoenicke.de', ssl: '50006' },
  { host: 'electrum1.bluewallet.io', ssl: 443 },
  { host: 'electrum.acinq.co', ssl: 50002 },
  { host: 'electrum.bitaroo.net', ssl: 50002 },
];

export const suggestedServers: Peer[] = hardcodedPeers.map(peer => ({
  ...peer,
}));

let mainClient: typeof ElectrumClient | undefined;
let mainConnected: boolean = false;
let wasConnectedAtLeastOnce: boolean = false;
let serverName: string | false = false;
let disableBatching: boolean = false;
let connectionAttempt: number = 0;
let currentPeerIndex = Math.floor(Math.random() * hardcodedPeers.length);
let latestBlock: { height: number; time: number } | { height: undefined; time: undefined } = { height: undefined, time: undefined };
const txhashHeightCache: Record<string, number> = {};
let _realm: Realm | undefined;

async function _getRealm() {
  if (_realm) return _realm;

  const cacheFolderPath = RNFS.CachesDirectoryPath; // Path to cache folder
  const password = bitcoin.crypto.sha256(Buffer.from('fyegjitkyf[eqjnc.lf')).toString('hex');
  const buf = Buffer.from(password + password, 'hex');
  const encryptionKey = Int8Array.from(buf);
  const path = `${cacheFolderPath}/electrumcache.realm`; // Use cache folder path

  const schema = [
    {
      name: 'Cache',
      primaryKey: 'cache_key',
      properties: {
        cache_key: { type: 'string', indexed: true },
        cache_value: 'string', // stringified json
      },
    },
  ];

  // @ts-ignore schema doesn't match Realm's schema type
  _realm = await Realm.open({
    schema,
    path,
    encryptionKey,
    excludeFromIcloudBackup: true,
  });

  return _realm;
}

export const getPreferredServer = async (): Promise<ElectrumServerItem | undefined> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const host = (await DefaultPreference.get(ELECTRUM_HOST)) as string;
    const tcpPort = await DefaultPreference.get(ELECTRUM_TCP_PORT);
    const sslPort = await DefaultPreference.get(ELECTRUM_SSL_PORT);

    console.log('Getting preferred server:', { host, tcpPort, sslPort });

    if (!host) {
      console.warn('Preferred server host is undefined');
      return;
    }

    return {
      host,
      tcp: tcpPort ? Number(tcpPort) : undefined,
      ssl: sslPort ? Number(sslPort) : undefined,
    };
  } catch (error) {
    console.error('Error in getPreferredServer:', error);
    return undefined;
  }
};

export const removePreferredServer = async () => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    console.log('Removing preferred server');
    await DefaultPreference.clear(ELECTRUM_HOST);
    await DefaultPreference.clear(ELECTRUM_TCP_PORT);
    await DefaultPreference.clear(ELECTRUM_SSL_PORT);
  } catch (error) {
    console.error('Error in removePreferredServer:', error);
  }
};

export async function isDisabled(): Promise<boolean> {
  let result;
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const savedValue = await DefaultPreference.get(ELECTRUM_CONNECTION_DISABLED);
    console.log('Getting Electrum connection disabled state:', savedValue);
    if (savedValue === null) {
      result = false;
    } else {
      result = savedValue;
    }
  } catch (error) {
    console.error('Error getting Electrum connection disabled state:', error);
    result = false;
  }
  return !!result;
}

export async function setDisabled(disabled = true) {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  console.log('Setting Electrum connection disabled state to:', disabled);
  return DefaultPreference.set(ELECTRUM_CONNECTION_DISABLED, disabled ? '1' : '');
}

function getCurrentPeer() {
  return hardcodedPeers[currentPeerIndex];
}

/**
 * Returns NEXT hardcoded electrum server (increments index after use)
 */
function getNextPeer() {
  const peer = getCurrentPeer();
  currentPeerIndex++;
  if (currentPeerIndex + 1 >= hardcodedPeers.length) currentPeerIndex = 0;
  return peer;
}

async function getSavedPeer(): Promise<Peer | null> {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const host = (await DefaultPreference.get(ELECTRUM_HOST)) as string;
    const tcpPort = await DefaultPreference.get(ELECTRUM_TCP_PORT);
    const sslPort = await DefaultPreference.get(ELECTRUM_SSL_PORT);

    console.log('Getting saved peer:', { host, tcpPort, sslPort });

    if (!host) {
      return null;
    }

    if (sslPort) {
      return { host, ssl: Number(sslPort) };
    }

    if (tcpPort) {
      return { host, tcp: Number(tcpPort) };
    }

    return null;
  } catch (error) {
    console.error('Error in getSavedPeer:', error);
    return null;
  }
}

export async function connectMain(): Promise<void> {
  if (await isDisabled()) {
    console.log('Electrum connection disabled by user. Skipping connectMain call');
    return;
  }
  let usingPeer = getNextPeer();
  const savedPeer = await getSavedPeer();
  if (savedPeer && savedPeer.host && (savedPeer.tcp || savedPeer.ssl)) {
    usingPeer = savedPeer;
  }

  console.log('Using peer:', JSON.stringify(usingPeer));

  try {
    console.log('begin connection:', JSON.stringify(usingPeer));
    mainClient = new ElectrumClient(net, tls, usingPeer.ssl || usingPeer.tcp, usingPeer.host, usingPeer.ssl ? 'tls' : 'tcp');

    mainClient.onError = function (e: { message: string }) {
      console.log('electrum mainClient.onError():', e.message);
      logSubscriptionActivity(`Connection error: ${e.message}`);
      if (mainConnected) {
        // most likely got a timeout from electrum ping. lets reconnect
        // but only if we were previously connected (mainConnected), otherwise theres other
        // code which does connection retries
        mainClient?.close();
        mainClient = undefined;
        mainConnected = false;
        // dropping `mainConnected` flag ensures there wont be reconnection race condition if several
        // errors triggered
        console.log('reconnecting after socket error');
        logSubscriptionActivity('Reconnecting after socket error');
        setTimeout(connectMain, usingPeer.host.endsWith('.onion') ? 4000 : 500);
      }
    };
    const ver = await mainClient.initElectrum({ client: 'bluewallet', version: '1.4' });
    if (ver && ver[0]) {
      console.log('connected to ', ver);
      serverName = ver[0];
      mainConnected = true;
      wasConnectedAtLeastOnce = true;

      // If we have active subscriptions and are reconnecting, restore them
      if (activeScripthashSubscriptions.size > 0) {
        logSubscriptionActivity(`Reconnected to server, restoring ${activeScripthashSubscriptions.size} subscriptions`);
        // We'll resubscribe in the background after completing connection setup
        setTimeout(() => {
          resubscribeToActiveAddresses().catch(error => {
            logSubscriptionActivity(`Failed to resubscribe after reconnection: ${error instanceof Error ? error.message : String(error)}`);
          });
        }, 500);
      }

      if (ver[0].startsWith('ElectrumPersonalServer') || ver[0].startsWith('electrs') || ver[0].startsWith('Fulcrum')) {
        disableBatching = true;

        // exeptions for versions:
        const [electrumImplementation, electrumVersion] = ver[0].split(' ');
        switch (electrumImplementation) {
          case 'electrs':
            if (semVerToInt(electrumVersion) >= semVerToInt('0.9.0')) {
              disableBatching = false;
            }
            break;
          case 'electrs-esplora':
            // its a different one, and it does NOT support batching
            // nop
            break;
          case 'Fulcrum':
            if (semVerToInt(electrumVersion) >= semVerToInt('1.9.0')) {
              disableBatching = false;
            }
            break;
        }
      }
      const header = await mainClient.blockchainHeaders_subscribe();
      if (header && header.height) {
        latestBlock = {
          height: header.height,
          time: Math.floor(+new Date() / 1000),
        };
      }
      // AsyncStorage.setItem(storageKey, JSON.stringify(peers));  TODO: refactor
    }
  } catch (e) {
    mainConnected = false;
    console.log('bad connection:', JSON.stringify(usingPeer), e);
    mainClient?.close();
    mainClient = undefined;
  }

  if (!mainConnected) {
    console.log('retry');
    connectionAttempt = connectionAttempt + 1;
    mainClient?.close();
    mainClient = undefined;
    if (connectionAttempt >= 5) {
      presentNetworkErrorAlert(usingPeer);
    } else {
      console.log('reconnection attempt #', connectionAttempt);
      await new Promise(resolve => setTimeout(resolve, 500)); // sleep
      return connectMain();
    }
  }
}

export async function presentResetToDefaultsAlert(): Promise<boolean> {
  const hasPreferredServer = await getPreferredServer();
  const serverHistoryStr = await DefaultPreference.get(ELECTRUM_SERVER_HISTORY);
  const serverHistory = typeof serverHistoryStr === 'string' ? JSON.parse(serverHistoryStr) : [];
  return new Promise(resolve => {
    triggerWarningHapticFeedback();

    const buttons: AlertButton[] = [];

    if (hasPreferredServer?.host && (hasPreferredServer.tcp || hasPreferredServer.ssl)) {
      buttons.push({
        text: loc.settings.electrum_reset,
        onPress: async () => {
          try {
            await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
            await DefaultPreference.clear(ELECTRUM_HOST);
            await DefaultPreference.clear(ELECTRUM_SSL_PORT);
            await DefaultPreference.clear(ELECTRUM_TCP_PORT);
          } catch (e) {
            console.log(e); // Must be running on Android
          }
          resolve(true);
        },
        style: 'default',
      });
    }

    if (serverHistory.length > 0) {
      buttons.push({
        text: loc.settings.electrum_reset_to_default_and_clear_history,
        onPress: async () => {
          try {
            await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
            await DefaultPreference.clear(ELECTRUM_SERVER_HISTORY);
            await DefaultPreference.clear(ELECTRUM_HOST);
            await DefaultPreference.clear(ELECTRUM_SSL_PORT);
            await DefaultPreference.clear(ELECTRUM_TCP_PORT);
          } catch (e) {
            console.log(e); // Must be running on Android
          }
          resolve(true);
        },
        style: 'destructive',
      });
    }

    buttons.push({
      text: loc._.cancel,
      onPress: () => resolve(false),
      style: 'cancel',
    });

    presentAlert({
      title: loc.settings.electrum_reset,
      message: loc.settings.electrum_reset_to_default,
      buttons,
      options: { cancelable: true },
    });
  });
}

const presentNetworkErrorAlert = async (usingPeer?: Peer) => {
  if (await isDisabled()) {
    console.log(
      'Electrum connection disabled by user. Perhaps we are attempting to show this network error alert after the user disabled connections.',
    );
    return;
  }

  presentAlert({
    allowRepeat: false,
    title: loc.errors.network,
    message: loc.formatString(
      usingPeer ? loc.settings.electrum_unable_to_connect : loc.settings.electrum_error_connect,
      usingPeer ? { server: `${usingPeer.host}:${usingPeer.ssl ?? usingPeer.tcp}` } : {},
    ),
    buttons: [
      {
        text: loc.wallets.list_tryagain,
        onPress: () => {
          connectionAttempt = 0;
          mainClient?.close();
          mainClient = undefined;
          setTimeout(connectMain, 500);
        },
        style: 'default',
      },
      {
        text: loc.settings.electrum_reset,
        onPress: () => {
          presentResetToDefaultsAlert().then(result => {
            if (result) {
              connectionAttempt = 0;
              mainClient?.close();
              mainClient = undefined;
              setTimeout(connectMain, 500);
            }
          });
        },
        style: 'destructive',
      },
      {
        text: loc._.cancel,
        onPress: () => {
          connectionAttempt = 0;
          mainClient?.close();
          mainClient = undefined;
        },
        style: 'cancel',
      },
    ],
    options: { cancelable: false },
  });
};

/**
 * Returns random electrum server out of list of servers
 * previous electrum server told us. Nearly half of them is
 * usually offline.
 * Not used for now.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getRandomDynamicPeer(): Promise<Peer> {
  try {
    let peers = JSON.parse((await DefaultPreference.get(storageKey)) as string);
    peers = peers.sort(() => Math.random() - 0.5); // shuffle
    for (const peer of peers) {
      const ret: Peer = { host: peer[0], ssl: peer[1] };
      ret.host = peer[1];

      if (peer[1] === 's') {
        ret.ssl = peer[2];
      } else {
        ret.tcp = peer[2];
      }

      for (const item of peer[2]) {
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

export const getBalanceByAddress = async function (address: string): Promise<{ confirmed: number; unconfirmed: number }> {
  try {
    if (!mainClient) throw new Error('Electrum client is not connected');
    const script = bitcoin.address.toOutputScript(address);
    const hash = bitcoin.crypto.sha256(script);
    const reversedHash = Buffer.from(hash).reverse();
    const balance = await mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
    balance.addr = address;
    return balance;
  } catch (error) {
    console.error('Error in getBalanceByAddress:', error);
    throw error;
  }
};

export const getConfig = async function () {
  if (!mainClient) throw new Error('Electrum client is not connected');
  return {
    host: mainClient.host,
    port: mainClient.port,
    serverName,
    connected: mainClient.timeLastCall !== 0 && mainClient.status,
  };
};

export const getSecondsSinceLastRequest = function () {
  return mainClient && mainClient.timeLastCall ? (+new Date() - mainClient.timeLastCall) / 1000 : -1;
};

export const getTransactionsByAddress = async function (address: string, maxTransactions = 1000): Promise<ElectrumHistory[]> {
  if (!mainClient) throw new Error('Electrum client is not connected');
  const script = bitcoin.address.toOutputScript(address);
  const hash = bitcoin.crypto.sha256(script);
  const reversedHash = Buffer.from(hash).reverse();

  try {
    // First get transaction count without fetching all transactions
    const scriptHash = reversedHash.toString('hex');
    const status = await mainClient.blockchainScripthash_getHistory(scriptHash, true); // get only count

    // Check if we're dealing with an address with too many transactions
    if (Array.isArray(status) && status.length > maxTransactions) {
      throw new Error(`Addresses with history of > ${maxTransactions} transactions are not supported`);
    }

    // If within limits, proceed to fetch the full transaction history
    try {
      const history = await mainClient.blockchainScripthash_getHistory(reversedHash.toString('hex'));
      for (const h of history || []) {
        if (h.tx_hash) txhashHeightCache[h.tx_hash] = h.height; // cache tx height
      }

      return history;
    } catch (error) {
      // Check if this is a "history too large" error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('history too large') || errorMessage.includes('too many')) {
        console.warn(`Server response: history too large for address ${address}`);
        throw new Error(`Address history is too large: ${address}`);
      }
      throw error; // Rethrow for other errors
    }
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Map different server error messages to standardized error
    if (
      errorMessage.includes('history too large') || 
      errorMessage.includes('too many') ||
      errorMessage.includes('history of > ') ||
      errorMessage.includes('too large') 
    ) {
      throw new Error(`Address history is too large and cannot be processed`);
    }
    throw error;
  }
};

export const getMempoolTransactionsByAddress = async function (address: string): Promise<MempoolTransaction[]> {
  if (!mainClient) throw new Error('Electrum client is not connected');
  const script = bitcoin.address.toOutputScript(address);
  const hash = bitcoin.crypto.sha256(script);
  const reversedHash = Buffer.from(hash).reverse();
  return mainClient.blockchainScripthash_getMempool(reversedHash.toString('hex'));
};

export const ping = async function () {
  try {
    await mainClient.server_ping();
  } catch (_) {
    mainConnected = false;
    return false;
  }
  return true;
};

// exported only to be used in unit tests
export function txhexToElectrumTransaction(txhex: string): ElectrumTransactionWithHex {
  const tx = bitcoin.Transaction.fromHex(txhex);

  const ret: ElectrumTransactionWithHex = {
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

  if (txhashHeightCache[ret.txid]) {
    // got blockheight where this tx was confirmed
    ret.confirmations = estimateCurrentBlockheight() - txhashHeightCache[ret.txid];
    if (ret.confirmations < 0) {
      // ugly fix for when estimator lags behind
      ret.confirmations = 1;
    }
    ret.time = calculateBlockTime(txhashHeightCache[ret.txid]);
    ret.blocktime = calculateBlockTime(txhashHeightCache[ret.txid]);
  }

  for (const inn of tx.ins) {
    const txinwitness = [];
    if (inn.witness[0]) txinwitness.push(inn.witness[0].toString('hex'));
    if (inn.witness[1]) txinwitness.push(inn.witness[1].toString('hex'));

    ret.vin.push({
      txid: Buffer.from(inn.hash).reverse().toString('hex'),
      vout: inn.index,
      scriptSig: { hex: inn.script.toString('hex'), asm: '' },
      txinwitness,
      sequence: inn.sequence,
    });
  }

  let n = 0;
  for (const out of tx.outs) {
    const value = new BigNumber(out.value).dividedBy(100000000).toNumber();
    let address: false | string = false;
    let type: false | string = false;

    if (SegwitBech32Wallet.scriptPubKeyToAddress(out.script.toString('hex'))) {
      address = SegwitBech32Wallet.scriptPubKeyToAddress(out.script.toString('hex'));
      type = 'witness_v0_keyhash';
    } else if (SegwitP2SHWallet.scriptPubKeyToAddress(out.script.toString('hex'))) {
      address = SegwitP2SHWallet.scriptPubKeyToAddress(out.script.toString('hex'));
      type = '???'; // TODO
    } else if (LegacyWallet.scriptPubKeyToAddress(out.script.toString('hex'))) {
      address = LegacyWallet.scriptPubKeyToAddress(out.script.toString('hex'));
      type = '???'; // TODO
    } else {
      address = TaprootWallet.scriptPubKeyToAddress(out.script.toString('hex'));
      type = 'witness_v1_taproot';
    }

    if (!address) {
      throw new Error('Internal error: unable to decode address from output script');
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

export const getTransactionsFullByAddress = async (address: string): Promise<ElectrumTransaction[]> => {
  const txs = await getTransactionsByAddress(address);
  const ret: ElectrumTransaction[] = [];
  for (const tx of txs) {
    let full;
    try {
      full = await mainClient.blockchainTransaction_get(tx.tx_hash, true);
    } catch (error: any) {
      if (String(error?.message ?? error).startsWith('verbose transactions are currently unsupported')) {
        // apparently, stupid esplora instead of returning txhex when it cant return verbose tx started
        // throwing a proper exception. lets fetch txhex manually and decode on our end
        const txhex = await mainClient.blockchainTransaction_get(tx.tx_hash, false);
        full = txhexToElectrumTransaction(txhex);
      } else {
        // nope, its something else
        throw new Error(String(error?.message ?? error));
      }
    }
    full.address = address;
    for (const input of full.vin) {
      // now we need to fetch previous TX where this VIN became an output, so we can see its amount
      let prevTxForVin;
      try {
        prevTxForVin = await mainClient.blockchainTransaction_get(input.txid, true);
      } catch (error: any) {
        if (String(error?.message ?? error).startsWith('verbose transactions are currently unsupported')) {
          // apparently, stupid esplora instead of returning txhex when it cant return verbose tx started
          // throwing a proper exception. lets fetch txhex manually and decode on our end
          const txhex = await mainClient.blockchainTransaction_get(input.txid, false);
          prevTxForVin = txhexToElectrumTransaction(txhex);
        } else {
          // nope, its something else
          throw new Error(String(error?.message ?? error));
        }
      }
      if (prevTxForVin && prevTxForVin.vout && prevTxForVin.vout[input.vout]) {
        input.value = prevTxForVin.vout[input.vout].value;
        // also, we extract destination address from prev output:
        if (prevTxForVin.vout[input.vout].scriptPubKey && prevTxForVin.vout[input.vout].scriptPubKey.addresses) {
          input.addresses = prevTxForVin.vout[input.vout].scriptPubKey.addresses;
        }
        // in bitcoin core 22.0.0+ they removed `.addresses` and replaced it with plain `.address`:
        if (prevTxForVin.vout[input.vout]?.scriptPubKey?.address) {
          input.addresses = [prevTxForVin.vout[input.vout].scriptPubKey.address];
        }
      }
    }

    for (const output of full.vout) {
      if (output?.scriptPubKey && output.scriptPubKey.addresses) output.addresses = output.scriptPubKey.addresses;
      // in bitcoin core 22.0.0+ they removed `.addresses` and replaced it with plain `.address`:
      if (output?.scriptPubKey?.address) output.addresses = [output.scriptPubKey.address];
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

type MultiGetBalanceResponse = {
  balance: number;
  unconfirmed_balance: number;
  addresses: Record<string, { confirmed: number; unconfirmed: number }>;
};

export const multiGetBalanceByAddress = async (addresses: string[], batchsize: number = 200): Promise<MultiGetBalanceResponse> => {
  if (!mainClient) throw new Error('Electrum client is not connected');
  const ret = {
    balance: 0,
    unconfirmed_balance: 0,
    addresses: {} as Record<string, { confirmed: number; unconfirmed: number }>,
  };

  const chunks = splitIntoChunks(addresses, batchsize);
  for (const chunk of chunks) {
    const scripthashes = [];
    const scripthash2addr: Record<string, string> = {};
    for (const addr of chunk) {
      const script = bitcoin.address.toOutputScript(addr);
      const hash = bitcoin.crypto.sha256(script);
      const reversedHash = Buffer.from(hash).reverse().toString('hex');
      scripthashes.push(reversedHash);
      scripthash2addr[reversedHash] = addr;
    }

    let balances = [];

    if (disableBatching) {
      const promises = [];
      const index2scripthash: Record<number, string> = {};
      for (let promiseIndex = 0; promiseIndex < scripthashes.length; promiseIndex++) {
        promises.push(mainClient.blockchainScripthash_getBalance(scripthashes[promiseIndex]));
        index2scripthash[promiseIndex] = scripthashes[promiseIndex];
      }
      const promiseResults = await Promise.all(promises);
      for (let resultIndex = 0; resultIndex < promiseResults.length; resultIndex++) {
        balances.push({ result: promiseResults[resultIndex], param: index2scripthash[resultIndex] });
      }
    } else {
      balances = await mainClient.blockchainScripthash_getBalanceBatch(scripthashes);
    }

    for (const bal of balances) {
      if (bal.error) console.warn('multiGetBalanceByAddress():', bal.error);
      ret.balance += +bal.result.confirmed;
      ret.unconfirmed_balance += +bal.result.unconfirmed;
      ret.addresses[scripthash2addr[bal.param]] = bal.result;
    }
  }

  return ret;
};

export const multiGetUtxoByAddress = async function (addresses: string[], batchsize: number = 100): Promise<Record<string, Utxo[]>> {
  if (!mainClient) throw new Error('Electrum client is not connected');
  const ret: Record<string, any> = {};

  const chunks = splitIntoChunks(addresses, batchsize);
  for (const chunk of chunks) {
    const scripthashes = [];
    const scripthash2addr: Record<string, string> = {};
    for (const addr of chunk) {
      const script = bitcoin.address.toOutputScript(addr);
      const hash = bitcoin.crypto.sha256(script);
      const reversedHash = Buffer.from(hash).reverse().toString('hex');
      scripthashes.push(reversedHash);
      scripthash2addr[reversedHash] = addr;
    }

    let results = [];

    if (disableBatching) {
      // ElectrumPersonalServer doesnt support `blockchain.scripthash.listunspent`
      // electrs OTOH supports it, but we dont know it we are currently connected to it or to EPS
      // so it is pretty safe to do nothing, as caller can derive UTXO from stored transactions
    } else {
      results = await mainClient.blockchainScripthash_listunspentBatch(scripthashes);
    }

    for (const utxos of results) {
      ret[scripthash2addr[utxos.param]] = utxos.result;
      for (const utxo of ret[scripthash2addr[utxos.param]]) {
        utxo.address = scripthash2addr[utxos.param];
        utxo.txid = utxo.tx_hash;
        utxo.vout = utxo.tx_pos;
        delete utxo.tx_pos;
        delete utxo.tx_hash;
      }
    }
  }

  return ret;
};

export type ElectrumHistory = {
  tx_hash: string;
  height: number;
  address: string;
};

export const multiGetHistoryByAddress = async function (
  addresses: string[],
  batchsize: number = 100,
): Promise<Record<string, ElectrumHistory[]>> {
  if (!mainClient) throw new Error('Electrum client is not connected');
  const ret: Record<string, ElectrumHistory[]> = {};

  const chunks = splitIntoChunks(addresses, batchsize);
  for (const chunk of chunks) {
    const scripthashes = [];
    const scripthash2addr: Record<string, string> = {};
    for (const addr of chunk) {
      const script = bitcoin.address.toOutputScript(addr);
      const hash = bitcoin.crypto.sha256(script);
      const reversedHash = Buffer.from(hash).reverse().toString('hex');
      scripthashes.push(reversedHash);
      scripthash2addr[reversedHash] = addr;
    }

    let results = [];

    if (disableBatching) {
      const promises = [];
      const index2scripthash: Record<number, string> = {};
      for (let promiseIndex = 0; promiseIndex < scripthashes.length; promiseIndex++) {
        index2scripthash[promiseIndex] = scripthashes[promiseIndex];
        promises.push(mainClient.blockchainScripthash_getHistory(scripthashes[promiseIndex]));
      }
      const histories = await Promise.all(promises);
      for (let historyIndex = 0; historyIndex < histories.length; historyIndex++) {
        results.push({ result: histories[historyIndex], param: index2scripthash[historyIndex] });
      }
    } else {
      results = await mainClient.blockchainScripthash_getHistoryBatch(scripthashes);
    }

    for (const history of results) {
      if (history.error) console.warn('multiGetHistoryByAddress():', history.error);
      ret[scripthash2addr[history.param]] = history.result || [];
      for (const result of history.result || []) {
        if (result.tx_hash) txhashHeightCache[result.tx_hash] = result.height; // cache tx height
      }

      for (const hist of ret[scripthash2addr[history.param]]) {
        hist.address = scripthash2addr[history.param];
      }
    }
  }

  return ret;
};

// if verbose === true ? Record<string, ElectrumTransaction> : Record<string, string>
type MultiGetTransactionByTxidResult<T extends boolean> = T extends true ? Record<string, ElectrumTransaction> : Record<string, string>;

// TODO: this function returns different results based on the value of `verboseParam`, consider splitting it into two
export async function multiGetTransactionByTxid<T extends boolean>(
  txids: string[],
  verbose: T,
  batchsize: number = 45,
): Promise<MultiGetTransactionByTxidResult<T>> {
  txids = txids.filter(txid => !!txid); // failsafe: removing 'undefined' or other falsy stuff from txids array
  // this value is fine-tuned so althrough wallets in test suite will occasionally
  // throw 'response too large (over 1,000,000 bytes', test suite will pass
  if (!mainClient) throw new Error('Electrum client is not connected');
  const ret: MultiGetTransactionByTxidResult<T> = {};
  txids = [...new Set(txids)]; // deduplicate just for any case

  // lets try cache first:
  const realm = await _getRealm();
  const cacheKeySuffix = verbose ? '_verbose' : '_non_verbose';
  const keysCacheMiss = [];
  for (const txid of txids) {
    const jsonString = realm.objectForPrimaryKey('Cache', txid + cacheKeySuffix); // search for a realm object with a primary key
    if (jsonString && jsonString.cache_value) {
      try {
        ret[txid] = JSON.parse(jsonString.cache_value as string);
      } catch (error) {
        console.log(error, 'cache failed to parse', jsonString.cache_value);
      }
    }

    if (!ret[txid]) keysCacheMiss.push(txid);
  }

  if (keysCacheMiss.length === 0) {
    return ret;
  }

  txids = keysCacheMiss;
  // end cache

  const chunks = splitIntoChunks(txids, batchsize);
  for (const chunk of chunks) {
    let results = [];

    if (disableBatching) {
      try {
        // in case of ElectrumPersonalServer it might not track some transactions (like source transactions for our transactions)
        // so we wrap it in try-catch. note, when `Promise.all` fails we will get _zero_ results, but we have a fallback for that
        const promises = [];
        const index2txid: Record<number, string> = {};
        for (let promiseIndex = 0; promiseIndex < chunk.length; promiseIndex++) {
          const txid = chunk[promiseIndex];
          index2txid[promiseIndex] = txid;
          promises.push(mainClient.blockchainTransaction_get(txid, verbose));
        }

        const transactionResults = await Promise.all(promises);
        for (let resultIndex = 0; resultIndex < transactionResults.length; resultIndex++) {
          let tx = transactionResults[resultIndex];
          if (typeof tx === 'string' && verbose) {
            // apparently electrum server (EPS?) didnt recognize VERBOSE parameter, and  sent us plain txhex instead of decoded tx.
            // lets decode it manually on our end then:
            tx = txhexToElectrumTransaction(tx);
          }
          const txid = index2txid[resultIndex];
          results.push({ result: tx, param: txid });
        }
      } catch (error: any) {
        if (String(error?.message ?? error).startsWith('verbose transactions are currently unsupported')) {
          // electrs-esplora. cant use verbose, so fetching txs one by one and decoding locally
          for (const txid of chunk) {
            try {
              let tx = await mainClient.blockchainTransaction_get(txid, false);
              tx = txhexToElectrumTransaction(tx);
              results.push({ result: tx, param: txid });
            } catch (error) {
              // Changed from err to error
              console.log(error);
            }
          }
        } else {
          // fallback. pretty sure we are connected to EPS.  we try getting transactions one-by-one. this way we wont
          // fail and only non-tracked by EPS transactions will be omitted
          for (const txid of chunk) {
            try {
              let tx = await mainClient.blockchainTransaction_get(txid, verbose);
              if (typeof tx === 'string' && verbose) {
                // apparently electrum server (EPS?) didnt recognize VERBOSE parameter, and  sent us plain txhex instead of decoded tx.
                // lets decode it manually on our end then:
                tx = txhexToElectrumTransaction(tx);
              }
              results.push({ result: tx, param: txid });
            } catch (error) {
              // Changed from err to error
              console.log(error);
            }
          }
        }
      }
    } else {
      results = await mainClient.blockchainTransaction_getBatch(chunk, verbose);
    }

    for (const txdata of results) {
      if (txdata.error && txdata.error.code === -32600) {
        // response too large
        // lets do single call, that should go through okay:
        txdata.result = await mainClient.blockchainTransaction_get(txdata.param, false);
        // since we used VERBOSE=false, server sent us plain txhex which we must decode on our end:
        txdata.result = txhexToElectrumTransaction(txdata.result);
      }
      ret[txdata.param] = txdata.result;
      // @ts-ignore: hex property
      if (ret[txdata.param]) delete ret[txdata.param].hex; // compact
    }
  }

  // in bitcoin core 22.0.0+ they removed `.addresses` and replaced it with plain `.address`:
  for (const txid of Object.keys(ret)) {
    const tx = ret[txid];
    if (typeof tx === 'string') continue;
    for (const vout of tx?.vout ?? []) {
      // @ts-ignore: address is not in type definition
      if (vout?.scriptPubKey?.address) vout.scriptPubKey.addresses = [vout.scriptPubKey.address];
    }
  }

  // saving cache:
  try {
    realm.write(() => {
      for (const txid of Object.keys(ret)) {
        const tx = ret[txid];
        // dont cache immature txs, but only for 'verbose', since its fully decoded tx jsons. non-verbose are just plain
        // strings txhex
        if (verbose && typeof tx !== 'string' && (!tx?.confirmations || tx.confirmations < 7)) {
          continue;
        }

        realm.create(
          'Cache',
          {
            cache_key: txid + cacheKeySuffix,
            cache_value: JSON.stringify(ret[txid]),
          },
          Realm.UpdateMode.Modified,
        );
      }
    });
  } catch (writeError) {
    console.error('Failed to write transaction cache:', writeError);
  }

  return ret;
}

/**
 * Simple waiter till `mainConnected` becomes true (which means
 * it Electrum was connected in other function), or timeout 30 sec.
 */
export const waitTillConnected = async function (): Promise<boolean> {
  let waitTillConnectedInterval: NodeJS.Timeout | undefined;
  let retriesCounter = 0;
  if (await isDisabled()) {
    console.warn('Electrum connections disabled by user. waitTillConnected skipping...');
    return false;
  }
  return new Promise(function (resolve, reject) {
    waitTillConnectedInterval = setInterval(() => {
      if (mainConnected) {
        clearInterval(waitTillConnectedInterval);
        return resolve(true);
      }

      if (wasConnectedAtLeastOnce && mainClient.status === 1) {
        clearInterval(waitTillConnectedInterval);
        mainConnected = true;
        return resolve(true);
      }

      if (wasConnectedAtLeastOnce && retriesCounter++ >= 150) {
        // `wasConnectedAtLeastOnce` needed otherwise theres gona be a race condition with the code that connects
        // electrum during app startup
        clearInterval(waitTillConnectedInterval);
        presentNetworkErrorAlert();
        reject(new Error('Waiting for Electrum connection timeout'));
      }
    }, 100);
  });
};

// Returns the value at a given percentile in a sorted numeric array.
// "Linear interpolation between closest ranks" method
function percentile(arr: number[], p: number) {
  if (arr.length === 0) return 0;
  if (typeof p !== 'number') throw new TypeError('p must be a number');
  if (p <= 0) return arr[0];
  if (p >= 1) return arr[arr.length - 1];

  const index = (arr.length - 1) * p;
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index % 1;

  if (upper >= arr.length) return arr[lower];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

/**
 * The histogram is an array of [fee, vsize] pairs, where vsizen is the cumulative virtual size of mempool transactions
 * with a fee rate in the interval [feen-1, feen], and feen-1 > feen.
 */
export const calcEstimateFeeFromFeeHistorgam = function (numberOfBlocks: number, feeHistorgram: number[][]) {
  // first, transforming histogram:
  let totalVsize = 0;
  const histogramToUse = [];
  for (const h of feeHistorgram) {
    let [fee, vsize] = h;
    let timeToStop = false;

    if (totalVsize + vsize >= 1000000 * numberOfBlocks) {
      vsize = 1000000 * numberOfBlocks - totalVsize; // only the difference between current summarized sige to tip of the block
      timeToStop = true;
    }

    histogramToUse.push({ fee, vsize });
    totalVsize += vsize;
    if (timeToStop) break;
  }

  // now we have histogram of precisely size for numberOfBlocks.
  // lets spread it into flat array so its easier to calculate percentile:
  let histogramFlat: number[] = [];
  for (const hh of histogramToUse) {
    histogramFlat = histogramFlat.concat(Array(Math.round(hh.vsize / 25000)).fill(hh.fee));
    // division is needed so resulting flat array is not too huge
  }

  histogramFlat = histogramFlat.sort(function (a, b) {
    return a - b;
  });

  return Math.round(percentile(histogramFlat, 0.5) || 1);
};

export const estimateFees = async function (): Promise<{ fast: number; medium: number; slow: number }> {
  let histogram;
  let timeoutId;
  try {
    histogram = await Promise.race([
      mainClient.mempool_getFeeHistogram(),
      new Promise(resolve => (timeoutId = setTimeout(resolve, 15000))),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }

  // fetching what electrum (which uses bitcoin core) thinks about fees:
  const _fast = await estimateFee(1);
  const _medium = await estimateFee(18);
  const _slow = await estimateFee(144);

  /**
   * sanity check, see
   * @see https://github.com/cculianu/Fulcrum/issues/197
   * (fallback to bitcoin core estimates)
   */
  if (!histogram || histogram?.[0]?.[0] > 1000) return { fast: _fast, medium: _medium, slow: _slow };

  // calculating fast fees from mempool:
  const fast = Math.max(2, calcEstimateFeeFromFeeHistorgam(1, histogram));
  // recalculating medium and slow fees using bitcoincore estimations only like relative weights:
  // (minimum 1 sat, just for any case)
  const medium = Math.max(1, Math.round((fast * _medium) / _fast));
  const slow = Math.max(1, Math.round((fast * _slow) / _fast));
  return { fast, medium, slow };
};

/**
 * Returns the estimated transaction fee to be confirmed within a certain number of blocks
 *
 * @param numberOfBlocks {number} The number of blocks to target for confirmation
 * @returns {Promise<number>} Satoshis per byte
 */
export const estimateFee = async function (numberOfBlocks: number): Promise<number> {
  if (!mainClient) throw new Error('Electrum client is not connected');
  numberOfBlocks = numberOfBlocks || 1;
  const coinUnitsPerKilobyte = await mainClient.blockchainEstimatefee(numberOfBlocks);
  if (coinUnitsPerKilobyte === -1) return 1;
  return Math.round(new BigNumber(coinUnitsPerKilobyte).dividedBy(1024).multipliedBy(100000000).toNumber());
};

export const serverFeatures = async function () {
  if (!mainClient) throw new Error('Electrum client is not connected');
  return mainClient.server_features();
};

export const broadcast = async function (hex: string) {
  if (!mainClient) throw new Error('Electrum client is not connected');
  try {
    const res = await mainClient.blockchainTransaction_broadcast(hex);
    return res;
  } catch (error) {
    return error;
  }
};

export const broadcastV2 = async function (hex: string): Promise<string> {
  if (!mainClient) throw new Error('Electrum client is not connected');
  return mainClient.blockchainTransaction_broadcast(hex);
};

export const estimateCurrentBlockheight = function (): number {
  if (latestBlock.height) {
    const timeDiff = Math.floor(+new Date() / 1000) - latestBlock.time;
    const extraBlocks = Math.floor(timeDiff / (9.93 * 60));
    return latestBlock.height + extraBlocks;
  }

  const baseTs = 1587570465609; // uS
  const baseHeight = 627179;
  return Math.floor(baseHeight + (+new Date() - baseTs) / 1000 / 60 / 9.93);
};

export const calculateBlockTime = function (height: number): number {
  if (latestBlock.height) {
    return Math.floor(latestBlock.time + (height - latestBlock.height) * 9.93 * 60);
  }

  const baseTs = 1585837504; // sec
  const baseHeight = 624083;
  return Math.floor(baseTs + (height - baseHeight) * 9.93 * 60);
};

/**
 * @returns {Promise<boolean>} Whether provided host:port is a valid electrum server
 */
export const testConnection = async function (host: string, tcpPort?: number, sslPort?: number): Promise<boolean> {
  const client = new ElectrumClient(net, tls, sslPort || tcpPort, host, sslPort ? 'tls' : 'tcp');

  client.onError = () => {}; // mute
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    const rez = await Promise.race([
      new Promise(resolve => {
        timeoutId = setTimeout(() => resolve('timeout'), 5000);
      }),
      client.connect(),
    ]);
    if (rez === 'timeout') return false;

    await client.server_version('2.7.11', '1.4');
    await client.server_ping();
    return true;
  } catch (_) {
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    client.close();
  }

  return false;
};

export const forceDisconnect = (): void => {
  mainClient?.close();
};

export const setBatchingDisabled = () => {
  disableBatching = true;
};

export const setBatchingEnabled = () => {
  disableBatching = false;
};

const splitIntoChunks = function (arr: any[], chunkSize: number) {
  const groups = [];
  let i;
  for (i = 0; i < arr.length; i += chunkSize) {
    groups.push(arr.slice(i, i + chunkSize));
  }
  return groups;
};

const semVerToInt = function (semver: string): number {
  if (!semver) return 0;
  if (semver.split('.').length !== 3) return 0;

  const ret = Number(semver.split('.')[0]) * 1000000 + Number(semver.split('.')[1]) * 1000 + Number(semver.split('.')[2]) * 1;

  if (isNaN(ret)) return 0;

  return ret;
};

type AddressSubscriber = {
  onUpdate: (
    balance: { confirmed: number; unconfirmed: number },
    txs: ElectrumHistory[],
    mempool?: MempoolTransaction[],
    txEstimate?: { eta: string; satPerVbyte: number | null },
  ) => void;
  onError?: (error: Error) => void;
  incomingOnly?: boolean; // New flag to indicate we only care about incoming transactions
};

// Dictionary to track subscriptions by address
const addressSubscriptions: Record<string, AddressSubscriber[]> = {};
// Track active scripthash subscriptions for reconnection
const activeScripthashSubscriptions = new Set<string>();

/**
 * Logs subscription activity with timestamp and detailed transaction info when available
 * Only logs details for unconfirmed transactions
 */
const logSubscriptionActivity = (
  message: string,
  data?: any,
  txDetails?: {
    txid?: string;
    amount?: number;
    sender?: string[];
    recipient?: string[];
    type?: 'incoming' | 'outgoing';
    confirmations?: number;
    fee?: number;
    eta?: string;
    satPerVbyte?: number | null;
  },
) => {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] Subscription: ${message}`;

  // Log basic data if provided
  if (data) {
    logMessage += ` | ${typeof data === 'object' ? JSON.stringify(data) : data}`;
  }

  // Only log detailed transaction information for unconfirmed transactions
  if (txDetails && (!txDetails.confirmations || txDetails.confirmations === 0)) {
    // Add emoji for incoming transactions to make them stand out in logs
    const prefix = txDetails.type === 'incoming' ? '🔔 INCOMING PAYMENT: ' : '';
    
    console.log(`${prefix}${logMessage}`);
    console.log('Transaction Details (Unconfirmed):');
    if (txDetails.txid) console.log(`- TXID: ${txDetails.txid}`);
    if (txDetails.type) console.log(`- Type: ${txDetails.type}`);
    if (txDetails.amount !== undefined) console.log(`- Amount: ${txDetails.amount} BTC (${txDetails.amount * 100000000} satoshis)`);
    if (txDetails.confirmations !== undefined) console.log(`- Confirmations: ${txDetails.confirmations}`);
    if (txDetails.fee !== undefined) console.log(`- Fee: ${txDetails.fee} BTC`);
    if (txDetails.sender && txDetails.sender.length) console.log(`- From: ${txDetails.sender.join(', ')}`);
    if (txDetails.recipient && txDetails.recipient.length) console.log(`- To: ${txDetails.recipient.join(', ')}`);
    if (txDetails.eta) console.log(`- ETA: ${txDetails.eta}`);
    if (txDetails.satPerVbyte) console.log(`- Fee rate: ${txDetails.satPerVbyte} sat/vbyte`);
    console.log('-----------------------------------');
  } else {
    console.log(logMessage);
  }
};

/**
 * Subscribe to address balance and history updates
 * @param address Bitcoin address to monitor
 * @param subscriber Subscriber object with callbacks
 * @param incomingOnly If true, only notify on incoming transactions (default: true)
 */
export const subscribeToAddress = async (
  address: string, 
  subscriber: AddressSubscriber,
): Promise<void> => {
  if (!mainClient) throw new Error('Electrum client is not connected');

  // Default to incomingOnly=true if not specified
  if (subscriber.incomingOnly === undefined) {
    subscriber.incomingOnly = true;
  }

  logSubscriptionActivity(`Adding subscription for address: ${address} (incomingOnly: ${subscriber.incomingOnly})`);

  // Add subscriber to the list
  if (!addressSubscriptions[address]) {
    addressSubscriptions[address] = [];
  }
  addressSubscriptions[address].push(subscriber);

  try {
    // Check if the address has too many transactions before attempting to subscribe
    try {
      // Get initial data - this will throw if too many transactions
      const balance = await getBalanceByAddress(address);
      const history = await getTransactionsByAddress(address);

      // Continue with normal subscription flow
      const script = bitcoin.address.toOutputScript(address);
      const hash = bitcoin.crypto.sha256(script);
      const reversedHash = Buffer.from(hash).reverse().toString('hex');

      // Track this subscription for reconnection purposes
      activeScripthashSubscriptions.add(reversedHash);

      // Subscribe to scripthash with fallbacks
      try {
        await mainClient.blockchainScripthash_subscribe(reversedHash);
        logSubscriptionActivity(`Successfully subscribed to scripthash: ${reversedHash} for address: ${address}`);
      } catch (subError) {
        // If the standard method fails, try alternatives
        logSubscriptionActivity(`Failed to subscribe with standard method: ${String(subError)}. Trying alternatives...`);

        if (typeof mainClient.blockchain_scripthash_subscribe === 'function') {
          await mainClient.blockchain_scripthash_subscribe(reversedHash);
          logSubscriptionActivity(`Subscribed using alternative method for: ${address}`);
        } else if (typeof mainClient.subscribe === 'function') {
          await mainClient.subscribe('blockchain.scripthash.subscribe', reversedHash);
          logSubscriptionActivity(`Subscribed using generic method for: ${address}`);
        } else {
          throw new Error('No suitable subscribe method available on the server');
        }
      }

      let txEstimate = { eta: '', satPerVbyte: null as number | null };
      let mempool: MempoolTransaction[] = [];

      // Get mempool and estimates if we have unconfirmed balance
      if (balance.unconfirmed !== 0) {
        mempool = await getMempoolTransactionsByAddress(address);
        txEstimate = await getTransactionEstimate(address, mempool);
      }

      // Notify subscriber with enhanced initial data
      subscriber.onUpdate(balance, history, mempool, txEstimate);
    } catch (error) {
      if (String(error).includes('history of > ')) {
        // Special handling for addresses with too many transactions
        logSubscriptionActivity(`Address ${address} has too many transactions to monitor: ${error}`);

        if (subscriber.onError) {
          subscriber.onError(error instanceof Error ? error : new Error(String(error)));
        }

        // Remove this subscription since we can't properly handle it
        const index = addressSubscriptions[address].indexOf(subscriber);
        if (index > -1) {
          addressSubscriptions[address].splice(index, 1);
        }
        if (addressSubscriptions[address].length === 0) {
          delete addressSubscriptions[address];
        }
        return;
      }
      throw error; // Re-throw other errors to be caught below
    }
  } catch (error) {
    logSubscriptionActivity(`Error in subscribeToAddress: ${error instanceof Error ? error.message : String(error)}`);
    if (subscriber.onError) {
      subscriber.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
};

/**
 * Unsubscribe from address updates
 * @param address Bitcoin address to unsubscribe from
 * @param subscriber Subscriber to remove, if undefined removes all subscribers
 * @param reason Optional reason for unsubscribing (for logging only)
 */
export const unsubscribeFromAddress = async (address: string, subscriber?: AddressSubscriber, reason?: string): Promise<void> => {
  if (!mainClient) return;

  try {
    if (subscriber) {
      // Remove specific subscriber
      logSubscriptionActivity(`Removing specific subscriber for address: ${address} - Reason: ${reason || 'unspecified'}`);
      if (addressSubscriptions[address]) {
        const previousCount = addressSubscriptions[address].length;
        addressSubscriptions[address] = addressSubscriptions[address].filter(sub => sub !== subscriber);
        const newCount = addressSubscriptions[address].length;

        if (addressSubscriptions[address].length === 0) {
          delete addressSubscriptions[address];
          logSubscriptionActivity(`Removed last subscriber (${previousCount} → ${newCount}) for address: ${address} - Reason: ${reason || 'unspecified'}`);
        } else {
          logSubscriptionActivity(`Removed subscriber (${previousCount} → ${newCount}) for address: ${address} - Reason: ${reason || 'unspecified'}`);
        }
      }
    } else {
      // Remove all subscribers for this address
      const subscriberCount = addressSubscriptions[address]?.length || 0;
      delete addressSubscriptions[address];
      logSubscriptionActivity(`Removed all subscribers (${subscriberCount}) for address: ${address} - Reason: ${reason || 'unspecified'}`);
    }

    // If no more subscribers, unsubscribe from electrum server
    if (!addressSubscriptions[address]) {
      try {
        const script = bitcoin.address.toOutputScript(address);
        const hash = bitcoin.crypto.sha256(script);
        const reversedHash = Buffer.from(hash).reverse().toString('hex');

        // Remove from active subscriptions set
        activeScripthashSubscriptions.delete(reversedHash);

        if (mainClient && mainClient.status === 1) {
          // Only attempt to unsubscribe if connected
          // Check if the unsubscribe method exists (different electrum servers may have different APIs)
          if (typeof mainClient.blockchainScripthash_unsubscribe === 'function') {
            await mainClient.blockchainScripthash_unsubscribe(reversedHash);
            logSubscriptionActivity(`Unsubscribed from scripthash: ${reversedHash} for address: ${address} - Reason: ${reason || 'unspecified'}`);
          } else {
            // Try alternative method names that might exist in some electrum server implementations
            if (typeof mainClient.blockchain_scripthash_unsubscribe === 'function') {
              await mainClient.blockchain_scripthash_unsubscribe(reversedHash);
              logSubscriptionActivity(`Unsubscribed using alternative method for: ${address} - Reason: ${reason || 'unspecified'}`);
            } else if (typeof mainClient.unsubscribe === 'function') {
              await mainClient.unsubscribe('blockchain.scripthash.subscribe', reversedHash);
              logSubscriptionActivity(`Unsubscribed using generic method for: ${address} - Reason: ${reason || 'unspecified'}`);
            } else {
              // If no unsubscribe methods are available, just log it
              logSubscriptionActivity(`No unsubscribe method available for server. Removing subscription locally for: ${address} - Reason: ${reason || 'unspecified'}`);
            }
          }
        } else {
          logSubscriptionActivity(`Client disconnected, skipping unsubscribe call for address: ${address} - Reason: ${reason || 'unspecified'}`);
        }
      } catch (error) {
        // Just log the error, don't throw, as we still want to remove the subscription locally
        logSubscriptionActivity(`Server-side unsubscribe failed for ${address}: ${error instanceof Error ? error.message : String(error)} - Reason: ${reason || 'unspecified'}`);
        logSubscriptionActivity(`Subscription was removed locally anyway.`);
      }
    }
  } catch (error) {
    logSubscriptionActivity(
      `Error handling unsubscribe from address ${address}: ${error instanceof Error ? error.message : String(error)} - Reason: ${reason || 'unspecified'}`,
    );
  }
};

/**
 * Resubscribe to all active subscriptions after reconnection
 */
export const resubscribeToActiveAddresses = async (): Promise<void> => {
  if (!mainClient || mainClient.status !== 1) {
    logSubscriptionActivity('Cannot resubscribe: client not connected');
    return;
  }

  const addressesToResubscribe = Object.keys(addressSubscriptions);
  if (addressesToResubscribe.length === 0) {
    logSubscriptionActivity('No addresses to resubscribe to');
    return;
  }

  logSubscriptionActivity(`Resubscribing to ${addressesToResubscribe.length} addresses after reconnection`);

  for (const address of addressesToResubscribe) {
    try {
      const script = bitcoin.address.toOutputScript(address);
      const hash = bitcoin.crypto.sha256(script);
      const reversedHash = Buffer.from(hash).reverse().toString('hex');

      // Resubscribe to the scripthash
      try {
        await mainClient.blockchainScripthash_subscribe(reversedHash);
        // Mark as active again
        activeScripthashSubscriptions.add(reversedHash);
        logSubscriptionActivity(`Successfully resubscribed to scripthash: ${reversedHash} for address: ${address}`);
      } catch (subError) {
        // If the standard method fails, try alternatives
        logSubscriptionActivity(`Failed to resubscribe with standard method: ${String(subError)}. Trying alternatives...`);

        if (typeof mainClient.blockchain_scripthash_subscribe === 'function') {
          await mainClient.blockchain_scripthash_subscribe(reversedHash);
          logSubscriptionActivity(`Resubscribed using alternative method for: ${address}`);
        } else if (typeof mainClient.subscribe === 'function') {
          await mainClient.subscribe('blockchain.scripthash.subscribe', reversedHash);
          logSubscriptionActivity(`Resubscribed using generic method for: ${address}`);
        } else {
          throw new Error('No suitable subscribe method available on the server');
        }

        activeScripthashSubscriptions.add(reversedHash);
      }

      // Get updated data to send to subscribers
      const balance = await getBalanceByAddress(address);
      const history = await getTransactionsByAddress(address);

      // Notify all subscribers with fresh data
      for (const subscriber of addressSubscriptions[address]) {
        subscriber.onUpdate(balance, history);
      }

      logSubscriptionActivity(`Successfully resubscribed to address: ${address}`);
    } catch (error) {
      logSubscriptionActivity(`Error resubscribing to address ${address}: ${error instanceof Error ? error.message : String(error)}`);
      // Notify subscribers of the error
      for (const subscriber of addressSubscriptions[address] || []) {
        if (subscriber.onError) {
          subscriber.onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
  }
};

// Enhanced notification handling
async function onNotificationReceived(address: string, scripthash: string) {
  logSubscriptionActivity(`Received notification for address: ${address} (update method: SUBSCRIPTION)`);

  try {
    // Get updated data
    const balance = await getBalanceByAddress(address);
    const history = await getTransactionsByAddress(address);
    let txEstimate = { eta: '', satPerVbyte: null as number | null };
    let mempool: MempoolTransaction[] = [];
    let detailedTxInfo = {}; // Transaction details object separate from txEstimate

    // Log incoming transaction with clear indicators
    if (balance.unconfirmed > 0) {
      console.log(`🔔 INCOMING PAYMENT DETECTED: Address ${address} received ${balance.unconfirmed} satoshis (${balance.unconfirmed / 100000000} BTC)`);
    }

    // Only fetch mempool transactions if we have unconfirmed balance
    // This ensures we're only dealing with 0-confirmation transactions
    if (balance.unconfirmed !== 0) {
      mempool = await getMempoolTransactionsByAddress(address);
      txEstimate = await getTransactionEstimate(address, mempool);

      // Check if there's a pending transaction (guaranteed to have 0 confirmations)
      if (mempool.length > 0) {
        const pendingTx = mempool[0];
        try {
          const txDetails = await multiGetTransactionByTxid([pendingTx.tx_hash], true, 1);
          const txDetail = txDetails[pendingTx.tx_hash];

          if (txDetail && txDetail.confirmations === 0) {
            // Explicit check for 0 confirmations
            // Extract transaction details
            const recipients: string[] = [];
            const senders: string[] = [];
            let amount = 0;

            // Find recipients and amount
            for (const vout of txDetail.vout || []) {
              if (vout.scriptPubKey?.addresses) {
                if (vout.scriptPubKey.addresses.includes(address)) {
                  amount += vout.value;
                }
                recipients.push(...vout.scriptPubKey.addresses);
              }
            } 

            // Find senders
            for (const vin of txDetail.vin || []) {
              if (vin.addresses) {
                senders.push(...vin.addresses);
              }
            }

            // Determine transaction type
            const type = recipients.includes(address) ? 'incoming' : 'outgoing';

            // Store transaction details separately from txEstimate
            detailedTxInfo = {
              txid: pendingTx.tx_hash,
              amount,
              sender: senders,
              recipient: recipients,
              type,
              confirmations: 0, // Explicitly set to 0 since it's unconfirmed
              fee: pendingTx.fee / 100000000, // Convert satoshis to BTC
            };
            
            // Log extra information for incoming transactions
            if (type === 'incoming') {
              console.log(`🔔 TRANSACTION DETAILS: TXID=${pendingTx.tx_hash}, Amount=${amount} BTC, Recipients=${recipients.join(', ')}`);
            }
          }
        } catch (fetchDetailError) {
          console.warn('Failed to fetch detailed transaction info:', fetchDetailError);
        }
      }
    }

    // Log detailed information including transaction info
    // Will only include details if it's an unconfirmed transaction
    logSubscriptionActivity(
      `Updated data via SUBSCRIPTION for address: ${address} | Balance: ${balance.confirmed} confirmed, ${balance.unconfirmed} unconfirmed`,
      { txCount: history.length, unconfirmedBalance: balance.unconfirmed !== 0 },
      // Combine txEstimate with detailedTxInfo for logging purposes only
      Object.keys(detailedTxInfo).length > 0 ? { ...detailedTxInfo, ...txEstimate } : undefined
    );

    // Notify all subscribers
    const subscriberCount = addressSubscriptions[address]?.length || 0;
    logSubscriptionActivity(`Notifying ${subscriberCount} subscribers for address: ${address}`);

    for (const subscriber of addressSubscriptions[address] || []) {
      // Only notify if: 
      // 1. subscriber doesn't have incomingOnly flag, or 
      // 2. incomingOnly is true and we have an incoming transaction (unconfirmed > 0)
      if (!subscriber.incomingOnly || (subscriber.incomingOnly && balance.unconfirmed > 0)) {
        subscriber.onUpdate(balance, history, mempool, txEstimate);
      } else if (balance.unconfirmed < 0) {
        // We have an outgoing transaction and subscriber only wants incoming
        logSubscriptionActivity(`Skipping notification for outgoing transaction (balance: ${balance.unconfirmed}) to incomingOnly subscriber`);
      }
    }
  } catch (error) {
    logSubscriptionActivity(`Error processing notification for ${address}: ${error instanceof Error ? error.message : String(error)}`);
    // Notify subscribers of error
    for (const subscriber of addressSubscriptions[address] || []) {
      if (subscriber.onError) {
        subscriber.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

// Enhanced onNotify handler
if (mainClient) {
  mainClient.onNotify = async (event: string, params: any[]) => {
    // Handle scripthash notifications
    if (event === 'blockchain.scripthash.subscribe') {
      const scripthash = params[0];
      logSubscriptionActivity(`Received raw notification for scripthash: ${scripthash}`);

      // Find the address that corresponds to this scripthash
      for (const address of Object.keys(addressSubscriptions)) {
        try {
          const script = bitcoin.address.toOutputScript(address);
          const hash = bitcoin.crypto.sha256(script);
          const reversedHash = Buffer.from(hash).reverse().toString('hex');

          if (reversedHash === scripthash) {
            await onNotificationReceived(address, scripthash);
            break;
          }
        } catch (error) {
          logSubscriptionActivity(`Error processing notification: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  };
}

// Add this to easily check subscription status
export const getActiveSubscriptions = () => {
  // Calculate some stats about monitored addresses
  const addressesWithUnconfirmedBalance = Object.keys(addressSubscriptions).filter(addr => {
    const subscribers = addressSubscriptions[addr];
    // Check if any subscriber has unconfirmed balance data
    return subscribers.some(sub => {
      // We don't have a direct way to access the balance here
      // This is just a placeholder - we'd need to track this separately
      return true;
    });
  });

  return {
    addresses: Object.keys(addressSubscriptions),
    subscriberCounts: Object.fromEntries(Object.entries(addressSubscriptions).map(([address, subs]) => [address, subs.length])),
    activeScripthashes: Array.from(activeScripthashSubscriptions),
    totalSubscribers: Object.values(addressSubscriptions).reduce((sum, subs) => sum + subs.length, 0),
    addressesWithActivity: addressesWithUnconfirmedBalance.length,
  };
};

// Add this new function to calculate transaction estimates
export const getTransactionEstimate = async function (
  address: string,
  mempool?: MempoolTransaction[],
): Promise<{ eta: string; satPerVbyte: number | null }> {
  if (!mempool) {
    try {
      mempool = await getMempoolTransactionsByAddress(address);
    } catch (error) {
      console.log('Error fetching mempool transactions:', error);
      return { eta: '', satPerVbyte: null };
    }
  }

  // Default response
  const response = {
    eta: '',
    satPerVbyte: null as number | null,
  };

  try {
    // Only process if we have mempool transactions
    if (mempool.length > 0) {
      const tx = mempool[0];
      const txDetails = await multiGetTransactionByTxid([tx.tx_hash], true, 10);

      if (txDetails && txDetails[tx.tx_hash]) {
        // Double check that this is truly an unconfirmed transaction
        if (txDetails[tx.tx_hash].confirmations === 0) {
          const satPerVbyte = Math.round(tx.fee / txDetails[tx.tx_hash].vsize);
          response.satPerVbyte = satPerVbyte;

          const fees = await estimateFees();

          // Set ETA string based on fee rate
          if (satPerVbyte >= fees.fast) {
            response.eta = '10m';
          } else if (satPerVbyte >= fees.medium) {
            response.eta = '3h';
          } else {
            response.eta = '1d+';
          }
        }
      }
    }
  } catch (error) {
    console.log('Error calculating transaction estimate:', error);
  }

  return response;
};

/**
 * Tracks active connections to help prevent redundant subscriptions
 * and enable smart reconnection strategies 
 */
export const getConnectionStatus = () => {
  return {
    connected: mainClient && mainClient.status === 1,
    host: mainClient?.host,
    port: mainClient?.port,
    connectionAttempt,
    wasConnectedAtLeastOnce,
    serverName,
    subscribedAddresses: Object.keys(addressSubscriptions),
    totalSubscribers: Object.values(addressSubscriptions).reduce((sum, subs) => sum + subs.length, 0),
    serverBusy: Object.values(serverBusyFlags).some(flag => flag === true),
  };
};

// Track server busy state per host
const serverBusyFlags: Record<string, boolean> = {};

// Update server busy flag when we detect issues
export const markServerAsBusy = (host: string, isBusy: boolean = true) => {
  const serverKey = host || 'default';
  serverBusyFlags[serverKey] = isBusy;
  console.log(`[BlueElectrum] Server ${serverKey} marked as ${isBusy ? 'busy' : 'available'}`);
};
