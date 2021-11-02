import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import RnLdk from 'rn-ldk/src/index';
import { LightningCustodianWallet } from './lightning-custodian-wallet';
import SyncedAsyncStorage from '../synced-async-storage';
import { randomBytes } from '../rng';
import * as bip39 from 'bip39';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';
import bolt11 from 'bolt11';
import { SegwitBech32Wallet } from './segwit-bech32-wallet';
import alert from '../../components/Alert';
const bitcoin = require('bitcoinjs-lib');

export class LightningLdkWallet extends LightningCustodianWallet {
  static type = 'lightningLdk';
  static typeReadable = 'Lightning LDK';
  private _listChannels: any[] = [];
  private _listPayments: any[] = [];
  private _listInvoices: any[] = [];
  private _nodeConnectionDetailsCache: any = {}; // pubkey -> {pubkey, host, port, ts}
  private _refundAddressScriptHex: string = '';
  private _lastTimeBlockchainCheckedTs: number = 0;
  private _unwrapFirstExternalAddressFromMnemonicsCache: string = '';
  private static _predefinedNodes: any = {
    Bitrefill: '030c3f19d742ca294a55c00376b3b355c3c90d61c6b6b39554dbc7ac19b141c14f@52.50.244.44:9735',
    'OpenNode.com': '028d98b9969fbed53784a36617eb489a59ab6dc9b9d77fcdca9ff55307cd98e3c4@18.222.70.85:9735',
    Fold: '02816caed43171d3c9854e3b0ab2cf0c42be086ff1bd4005acc2a5f7db70d83774@35.238.153.25:9735',
    'Moon (paywithmoon.com)': '025f1456582e70c4c06b61d5c8ed3ce229e6d0db538be337a2dc6d163b0ebc05a5@52.86.210.65:9735',
    'coingate.com': '0242a4ae0c5bef18048fbecf995094b74bfb0f7391418d71ed394784373f41e4f3@3.124.63.44:9735',
    'Blockstream Store': '02df5ffe895c778e10f7742a6c5b8a0cefbe9465df58b92fadeb883752c8107c8f@35.232.170.67:9735',
    'lnd2.bluewallet.io': '037cc5f9f1da20ac0d60e83989729a204a33cc2d8e80438969fadf35c1c5f1233b@165.227.103.83:9735',
    ACINQ: '03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f@34.239.230.56:9735',
  };

  static getPredefinedNodes() {
    return LightningLdkWallet._predefinedNodes;
  }

  static pubkeyToAlias(pubkeyHex: string) {
    for (const key of Object.keys(LightningLdkWallet._predefinedNodes)) {
      const val = LightningLdkWallet._predefinedNodes[key];
      if (val.startsWith(pubkeyHex)) return key;
    }

    return pubkeyHex;
  }

  constructor(props: any) {
    super(props);
    this.preferredBalanceUnit = BitcoinUnit.SATS;
    this.chain = Chain.OFFCHAIN;
    this.user_invoices_raw = []; // compatibility with other lightning wallet class
  }

  valid() {
    try {
      const entropy = bip39.mnemonicToEntropy(this.secret.replace('ldk://', ''));
      return entropy.length === 64 || entropy.length === 32;
    } catch (_) {}

    return false;
  }

  async start(entropyHex: string) {
    return RnLdk.start(entropyHex);
  }

  async stop() {
    return RnLdk.stop();
  }

  async wipeLndDir() {}

  async listPeers() {
    return RnLdk.listPeers();
  }

  async listChannels() {
    try {
      // exception might be in case of incompletely-started LDK. then just ignore and return cached version
      this._listChannels = await RnLdk.listChannels();
    } catch (_) {}

    return this._listChannels;
  }

  async getLndTransactions() {
    return [];
  }

  async getInfo() {
    const identityPubkey = await RnLdk.getNodeId();
    return {
      identityPubkey,
    };
  }

  allowSend() {
    return true;
  }

  timeToCheckBlockchain() {
    return +new Date() - this._lastTimeBlockchainCheckedTs > 5 * 60 * 1000; // 5 min, half of block time
  }

  async fundingStateStepFinalize(txhex: string) {
    return RnLdk.openChannelStep2(txhex);
  }

  async getMaturingBalance(): Promise<number> {
    return RnLdk.getMaturingBalance();
  }

  /**
   * Probes getNodeId() call. if its available - LDK has started
   *
   * @return {Promise<boolean>}
   */
  async isStarted() {
    let rez;
    try {
      rez = await Promise.race([new Promise(resolve => setTimeout(() => resolve('timeout'), 1000)), RnLdk.getNodeId()]);
    } catch (_) {}

    if (rez === 'timeout' || !rez) {
      return false;
    }

    return true;
  }

  /**
   * Waiter till getNodeId() starts to respond. Returns true if it eventually does,
   * false in case of timeout.
   *
   * @return {Promise<boolean>}
   */
  async waitTillStarted() {
    for (let c = 0; c < 30; c++) {
      if (await this.isStarted()) return true;
      await new Promise(resolve => setTimeout(resolve, 500)); // sleep
    }

    return false;
  }

  async openChannel(pubkeyHex: string, host: string, amountSats: number, privateChannel: boolean) {
    let triedToConnect = false;
    let port = 9735;

    if (host.includes(':')) {
      const splitted = host.split(':');
      host = splitted[0];
      port = +splitted[1];
    }

    for (let c = 0; c < 20; c++) {
      const peers = await this.listPeers();
      if (peers.includes(pubkeyHex)) {
        // all good, connected, lets open channel
        return await RnLdk.openChannelStep1(pubkeyHex, +amountSats);
      }

      if (!triedToConnect) {
        triedToConnect = true;
        await RnLdk.connectPeer(pubkeyHex, host, +port);
      }

      await new Promise(resolve => setTimeout(resolve, 500)); // sleep
    }

    throw new Error('timeout waiting for peer connection');
  }

  async connectPeer(pubkeyHex: string, host: string, port: number) {
    return RnLdk.connectPeer(pubkeyHex, host, +port);
  }

  async lookupNodeConnectionDetailsByPubkey(pubkey: string) {
    // first, trying cache:
    if (this._nodeConnectionDetailsCache[pubkey] && +new Date() - this._nodeConnectionDetailsCache[pubkey].ts < 4 * 7 * 24 * 3600 * 1000) {
      // cache hit
      return this._nodeConnectionDetailsCache[pubkey];
    }

    // doing actual fetch and filling cache:
    const response = await fetch(`https://1ml.com/node/${pubkey}/json`);
    const json = await response.json();
    if (json && json.addresses && Array.isArray(json.addresses)) {
      for (const address of json.addresses) {
        if (address.network === 'tcp') {
          const ret = {
            pubkey,
            host: address.addr.split(':')[0],
            port: parseInt(address.addr.split(':')[1]),
          };

          this._nodeConnectionDetailsCache[pubkey] = Object.assign({}, ret, { ts: +new Date() });

          return ret;
        }
      }
    }
  }

  getAddress() {
    return undefined;
  }

  getSecret() {
    return this.secret;
  }

  timeToRefreshBalance() {
    return (+new Date() - this._lastBalanceFetch) / 1000 > 300; // 5 min
  }

  timeToRefreshTransaction() {
    return (+new Date() - this._lastTxFetch) / 1000 > 300; // 5 min
  }

  async generate() {
    const buf = await randomBytes(16);
    this.secret = 'ldk://' + bip39.entropyToMnemonic(buf.toString('hex'));
  }

  getEntropyHex() {
    let ret = bip39.mnemonicToEntropy(this.secret.replace('ldk://', ''));
    while (ret.length < 64) ret = '0' + ret;
    return ret;
  }

  static async _decodeInvoice(invoice: string) {
    return bolt11.decode(invoice);
  }

  static async _script2address(scriptHex: string) {
    return bitcoin.address.fromOutputScript(Buffer.from(scriptHex, 'hex'));
  }

  async selftest() {
    await RnLdk.getStorage().selftest();
    await RnLdk.selftest();
  }

  async init() {
    if (!this.getSecret()) return;
    console.warn('starting ldk');

    try {
      // providing simple functions that RnLdk would otherwise rely on 3rd party APIs
      RnLdk.provideDecodeInvoiceFunc(LightningLdkWallet._decodeInvoice);
      RnLdk.provideScript2addressFunc(LightningLdkWallet._script2address);
      const syncedStorage = new SyncedAsyncStorage(this.getEntropyHex());
      // await syncedStorage.selftest();
      // await RnLdk.selftest();
      // console.warn('selftest passed');
      await syncedStorage.synchronize();

      RnLdk.setStorage(syncedStorage);
      if (this._refundAddressScriptHex) {
        await RnLdk.setRefundAddressScript(this._refundAddressScriptHex);
      } else {
        // fallback, unwrapping address from bip39 mnemonic we have
        const address = this.unwrapFirstExternalAddressFromMnemonics();
        await this.setRefundAddress(address);
      }
      await RnLdk.start(this.getEntropyHex());

      this._execInBackground(this.reestablishChannels);
      if (this.timeToCheckBlockchain()) this._execInBackground(this.checkBlockchain);
    } catch (error: any) {
      alert('LDK init error: ' + error.message);
    }
  }

  unwrapFirstExternalAddressFromMnemonics() {
    if (this._unwrapFirstExternalAddressFromMnemonicsCache) return this._unwrapFirstExternalAddressFromMnemonicsCache; // cache hit
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(this.getSecret().replace('ldk://', ''));
    const address = hd._getExternalAddressByIndex(0);
    this._unwrapFirstExternalAddressFromMnemonicsCache = address;
    return address;
  }

  unwrapFirstExternalWIFFromMnemonics() {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(this.getSecret().replace('ldk://', ''));
    return hd._getExternalWIFByIndex(0);
  }

  async checkBlockchain() {
    this._lastTimeBlockchainCheckedTs = +new Date();
    return RnLdk.checkBlockchain();
  }

  async payInvoice(invoice: string, freeAmount = 0) {
    const decoded = this.decodeInvoice(invoice);

    if (await this.channelsNeedReestablish()) {
      await this.reestablishChannels();
      await this.waitForAtLeastOneChannelBecomeActive();
    }

    const result = await this.sendPayment(invoice, freeAmount);
    if (!result) throw new Error('Failed');

    // ok, it was sent. now, waiting for an event that it was _actually_ paid:
    for (let c = 0; c < 60; c++) {
      await new Promise(resolve => setTimeout(resolve, 500)); // sleep

      for (const sentPayment of RnLdk.sentPayments || []) {
        const paidHash = LightningLdkWallet.preimage2hash(sentPayment.payment_preimage);
        if (paidHash === decoded.payment_hash) {
          this._listPayments = this._listPayments || [];
          this._listPayments.push(
            Object.assign({}, sentPayment, {
              memo: decoded.description || 'Lightning payment',
              value: (freeAmount || decoded.num_satoshis) * -1,
              received: +new Date(),
              payment_preimage: sentPayment.payment_preimage,
              payment_hash: decoded.payment_hash,
            }),
          );
          return;
        }
      }

      for (const failedPayment of RnLdk.failedPayments || []) {
        if (failedPayment.payment_hash === decoded.payment_hash) throw new Error(JSON.stringify(failedPayment));
      }
    }

    // no? lets just throw timeout error
    throw new Error('Payment timeout');
  }

  async sendPayment(invoice: string, freeAmount: number) {
    return RnLdk.sendPayment(invoice, freeAmount);
  }

  /**
   * In case user initiated channel opening, and then lost peer connection (i.e. app went in background for an
   * extended period of time), when user gets back to the app the channel might already have enough confirmations,
   * but will never be acknowledged as 'established' by LDK until peer reconnects so that ldk & peer can negotiate and
   * agree that channel is now established
   */
  async reconnectPeersWithPendingChannels() {
    const peers = await this.listPeers();
    const peers2reconnect: Record<string, boolean> = {};
    if (this._listChannels) {
      for (const channel of this._listChannels) {
        if (!channel.is_funding_locked) {
          // pending channel
          if (!peers.includes(channel.remote_node_id)) peers2reconnect[channel.remote_node_id] = true;
        }
      }
    }

    for (const pubkey of Object.keys(peers2reconnect)) {
      const { host, port } = await this.lookupNodeConnectionDetailsByPubkey(pubkey);
      await this.connectPeer(pubkey, host, port);
    }
  }

  async getUserInvoices(limit = false) {
    const newInvoices: any[] = [];
    let found = false;

    // okay, so the idea is that `this._listInvoices` is a persistant storage of invoices, while
    // `RnLdk.receivedPayments` is only a temp storage of emited events

    // we iterate through all stored invoices
    for (const invoice of this._listInvoices) {
      const newInvoice = Object.assign({}, invoice);

      // iterate through events of received payments
      for (const receivedPayment of RnLdk.receivedPayments || []) {
        if (receivedPayment.payment_hash === invoice.payment_hash) {
          // match! this particular payment was paid
          newInvoice.ispaid = true;
          newInvoice.value = Math.floor(parseInt(receivedPayment.amt) / 1000);
          found = true;
        }
      }

      newInvoices.push(newInvoice);
    }

    // overwrite stored array if flag was set
    if (found) this._listInvoices = newInvoices;

    return this._listInvoices;
  }

  isInvoiceGeneratedByWallet(paymentRequest: string) {
    return Boolean(this?._listInvoices?.some(invoice => invoice.payment_request === paymentRequest));
  }

  weOwnAddress(address: string) {
    return false;
  }

  async addInvoice(amtSat: number, memo: string) {
    if (await this.channelsNeedReestablish()) {
      await this.reestablishChannels();
      await this.waitForAtLeastOneChannelBecomeActive();
    }

    if (this.getReceivableBalance() < amtSat) throw new Error('You dont have enough inbound capacity');

    const bolt11 = await RnLdk.addInvoice(amtSat * 1000, memo);
    if (!bolt11) return false;

    const decoded = this.decodeInvoice(bolt11);

    this._listInvoices = this._listInvoices || [];
    const tx = {
      payment_request: bolt11,
      ispaid: false,
      timestamp: +new Date(),
      expire_time: 3600 * 1000,
      amt: amtSat,
      type: 'user_invoice',
      payment_hash: decoded.payment_hash,
      description: memo || '',
    };
    this._listInvoices.push(tx);

    return bolt11;
  }

  async getAddressAsync() {
    throw new Error('getAddressAsync: Not implemented');
  }

  async allowOnchainAddress(): Promise<boolean> {
    throw new Error('allowOnchainAddress: Not implemented');
  }

  getTransactions() {
    const ret = [];

    for (const payment of this?._listPayments || []) {
      const newTx = Object.assign({}, payment, {
        type: 'paid_invoice',
        walletID: this.getID(),
      });
      ret.push(newTx);
    }

    // ############################################

    for (const invoice of this?._listInvoices || []) {
      const tx = {
        payment_request: invoice.payment_request,
        ispaid: invoice.ispaid,
        received: invoice.timestamp,
        type: invoice.type,
        value: invoice.value || invoice.amt,
        memo: invoice.description,
        timestamp: invoice.timestamp, // important
        expire_time: invoice.expire_time, // important
        walletID: this.getID(),
      };

      if (tx.ispaid || invoice.timestamp + invoice.expire_time > +new Date()) {
        // expired non-paid invoices are not shown
        ret.push(tx);
      }
    }

    ret.sort(function (a, b) {
      return b.received - a.received;
    });

    return ret;
  }

  async fetchTransactions() {
    if (this.timeToCheckBlockchain()) {
      try {
        // exception might be in case of incompletely-started LDK
        this._listChannels = await RnLdk.listChannels();
        await this.checkBlockchain();
        //  ^^^ will be executed if above didnt throw exceptions, which means ldk fully started.
        // we need this for a case when app returns from background if it was in bg for a really long time.
        // ldk needs to update it's blockchain data, and this is practically the only place where it can
        // do that (except on cold start)
      } catch (_) {}
    }

    try {
      await this.reconnectPeersWithPendingChannels();
    } catch (error: any) {
      console.log('fetchTransactions failed');
      console.log(error.message);
    }

    await this.getUserInvoices(); // it internally updates paid user invoices
  }

  getBalance() {
    let sum = 0;
    if (this._listChannels) {
      for (const channel of this._listChannels) {
        if (!channel.is_funding_locked) continue; // pending channel
        sum += Math.floor(parseInt(channel.outbound_capacity_msat) / 1000);
      }
    }

    return sum;
  }

  getReceivableBalance() {
    let sum = 0;
    if (this._listChannels) {
      for (const channel of this._listChannels) {
        if (!channel.is_funding_locked) continue; // pending channel
        sum += Math.floor(parseInt(channel.inbound_capacity_msat) / 1000);
      }
    }
    return sum;
  }

  /**
   * This method checks if there is balance on first unwapped address we have.
   * This address is a fallback in case user has _no_ other wallets to withdraw onchain coins to, so closed-channel
   * funds land on this address. Ofcourse, if user provided us a withdraw address, it should be stored in
   * `this._refundAddressScriptHex` and its balance frankly is not our concern.
   *
   * @return {Promise<{confirmedBalance: number}>}
   */
  async walletBalance() {
    let confirmedSat = 0;
    if (this._unwrapFirstExternalAddressFromMnemonicsCache) {
      const response = await fetch('https://blockstream.info/api/address/' + this._unwrapFirstExternalAddressFromMnemonicsCache + '/utxo');
      const json = await response.json();
      if (json && Array.isArray(json)) {
        for (const utxo of json) {
          if (utxo?.status?.confirmed) {
            confirmedSat += parseInt(utxo.value);
          }
        }
      }
    }

    return { confirmedBalance: confirmedSat };
  }

  async fetchBalance() {
    await this.listChannels(); // updates channels
  }

  async claimCoins(address: string) {
    console.log('unwrapping wif...');
    const wif = this.unwrapFirstExternalWIFFromMnemonics();
    const wallet = new SegwitBech32Wallet();
    wallet.setSecret(String(wif));
    console.log('fetching balance...');
    await wallet.fetchUtxo();
    console.log(wallet.getBalance(), wallet.getUtxo());
    console.log('creating transation...');
    const { tx } = wallet.createTransaction(wallet.getUtxo(), [{ address }], 1, address, 0, false, 0);
    if (!tx) throw new Error('claimCoins: could not create transaction');
    console.log('broadcasting...');
    return await wallet.broadcastTx(tx.toHex());
  }

  async fetchInfo() {
    throw new Error('fetchInfo: Not implemented');
  }

  allowReceive() {
    return true;
  }

  async closeChannel(fundingTxidHex: string, force = false) {
    return force ? await RnLdk.closeChannelForce(fundingTxidHex) : await RnLdk.closeChannelCooperatively(fundingTxidHex);
  }

  getLatestTransactionTime(): string | 0 {
    if (this.getTransactions().length === 0) {
      return 0;
    }
    let max = -1;
    for (const tx of this.getTransactions()) {
      if (tx.received) max = Math.max(tx.received, max);
    }
    return new Date(max).toString();
  }

  async getLogs() {
    return RnLdk.getLogs()
      .map(log => log.line)
      .join('\n');
  }

  async getLogsWithTs() {
    return RnLdk.getLogs()
      .map(log => log.ts + ' ' + log.line)
      .join('\n');
  }

  async fetchPendingTransactions() {}

  async fetchUserInvoices() {
    await this.getUserInvoices();
  }

  static preimage2hash(preimageHex: string): string {
    const hash = bitcoin.crypto.sha256(Buffer.from(preimageHex, 'hex'));
    return hash.toString('hex');
  }

  async reestablishChannels() {
    const connectedInThisRun: any = {};
    for (const channel of await this.listChannels()) {
      if (channel.is_usable) continue; // already connected..?
      if (connectedInThisRun[channel.remote_node_id]) continue; // already tried to reconnect (in case there are several channels with the same node)
      const { pubkey, host, port } = await this.lookupNodeConnectionDetailsByPubkey(channel.remote_node_id);
      await this.connectPeer(pubkey, host, port);
      connectedInThisRun[pubkey] = true;
    }
  }

  async channelsNeedReestablish() {
    const freshListChannels = await this.listChannels();
    const active = freshListChannels.filter(chan => !!chan.is_usable && chan.is_funding_locked).length;
    return freshListChannels.length !== +active;
  }

  async waitForAtLeastOneChannelBecomeActive() {
    const active = (await this.listChannels()).filter(chan => !!chan.is_usable).length;

    for (let c = 0; c < 10; c++) {
      await new Promise(resolve => setTimeout(resolve, 500)); // sleep
      const freshListChannels = await this.listChannels();
      const active2 = freshListChannels.filter(chan => !!chan.is_usable).length;
      if (freshListChannels.length === +active2) return true; // all active kek

      if (freshListChannels.length === 0) return true; // no channels at all
      if (+active2 > +active) return true; // something became active, lets ret
    }

    return false;
  }

  async setRefundAddress(address: string) {
    const script = bitcoin.address.toOutputScript(address);
    this._refundAddressScriptHex = script.toString('hex');
    await RnLdk.setRefundAddressScript(this._refundAddressScriptHex);
  }

  static async getVersion() {
    return RnLdk.getVersion();
  }

  static getPackageVersion() {
    return RnLdk.getPackageVersion();
  }

  getChannelsClosedEvents() {
    return RnLdk.channelsClosed;
  }

  /**
   * executes async function in background, so calling code can return immediately, while catching all thrown exceptions
   * and showing them in alert() instead of propagating them up
   *
   * @param func {function} Async functino to execute
   * @private
   */
  _execInBackground(func: () => void) {
    const that = this;
    (async () => {
      try {
        await func.call(that);
      } catch (error: any) {
        alert('_execInBackground error:' + error.message);
      }
    })();
  }
}
