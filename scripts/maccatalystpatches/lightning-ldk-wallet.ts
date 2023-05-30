import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { LightningCustodianWallet } from './lightning-custodian-wallet';
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
  private static _predefinedNodes: Record<string, string> = {
    Bitrefill: '03d607f3e69fd032524a867b288216bfab263b6eaee4e07783799a6fe69bb84fac@3.237.23.179:9735',
    'OpenNode.com': '03abf6f44c355dec0d5aa155bdbdd6e0c8fefe318eff402de65c6eb2e1be55dc3e@3.132.230.42:9735',
    Fold: '02816caed43171d3c9854e3b0ab2cf0c42be086ff1bd4005acc2a5f7db70d83774@35.238.153.25:9735',
    'Moon (paywithmoon.com)': '025f1456582e70c4c06b61d5c8ed3ce229e6d0db538be337a2dc6d163b0ebc05a5@52.86.210.65:9735',
    'coingate.com': '0242a4ae0c5bef18048fbecf995094b74bfb0f7391418d71ed394784373f41e4f3@3.124.63.44:9735',
    'Blockstream Store': '02df5ffe895c778e10f7742a6c5b8a0cefbe9465df58b92fadeb883752c8107c8f@35.232.170.67:9735',
    ACINQ: '03864ef025fde8fb587d989186ce6a4a186895ee44a926bfc370e2c366597a3f8f@3.33.236.230:9735',
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

  async stop() {}

  async wipeLndDir() {}

  async listPeers() {}

  async listChannels() {
    try {
      // exception might be in case of incompletely-started LDK. then just ignore and return cached version
      this._listChannels = [];
    } catch (_) {}

    return this._listChannels;
  }

  async getLndTransactions() {
    return [];
  }

  async getInfo() {
    const identityPubkey = '';
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
    return false;
  }

  async getMaturingBalance(): Promise<number> {
    return 0;
  }

  async getMaturingHeight(): Promise<number> {
    return 0;
  }

  /**
   * Probes getNodeId() call. if its available - LDK has started
   *
   * @return {Promise<boolean>}
   */
  async isStarted() {
    return false;
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
    return false;
  }

  async connectPeer(pubkeyHex: string, host: string, port: number) {}

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

  getStorageNamespace() {}

  static async _decodeInvoice(invoice: string) {
    return bolt11.decode(invoice);
  }

  static async _script2address(scriptHex: string) {
    return bitcoin.address.fromOutputScript(Buffer.from(scriptHex, 'hex'));
  }

  async selftest() {}

  async init() {}

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

  async checkBlockchain() {}

  async payInvoice(invoice: string, freeAmount = 0) {
    // no? lets just throw timeout error
    throw new Error('Payment timeout');
  }

  /**
   * In case user initiated channel opening, and then lost peer connection (i.e. app went in background for an
   * extended period of time), when user gets back to the app the channel might already have enough confirmations,
   * but will never be acknowledged as 'established' by LDK until peer reconnects so that ldk & peer can negotiate and
   * agree that channel is now established
   */
  async reconnectPeersWithPendingChannels() {}

  async getUserInvoices(limit = false) {
    const newInvoices: any[] = [];

    return newInvoices;
  }

  isInvoiceGeneratedByWallet(paymentRequest: string) {
    return Boolean(this?._listInvoices?.some(invoice => invoice.payment_request === paymentRequest));
  }

  weOwnAddress(address: string) {
    return false;
  }

  async addInvoice(amtSat: number, memo: string) {}

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

  async fetchTransactions() {}

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
    const { tx } = wallet.createTransaction(wallet.getUtxo(), [{ address }], 2, address, 0, false, 0);
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
    return false;
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

  async getLogs() {}

  async getLogsWithTs() {}

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
  }

  static async getVersion() {}

  static getPackageVersion() {}

  getChannelsClosedEvents() {
    return [{ reason: '', text: '' }];
  }

  async purgeLocalStorage() {}

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
