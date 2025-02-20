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

type MempoolTransaction = {
  height: 0;
  tx_hash: string;
  fee: number;
};

export type Peer = {
  host: string;
  ssl?: number;
  tcp?: number;
};

export const ELECTRUM_HOST = 'electrum_host';
export const ELECTRUM_TCP_PORT = 'electrum_tcp_port';
export const ELECTRUM_SSL_PORT = 'electrum_ssl_port';
export const ELECTRUM_SERVER_HISTORY = 'electrum_server_history';
const ELECTRUM_CONNECTION_DISABLED = 'electrum_disabled';
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

// Define ElectrumHistory type based on usage in the file.
export type ElectrumHistory = {
  tx_hash: string;
  height: number;
  [key: string]: any;
};

// Move the type alias outside the class since type aliases cannot be declared inside a class.
export type MultiGetTransactionByTxidResult<T extends boolean> = T extends true
  ? Record<string, ElectrumTransaction>
  : Record<string, string>;

class BlueElectrum {
  // singleton instance
  private static instance: BlueElectrum;
  // internal state
  private mainClient: any;
  private mainConnected: boolean = false;
  private wasConnectedAtLeastOnce: boolean = false;
  private serverName: string | false = false;
  private disableBatching: boolean = false;
  private connectionAttempt: number = 0;
  private currentPeerIndex: number = Math.floor(Math.random() * hardcodedPeers.length);
  private latestBlock: { height: number; time: number } | { height: undefined; time: undefined } = { height: undefined, time: undefined };
  private txhashHeightCache: Record<string, number> = {};
  private _realm: Realm | undefined;

  public static getInstance(): BlueElectrum {
    if (!BlueElectrum.instance) {
      BlueElectrum.instance = new BlueElectrum();
    }
    return BlueElectrum.instance;
  }

  // ******************************************************************
  // private helper functions
  // ******************************************************************
  private async _getRealm() {
    if (this._realm) return this._realm;

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
    this._realm = await Realm.open({
      schema,
      path,
      encryptionKey,
      excludeFromIcloudBackup: true,
    });

    return this._realm;
  }

  private getCurrentPeer(): Peer {
    return hardcodedPeers[this.currentPeerIndex];
  }

  /**
   * Returns NEXT hardcoded electrum server (increments index after use)
   */
  private getNextPeer(): Peer {
    const peer = this.getCurrentPeer();
    this.currentPeerIndex++;
    if (this.currentPeerIndex + 1 >= hardcodedPeers.length) this.currentPeerIndex = 0;
    return peer;
  }

  /**
   * Returns a random dynamic electrum peer.
   * For now, this function returns a random peer from the hardcoded peers.
   * In the future, this can be extended to return a peer from a dynamic pool.
   */
  public getRandomDynamicPeer(): Peer {
    const randomIndex = Math.floor(Math.random() * hardcodedPeers.length);
    return hardcodedPeers[randomIndex];
  }

  private async getSavedPeer(): Promise<Peer | null> {
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

  private async presentNetworkErrorAlert(usingPeer?: Peer) {
    if (await this.isDisabled()) {
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
            this.connectionAttempt = 0;
            this.mainClient?.close();
            this.mainClient = undefined;
            setTimeout(() => this.connectMain(), 500);
          },
          style: 'default',
        },
        {
          text: loc.settings.electrum_reset,
          onPress: () => {
            this.presentResetToDefaultsAlert().then(result => {
              if (result) {
                this.connectionAttempt = 0;
                this.mainClient?.close();
                this.mainClient = undefined;
                setTimeout(() => this.connectMain(), 500);
              }
            });
          },
          style: 'destructive',
        },
        {
          text: loc._.cancel,
          onPress: () => {
            this.connectionAttempt = 0;
            this.mainClient?.close();
            this.mainClient = undefined;
          },
          style: 'cancel',
        },
      ],
      options: { cancelable: false },
    });
  }

  private percentile(arr: number[], p: number) {
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

  private splitIntoChunks(arr: any[], chunkSize: number) {
    const groups = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      groups.push(arr.slice(i, i + chunkSize));
    }
    return groups;
  }

  private semVerToInt(semver: string): number {
    if (!semver) return 0;
    if (semver.split('.').length !== 3) return 0;

    const ret = Number(semver.split('.')[0]) * 1000000 + Number(semver.split('.')[1]) * 1000 + Number(semver.split('.')[2]) * 1;

    if (isNaN(ret)) return 0;

    return ret;
  }

  // ******************************************************************
  // Public API methods
  // ******************************************************************

  public async getPreferredServer(): Promise<ElectrumServerItem | undefined> {
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
  }

  public async removePreferredServer() {
    try {
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      console.log('Removing preferred server');
      await DefaultPreference.clear(ELECTRUM_HOST);
      await DefaultPreference.clear(ELECTRUM_TCP_PORT);
      await DefaultPreference.clear(ELECTRUM_SSL_PORT);
    } catch (error) {
      console.error('Error in removePreferredServer:', error);
    }
  }

  public async isDisabled(): Promise<boolean> {
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

  public async setDisabled(disabled = true) {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    console.log('Setting Electrum connection disabled state to:', disabled);
    return DefaultPreference.set(ELECTRUM_CONNECTION_DISABLED, disabled ? '1' : '');
  }

  public async connectMain(): Promise<void> {
    if (await this.isDisabled()) {
      console.log('Electrum connection disabled by user. Skipping connectMain call');
      return;
    }
    let usingPeer = this.getNextPeer();
    const savedPeer = await this.getSavedPeer();
    if (savedPeer && savedPeer.host && (savedPeer.tcp || savedPeer.ssl)) {
      usingPeer = savedPeer;
    }

    console.log('Using peer:', JSON.stringify(usingPeer));

    try {
      console.log('begin connection:', JSON.stringify(usingPeer));
      this.mainClient = new ElectrumClient(net, tls, usingPeer.ssl || usingPeer.tcp, usingPeer.host, usingPeer.ssl ? 'tls' : 'tcp');

      this.mainClient.onError = (e: { message: string }) => {
        console.log('electrum mainClient.onError():', e.message);
        if (this.mainConnected) {
          // most likely got a timeout from electrum ping. lets reconnect
          // but only if we were previously connected (mainConnected), otherwise theres other
          // code which does connection retries
          this.mainClient?.close();
          this.mainClient = undefined;
          this.mainConnected = false;
          // dropping `mainConnected` flag ensures there wont be reconnection race condition if several
          // errors triggered
          console.log('reconnecting after socket error');
          setTimeout(() => this.connectMain(), usingPeer.host.endsWith('.onion') ? 4000 : 500);
        }
      };
      const ver = await this.mainClient.initElectrum({ client: 'bluewallet', version: '1.4' });
      if (ver && ver[0]) {
        console.log('connected to ', ver);
        this.serverName = ver[0];
        this.mainConnected = true;
        this.wasConnectedAtLeastOnce = true;
        if (ver[0].startsWith('ElectrumPersonalServer') || ver[0].startsWith('electrs') || ver[0].startsWith('Fulcrum')) {
          this.disableBatching = true;

          // exeptions for versions:
          const [electrumImplementation, electrumVersion] = ver[0].split(' ');
          switch (electrumImplementation) {
            case 'electrs':
              if (this.semVerToInt(electrumVersion) >= this.semVerToInt('0.9.0')) {
                this.disableBatching = false;
              }
              break;
            case 'electrs-esplora':
              // its a different one, and it does NOT support batching
              // nop
              break;
            case 'Fulcrum':
              if (this.semVerToInt(electrumVersion) >= this.semVerToInt('1.9.0')) {
                this.disableBatching = false;
              }
              break;
          }
        }
        const header = await this.mainClient.blockchainHeaders_subscribe();
        if (header && header.height) {
          this.latestBlock = {
            height: header.height,
            time: Math.floor(+new Date() / 1000),
          };
        }
        // AsyncStorage.setItem(storageKey, JSON.stringify(peers));  TODO: refactor
      }
    } catch (e) {
      this.mainConnected = false;
      console.log('bad connection:', JSON.stringify(usingPeer), e);
      this.mainClient?.close();
      this.mainClient = undefined;
    }

    if (!this.mainConnected) {
      console.log('retry');
      this.connectionAttempt = this.connectionAttempt + 1;
      this.mainClient?.close();
      this.mainClient = undefined;
      if (this.connectionAttempt >= 5) {
        this.presentNetworkErrorAlert(usingPeer);
      } else {
        console.log('reconnection attempt #', this.connectionAttempt);
        await new Promise(resolve => setTimeout(resolve, 500)); // sleep
        return this.connectMain();
      }
    }
  }

  public async presentResetToDefaultsAlert(): Promise<boolean> {
    const hasPreferredServer = await this.getPreferredServer();
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

  public async getBalanceByAddress(address: string): Promise<{ confirmed: number; unconfirmed: number }> {
    try {
      if (!this.mainClient) throw new Error('Electrum client is not connected');
      const script = bitcoin.address.toOutputScript(address);
      const hash = bitcoin.crypto.sha256(script);
      const reversedHash = Buffer.from(hash).reverse();
      const balance = await this.mainClient.blockchainScripthash_getBalance(reversedHash.toString('hex'));
      balance.addr = address;
      return balance;
    } catch (error) {
      console.error('Error in getBalanceByAddress:', error);
      throw error;
    }
  }

  public async getConfig() {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    return {
      host: this.mainClient.host,
      port: this.mainClient.port,
      serverName: this.serverName,
      connected: this.mainClient.timeLastCall !== 0 && this.mainClient.status,
    };
  }

  public getSecondsSinceLastRequest() {
    return this.mainClient && this.mainClient.timeLastCall ? (+new Date() - this.mainClient.timeLastCall) / 1000 : -1;
  }

  public async getTransactionsByAddress(address: string): Promise<ElectrumHistory[]> {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    const script = bitcoin.address.toOutputScript(address);
    const hash = bitcoin.crypto.sha256(script);
    const reversedHash = Buffer.from(hash).reverse();
    const history = await this.mainClient.blockchainScripthash_getHistory(reversedHash.toString('hex'));
    for (const h of history || []) {
      if (h.tx_hash) this.txhashHeightCache[h.tx_hash] = h.height; // cache tx height
    }

    return history;
  }

  public async getMempoolTransactionsByAddress(address: string): Promise<MempoolTransaction[]> {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    const script = bitcoin.address.toOutputScript(address);
    const hash = bitcoin.crypto.sha256(script);
    const reversedHash = Buffer.from(hash).reverse();
    return this.mainClient.blockchainScripthash_getMempool(reversedHash.toString('hex'));
  }

  public async ping() {
    try {
      await this.mainClient.server_ping();
    } catch (_) {
      this.mainConnected = false;
      return false;
    }
    return true;
  }

  // exported only to be used in unit tests
  public txhexToElectrumTransaction(txhex: string): ElectrumTransactionWithHex {
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

    if (this.txhashHeightCache[ret.txid]) {
      // got blockheight where this tx was confirmed
      ret.confirmations = this.estimateCurrentBlockheight() - this.txhashHeightCache[ret.txid];
      if (ret.confirmations < 0) {
        // ugly fix for when estimator lags behind
        ret.confirmations = 1;
      }
      ret.time = this.calculateBlockTime(this.txhashHeightCache[ret.txid]);
      ret.blocktime = this.calculateBlockTime(this.txhashHeightCache[ret.txid]);
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

  public async getTransactionsFullByAddress(address: string): Promise<ElectrumTransaction[]> {
    const txs = await this.getTransactionsByAddress(address);
    const ret: ElectrumTransaction[] = [];
    for (const tx of txs) {
      let full;
      try {
        full = await this.mainClient.blockchainTransaction_get(tx.tx_hash, true);
      } catch (error: any) {
        if (String(error?.message ?? error).startsWith('verbose transactions are currently unsupported')) {
          // apparently, stupid esplora instead of returning txhex when it cant return verbose tx started
          // throwing a proper exception. lets fetch txhex manually and decode on our end
          const txhex = await this.mainClient.blockchainTransaction_get(tx.tx_hash, false);
          full = this.txhexToElectrumTransaction(txhex);
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
          prevTxForVin = await this.mainClient.blockchainTransaction_get(input.txid, true);
        } catch (error: any) {
          if (String(error?.message ?? error).startsWith('verbose transactions are currently unsupported')) {
            // apparently, stupid esplora instead of returning txhex when it cant return verbose tx started
            // throwing a proper exception. lets fetch txhex manually and decode on our end
            const txhex = await this.mainClient.blockchainTransaction_get(input.txid, false);
            prevTxForVin = this.txhexToElectrumTransaction(txhex);
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
  }

  public async multiGetBalanceByAddress(
    addresses: string[],
    batchsize: number = 200,
  ): Promise<{ balance: number; unconfirmed_balance: number; addresses: Record<string, { confirmed: number; unconfirmed: number }> }> {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    const ret = {
      balance: 0,
      unconfirmed_balance: 0,
      addresses: {} as Record<string, { confirmed: number; unconfirmed: number }>,
    };

    const chunks = this.splitIntoChunks(addresses, batchsize);
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

      if (this.disableBatching) {
        const promises = [];
        const index2scripthash: Record<number, string> = {};
        for (let promiseIndex = 0; promiseIndex < scripthashes.length; promiseIndex++) {
          promises.push(this.mainClient.blockchainScripthash_getBalance(scripthashes[promiseIndex]));
          index2scripthash[promiseIndex] = scripthashes[promiseIndex];
        }
        const promiseResults = await Promise.all(promises);
        for (let resultIndex = 0; resultIndex < promiseResults.length; resultIndex++) {
          balances.push({ result: promiseResults[resultIndex], param: index2scripthash[resultIndex] });
        }
      } else {
        balances = await this.mainClient.blockchainScripthash_getBalanceBatch(scripthashes);
      }

      for (const bal of balances) {
        if (bal.error) console.warn('multiGetBalanceByAddress():', bal.error);
        ret.balance += +bal.result.confirmed;
        ret.unconfirmed_balance += +bal.result.unconfirmed;
        ret.addresses[scripthash2addr[bal.param]] = bal.result;
      }
    }

    return ret;
  }

  public async multiGetUtxoByAddress(addresses: string[], batchsize: number = 100): Promise<Record<string, Utxo[]>> {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    const ret: Record<string, any> = {};

    const chunks = this.splitIntoChunks(addresses, batchsize);
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

      if (this.disableBatching) {
        // ElectrumPersonalServer doesnt support `blockchain.scripthash.listunspent`
        // electrs OTOH supports it, but we dont know it we are currently connected to it or to EPS
        // so it is pretty safe to do nothing, as caller can derive UTXO from stored transactions
      } else {
        results = await this.mainClient.blockchainScripthash_listunspentBatch(scripthashes);
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
  }

  public async multiGetHistoryByAddress(addresses: string[], batchsize: number = 100): Promise<Record<string, ElectrumHistory[]>> {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    const ret: Record<string, ElectrumHistory[]> = {};

    const chunks = this.splitIntoChunks(addresses, batchsize);
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

      if (this.disableBatching) {
        const promises = [];
        const index2scripthash: Record<number, string> = {};
        for (let promiseIndex = 0; promiseIndex < scripthashes.length; promiseIndex++) {
          index2scripthash[promiseIndex] = scripthashes[promiseIndex];
          promises.push(this.mainClient.blockchainScripthash_getHistory(scripthashes[promiseIndex]));
        }
        const histories = await Promise.all(promises);
        for (let historyIndex = 0; historyIndex < histories.length; historyIndex++) {
          results.push({ result: histories[historyIndex], param: index2scripthash[historyIndex] });
        }
      } else {
        results = await this.mainClient.blockchainScripthash_getHistoryBatch(scripthashes);
      }

      for (const history of results) {
        if (history.error) console.warn('multiGetHistoryByAddress():', history.error);
        ret[scripthash2addr[history.param]] = history.result || [];
        for (const result of history.result || []) {
          if (result.tx_hash) this.txhashHeightCache[result.tx_hash] = result.height; // cache tx height
        }

        for (const hist of ret[scripthash2addr[history.param]]) {
          hist.address = scripthash2addr[history.param];
        }
      }
    }

    return ret;
  }

  public async multiGetTransactionByTxid<T extends boolean>(
    txids: string[],
    verbose: T,
    batchsize: number = 45,
  ): Promise<MultiGetTransactionByTxidResult<T>> {
    txids = txids.filter(txid => !!txid); // failsafe: removing 'undefined' or other falsy stuff from txids array
    // this value is fine-tuned so althrough wallets in test suite will occasionally
    // throw 'response too large (over 1,000,000 bytes', test suite will pass
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    const ret: MultiGetTransactionByTxidResult<T> = {} as any;
    txids = [...new Set(txids)]; // deduplicate just for any case

    // lets try cache first:
    const realm = await this._getRealm();
    const cacheKeySuffix = verbose ? '_verbose' : '_non_verbose';
    const keysCacheMiss: string[] = [];
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

    const chunks = this.splitIntoChunks(txids, batchsize);
    for (const chunk of chunks) {
      let results = [];

      if (this.disableBatching) {
        try {
          // in case of ElectrumPersonalServer it might not track some transactions (like source transactions for our transactions)
          // so we wrap it in try-catch. note, when `Promise.all` fails we will get _zero_ results, but we have a fallback for that
          const promises = [];
          const index2txid: Record<number, string> = {};
          for (let promiseIndex = 0; promiseIndex < chunk.length; promiseIndex++) {
            const txid = chunk[promiseIndex];
            index2txid[promiseIndex] = txid;
            promises.push(this.mainClient.blockchainTransaction_get(txid, verbose));
          }

          const transactionResults = await Promise.all(promises);
          for (let resultIndex = 0; resultIndex < transactionResults.length; resultIndex++) {
            let tx = transactionResults[resultIndex];
            if (typeof tx === 'string' && verbose) {
              // apparently electrum server (EPS?) didnt recognize VERBOSE parameter, and  sent us plain txhex instead of decoded tx.
              // lets decode it manually on our end then:
              tx = this.txhexToElectrumTransaction(tx);
            }
            const txid = index2txid[resultIndex];
            results.push({ result: tx, param: txid });
          }
        } catch (error: any) {
          if (String(error?.message ?? error).startsWith('verbose transactions are currently unsupported')) {
            // electrs-esplora. cant use verbose, so fetching txs one by one and decoding locally
            for (const txid of chunk) {
              try {
                let tx = await this.mainClient.blockchainTransaction_get(txid, false);
                tx = this.txhexToElectrumTransaction(tx);
                results.push({ result: tx, param: txid });
              } catch (err) {
                console.log(err);
              }
            }
          } else {
            // fallback. pretty sure we are connected to EPS.  we try getting transactions one-by-one. this way we wont
            // fail and only non-tracked by EPS transactions will be omitted
            for (const txid of chunk) {
              try {
                let tx = await this.mainClient.blockchainTransaction_get(txid, verbose);
                if (typeof tx === 'string' && verbose) {
                  // apparently electrum server (EPS?) didnt recognize VERBOSE parameter, and  sent us plain txhex instead of decoded tx.
                  // lets decode it manually on our end then:
                  tx = this.txhexToElectrumTransaction(tx);
                }
                results.push({ result: tx, param: txid });
              } catch (err) {
                console.log(err);
              }
            }
          }
        }
      } else {
        results = await this.mainClient.blockchainTransaction_getBatch(chunk, verbose);
      }

      for (const txdata of results) {
        if (txdata.error && txdata.error.code === -32600) {
          // response too large
          // lets do single call, that should go through okay:
          txdata.result = await this.mainClient.blockchainTransaction_get(txdata.param, false);
          // since we used VERBOSE=false, server sent us plain txhex which we must decode on our end:
          txdata.result = this.txhexToElectrumTransaction(txdata.result);
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

  public async waitTillConnected(): Promise<boolean> {
    let waitTillConnectedInterval: NodeJS.Timeout | undefined;
    let retriesCounter = 0;
    if (await this.isDisabled()) {
      console.warn('Electrum connections disabled by user. waitTillConnected skipping...');
      return false;
    }
    return new Promise((resolve, reject) => {
      waitTillConnectedInterval = setInterval(() => {
        if (this.mainConnected) {
          clearInterval(waitTillConnectedInterval);
          return resolve(true);
        }

        if (this.wasConnectedAtLeastOnce && this.mainClient.status === 1) {
          clearInterval(waitTillConnectedInterval);
          this.mainConnected = true;
          return resolve(true);
        }

        if (this.wasConnectedAtLeastOnce && retriesCounter++ >= 150) {
          // `wasConnectedAtLeastOnce` needed otherwise theres gona be a race condition with the code that connects
          // electrum during app startup
          clearInterval(waitTillConnectedInterval);
          this.presentNetworkErrorAlert();
          reject(new Error('Waiting for Electrum connection timeout'));
        }
      }, 100);
    });
  }

  public calcEstimateFeeFromFeeHistorgam(numberOfBlocks: number, feeHistorgram: number[][]) {
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

    return Math.round(this.percentile(histogramFlat, 0.5) || 1);
  }

  public async estimateFees(): Promise<{ fast: number; medium: number; slow: number }> {
    let histogram;
    let timeoutId;
    try {
      histogram = await Promise.race([
        this.mainClient.mempool_getFeeHistogram(),
        new Promise(resolve => (timeoutId = setTimeout(resolve, 15000))),
      ]);
    } finally {
      clearTimeout(timeoutId);
    }

    // fetching what electrum (which uses bitcoin core) thinks about fees:
    const _fast = await this.estimateFee(1);
    const _medium = await this.estimateFee(18);
    const _slow = await this.estimateFee(144);

    /**
     * sanity check, see
     * @see https://github.com/cculianu/Fulcrum/issues/197
     * (fallback to bitcoin core estimates)
     */
    if (!histogram || histogram?.[0]?.[0] > 1000) return { fast: _fast, medium: _medium, slow: _slow };

    // calculating fast fees from mempool:
    const fast = Math.max(2, this.calcEstimateFeeFromFeeHistorgam(1, histogram));
    // recalculating medium and slow fees using bitcoincore estimations only like relative weights:
    // (minimum 1 sat, just for any case)
    const medium = Math.max(1, Math.round((fast * _medium) / _fast));
    const slow = Math.max(1, Math.round((fast * _slow) / _fast));
    return { fast, medium, slow };
  }

  /**
   * Returns the estimated transaction fee to be confirmed within a certain number of blocks
   *
   * @param numberOfBlocks {number} The number of blocks to target for confirmation
   * @returns {Promise<number>} Satoshis per byte
   */
  public async estimateFee(numberOfBlocks: number): Promise<number> {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    numberOfBlocks = numberOfBlocks || 1;
    const coinUnitsPerKilobyte = await this.mainClient.blockchainEstimatefee(numberOfBlocks);
    if (coinUnitsPerKilobyte === -1) return 1;
    return Math.round(new BigNumber(coinUnitsPerKilobyte).dividedBy(1024).multipliedBy(100000000).toNumber());
  }

  public async serverFeatures() {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    return this.mainClient.server_features();
  }

  public async broadcast(hex: string) {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    try {
      const res = await this.mainClient.blockchainTransaction_broadcast(hex);
      return res;
    } catch (error) {
      return error;
    }
  }

  public async broadcastV2(hex: string): Promise<string> {
    if (!this.mainClient) throw new Error('Electrum client is not connected');
    return this.mainClient.blockchainTransaction_broadcast(hex);
  }

  public estimateCurrentBlockheight(): number {
    if (this.latestBlock.height) {
      const timeDiff = Math.floor(+new Date() / 1000) - this.latestBlock.time;
      const extraBlocks = Math.floor(timeDiff / (9.93 * 60));
      return this.latestBlock.height + extraBlocks;
    }

    const baseTs = 1587570465609; // uS
    const baseHeight = 627179;
    return Math.floor(baseHeight + (+new Date() - baseTs) / 1000 / 60 / 9.93);
  }

  public calculateBlockTime(height: number): number {
    if (this.latestBlock.height) {
      return Math.floor(this.latestBlock.time + (height - this.latestBlock.height) * 9.93 * 60);
    }

    const baseTs = 1585837504; // sec
    const baseHeight = 624083;
    return Math.floor(baseTs + (height - baseHeight) * 9.93 * 60);
  }

  /**
   * @returns {Promise<boolean>} Whether provided host:port is a valid electrum server
   */
  public async testConnection(host: string, tcpPort?: number, sslPort?: number): Promise<boolean> {
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
  }

  public forceDisconnect(): void {
    this.mainClient?.close();
  }

  public setBatchingDisabled() {
    this.disableBatching = true;
  }

  public setBatchingEnabled() {
    this.disableBatching = false;
  }
}

export default BlueElectrum.getInstance();
