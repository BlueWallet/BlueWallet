/* global alert */
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import RnLdk from 'rn-ldk/lib/module';
import { LightningCustodianWallet } from './lightning-custodian-wallet';
import SyncedAsyncStorage from '../synced-async-storage';
import { randomBytes } from '../rng';
import * as bip39 from 'bip39';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';
import bolt11 from 'bolt11';
const bitcoin = require('bitcoinjs-lib');

export class LightningLdkWallet extends LightningCustodianWallet {
  static type = 'lightningLdk';
  static typeReadable = 'Lightning LDK';

  constructor(props) {
    super(props);
    this.preferredBalanceUnit = BitcoinUnit.SATS;
    this.chain = Chain.OFFCHAIN;
    this._listChannels = [];
    this._listPayments = [];
    this._listInvoices = [];
    this.user_invoices_raw = []; // compatibility with other lightning wallet class
    this._nodeConnectionDetailsCache = {}; // pubkey -> {pubkey, host, port, ts}
    this._refundAddressScriptHex = false;
    this._lastTimeBlockchainCheckedTs = 0;
    this._unwrapFirstExternalAddressFromMnemonicsCache = false;
  }

  valid() {
    try {
      const entropy = bip39.mnemonicToEntropy(this.secret.replace('ldk://', ''));
      return entropy.length === 64 || entropy.length === 32;
    } catch (_) {}

    return false;
  }

  async start(entropyHex) {
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

  async fundingStateStepFinalize(txhex) {
    return RnLdk.openChannelStep2(txhex);
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

  async openChannel(pubkeyHex, host, amountSats, privateChannel) {
    let triedToConnect = false;
    let port = 9735;

    if (host.includes(':')) {
      const splitted = host.split(':');
      host = splitted[0];
      port = splitted[1];
    }

    for (let c = 0; c < 20; c++) {
      const peers = await this.listPeers();
      if (peers.includes(pubkeyHex)) {
        // all good, connected, lets open channel
        return await RnLdk.openChannelStep1(pubkeyHex, parseInt(amountSats));
      }

      if (!triedToConnect) {
        triedToConnect = true;
        await RnLdk.connectPeer(pubkeyHex, host, parseInt(port));
      }

      await new Promise(resolve => setTimeout(resolve, 500)); // sleep
    }

    throw new Error('timeout waiting for peer connection');
  }

  async connectPeer(pubkeyHex, host, port) {
    return RnLdk.connectPeer(pubkeyHex, host, parseInt(port));
  }

  async lookupNodeConnectionDetailsByPubkey(pubkey) {
    // first, trying cache:
    if (this._nodeConnectionDetailsCache[pubkey] && +new Date() - this._nodeConnectionDetailsCache[pubkey].ts < 2 * 14 * 24 * 3600 * 1000) {
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
    const buf = await randomBytes(32);
    this.secret = 'ldk://' + bip39.entropyToMnemonic(buf.toString('hex'));
  }

  getEntropyHex() {
    let ret = bip39.mnemonicToEntropy(this.secret.replace('ldk://', ''));
    while (ret.length < 64) ret = '0' + ret;
    return ret;
  }

  static async _decodeInvoice(invoice) {
    return bolt11.decode(invoice);
  }

  static async _script2address(scriptHex) {
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
      await RnLdk.start(this.getEntropyHex()).then(console.warn);

      this._execInBackground(this.reestablishChannels);
      if (this.timeToCheckBlockchain()) this._execInBackground(this.checkBlockchain);
    } catch (error) {
      alert(error.message);
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

  async checkBlockchain() {
    this._lastTimeBlockchainCheckedTs = +new Date();
    return RnLdk.checkBlockchain();
  }

  async payInvoice(invoice, freeAmount = 0) {
    const decoded = this.decodeInvoice(invoice);

    if (await this.channelsNeedReestablish()) {
      await this.reestablishChannels();
      await this.waitForAtLeastOneChannelBecomeActive();
    }

    const result = await this.sendPayment(invoice, freeAmount);
    if (!result) throw new Error('Failed');

    // ok, it was sent. now, waiting for an event that it was _actually_ paid:
    for (let c = 0; c < 50; c++) {
      await new Promise(resolve => setTimeout(resolve, 500)); // sleep
      for (const sentPayment of RnLdk.sentPayments || []) {
        const paidHash = LightningLdkWallet.preimage2hash(sentPayment.payment_preimage);
        if (paidHash === decoded.payment_hash) {
          this._listPayments = this._listPayments || [];
          this._listPayments.push(
            Object.assign({}, sentPayment, {
              memo: decoded.description || 'Lightning payment',
              value: freeAmount || -1,
              received: +new Date(),
              payment_preimage: sentPayment.payment_preimage,
              payment_hash: decoded.payment_hash,
            }),
          );
          return true;
        }
      }
    }

    // timeout. maybe it failed? lets lookup in a list of failed payments:
    for (const failedPayment of RnLdk.failedPayments) {
      if (failedPayment.payment_hash === decoded.payment_hash) throw new Error(JSON.stringify(failedPayment));
    }

    // no? lets just throw timeout error
    throw new Error('Payment timeout');
  }

  async sendPayment(invoice, freeAmount) {
    return RnLdk.sendPayment(invoice, freeAmount);
  }

  async getUserInvoices(limit = false) {
    const newInvoices = [];
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

  isInvoiceGeneratedByWallet(paymentRequest) {
    return this?._listInvoices?.some(invoice => invoice.payment_request === paymentRequest);
  }

  weOwnAddress(address) {
    return false;
  }

  async addInvoice(amtSat, memo) {
    if (await this.channelsNeedReestablish()) {
      await this.reestablishChannels();
      await this.waitForAtLeastOneChannelBecomeActive();
    }

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

  async allowOnchainAddress() {
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
    if (this.timeToCheckBlockchain()) this._execInBackground(this.checkBlockchain);
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

  async claimCoins(address) {
    throw new Error('claimCoins: Not yet implemented');
  }

  async fetchInfo() {
    throw new Error('fetchInfo: Not implemented');
  }

  allowReceive() {
    return true;
  }

  async closeChannel(fundingTxidHex, force = false) {
    return force ? await RnLdk.closeChannelForce(fundingTxidHex) : await RnLdk.closeChannelCooperatively(fundingTxidHex);
  }

  getLatestTransactionTime() {
    if (this.getTransactions().length === 0) {
      return 0;
    }
    let max = -1;
    for (const tx of this.getTransactions()) {
      if (tx.received) max = Math.max(tx.received, max);
    }
    return max;
  }

  async getLogs() {
    return (RnLdk?.logs || []).map(log => log.line).join('\n');
  }

  async fetchPendingTransactions() {}

  async fetchUserInvoices() {
    await this.getUserInvoices();
  }

  static preimage2hash(preimageHex) {
    const hash = bitcoin.crypto.sha256(Buffer.from(preimageHex, 'hex'));
    return hash.toString('hex');
  }

  async reestablishChannels() {
    const connectedInThisRun = {};
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

  async setRefundAddress(address) {
    const script = bitcoin.address.toOutputScript(address);
    this._refundAddressScriptHex = script.toString('hex');
    await RnLdk.setRefundAddressScript(this._refundAddressScriptHex);
  }

  /**
   * executes async function in background, so calling code can return immediately, while catching all thrown exceptions
   * and showing them in alert() instead of propagating them up
   *
   * @param func {function} Async functino to execute
   * @private
   */
  _execInBackground(func) {
    const that = this;
    (async () => {
      try {
        await func.call(that);
      } catch (error) {
        alert(error.message);
      }
    })();
  }
}
