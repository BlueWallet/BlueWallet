/* global __DEV__ */
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
/** @type { RnLndImplementation } */
import lnd from 'rn-lnd/lib/module';
import { LightningCustodianWallet } from './lightning-custodian-wallet';

export class LightningLndWallet extends LightningCustodianWallet {
  static type = 'lightningLnd';
  static typeReadable = 'Lightning LND';

  constructor(props) {
    super(props);
    this.preferredBalanceUnit = BitcoinUnit.SATS;
    this.chain = Chain.OFFCHAIN;
    this._pendingChannels = false;
    this._listChannels = false;
    this._listPayments = false;
    this._listInvoices = false;
    this._paymentHash2Description = {}; // cache for invoices being paid
    this.user_invoices_raw = []; // compatibility with other lightning wallet class
    this.init();
  }

  async getLndDir() {
    return lnd.getLndDir();
  }

  async start(p) {
    return lnd.start(p);
  }

  async stop() {
    return lnd.stop();
  }

  async wipeLndDir() {
    return lnd.wipeLndDir();
  }

  async listPeers() {
    return lnd.listPeers();
  }

  async listChannels() {
    return lnd.listChannels();
  }

  async getLndTransactions() {
    return lnd.getTransactions();
  }

  async getInfo() {
    return lnd.getInfo();
  }

  allowSend() {
    return true;
  }

  async fundingStateStepVerify(chanIdHex, psbtHex) {
    return lnd.fundingStateStepVerify(chanIdHex, psbtHex);
  }

  async fundingStateStepFinalize(chanIdHex, psbtHex) {
    return lnd.fundingStateStepFinalize(chanIdHex, psbtHex);
  }

  async fundingStateStepCancel(chanIdHex) {
    return lnd.fundingStateStepCancel(chanIdHex);
  }

  async pendingChannels() {
    return await lnd.pendingChannels();
  }

  isReady() {
    return !!lnd.isReady();
  }

  async openChannel(pubkeyHex, host, amountSats, privateChannel) {
    if (!this.isReady()) {
      await lnd.waitTillReady();
    }

    await lnd.connectPeer(host, pubkeyHex);
    return await lnd.openChannelPsbt(pubkeyHex, amountSats, privateChannel);
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

  async generateAsync() {
    try {
      await lnd.start();
    } catch (_) {}
    // ^^^ we dont care about already started LND

    this.secret = await lnd.genSeed();
    if (!this.secret) throw new Error('Cant create another LND wallet. Probably wallet already exists');
    await lnd.initWallet('bluewallet', this.secret); // 'bluewallet' is only an encrypt password to encrypt `.lnd/` folder
    this.secret = this.secret + ':aezeed'; // default (or empty) password for AEZEED format is 'aezeed'
  }

  async init() {
    if (!this.getSecret()) return;
    console.warn('starting lnd');

    // there are chances that we are running in dev, so LND is already started (only JS bundle reloaded)
    // so trying to start it again with crash the app

    if (!__DEV__) {
      // for prod do the startup thing (its faster than probing)
      return await lnd.startUnlockAndWait('bluewallet');
    }

    // otherwise try to probe it and skip if its launched

    let rez;
    try {
      rez = await Promise.race([new Promise(resolve => setTimeout(() => resolve('timeout'), 1000)), lnd.getInfo()]);
    } catch (_) {}

    if (rez === 'timeout' || !rez) {
      console.warn('actually starting lnd');
      try {
        await lnd.startUnlockAndWait('bluewallet');
      } catch (_) {}
    } else {
      await lnd.waitTillReady(); // so internal READY var is updated
    }
  }

  async payInvoice(invoice, freeAmount = 0) {
    if (!this.isReady()) {
      await lnd.waitTillReady();
    }
    const decoded = this.decodeInvoice(invoice);
    if (decoded.payment_hash && decoded.description) {
      this._paymentHash2Description[decoded.payment_hash] = decoded.description;
    }
    return this.payInvoiceViaSendToRoute(invoice, freeAmount);
  }

  async sendPaymentSync(invoice) {
    const rez = await lnd.sendPaymentSync(invoice);
    if (rez?.paymentError) {
      throw new Error(rez?.paymentError);
    }

    if (!rez) throw new Error('Payment failed');

    return rez;
  }

  async payInvoiceViaSendToRoute(invoice, freeAmount) {
    const rez = await lnd.payInvoiceViaSendToRoute(invoice, freeAmount);
    if (rez?.paymentError) {
      throw new Error(rez?.paymentError);
    }

    if (rez?.status === 'FAILED') {
      throw new Error(JSON.stringify(rez?.failure || ''));
    }

    if (!rez) throw new Error('Payment failed');

    return rez;
  }

  async getUserInvoices(limit = false) {
    const tempInvoices = await lnd.listInvoices();
    this._listInvoices = tempInvoices || this._listInvoices;

    const ret = [];
    for (const invoice of this?._listInvoices?.invoices || []) {
      const tx = {
        payment_request: invoice.paymentRequest,
        ispaid: invoice.state === 'SETTLED',
        timestamp: +invoice.creationDate,
        expire_time: +invoice.expiry,
        type: 'user_invoice',
        amt: Math.round(invoice.valueMsat / 1000),
        description: invoice.memo || '',
      };
      ret.push(tx);
    }

    return ret;
  }

  isInvoiceGeneratedByWallet(paymentRequest) {
    return this?._listInvoices?.invoices?.some(invoice => invoice.paymentRequest === paymentRequest);
  }

  weOwnAddress(address) {
    return false;
  }

  async addInvoice(amt, memo) {
    const ret = await lnd.addInvoice(amt, memo, 3600);
    return ret?.paymentRequest || false;
  }

  async getAddressAsync() {
    throw new Error('Not implemented 5');
  }

  async allowOnchainAddress() {
    throw new Error('Not implemented 6');
  }

  getTransactions() {
    const ret = [];

    for (const tx of this?._pendingChannels?.pendingOpenChannels || []) {
      const newTx = {};
      newTx.value = tx.channel.localBalance;
      newTx.fee = 0;
      newTx.received = -1;
      newTx.memo = 'Channel opening';
      newTx.fromWallet = this.getSecret();
      ret.push(newTx);
    }

    // #####################################

    for (const payment of this?._listPayments?.payments || []) {
      const newTx = {};
      if (payment.status === 'SUCCEEDED') {
        newTx.value = Math.round((+payment.valueMsat + +payment.feeMsat) / 1000) * -1;
        newTx.received = payment.creationDate * 1000;
        newTx.payment_hash = payment.paymentHash;
        newTx.memo = this._paymentHash2Description[payment.paymentHash] || 'Lightning payment'; // since `payment.paymentRequest` is not always set and we dont have memo here
        newTx.type = 'paid_invoice';
        newTx.fromWallet = this.getSecret();
      }
      ret.push(newTx);
    }

    // #####################################

    const channels = this?._listChannels?.channels || [];
    for (const ch of channels) {
      const newTx = {};
      newTx.value = ch.localBalance;
      newTx.received = -1; // means unknown
      newTx.memo = 'Opened channel';
      newTx.confirmations = 7; // we dont have this info
      newTx.fromWallet = this.getSecret();
      ret.push(newTx);
    }

    // #####################################

    for (const invoice of this?._listInvoices?.invoices || []) {
      const tx = {
        payment_request: invoice.paymentRequest,
        ispaid: invoice.state === 'SETTLED',
        received: invoice.creationDate * 1000,
        type: 'user_invoice',
        value: Math.round(invoice.valueMsat / 1000),
        memo: invoice.memo,
        timestamp: invoice.creationDate * 1000, // important
        expire_time: invoice.expiry * 1000, // important
        fromWallet: this.getSecret(),
      };

      if (tx.ispaid || invoice.creationDate * 1000 + invoice.expiry * 1000 > +new Date()) {
        // expired non-paid invoices are not shown
        ret.push(tx);
      }
    }

    // #####################################

    for (const tranz of this?._getTransactions?.transactions || []) {
      const newTx = {};
      newTx.value = tranz.amount;
      newTx.received = tranz.timeStamp * 1000;
      newTx.memo = 'On-chain transaction';
      newTx.confirmations = tranz.numConfirmations;
      newTx.fromWallet = this.getSecret();
      if (tranz.amount) ret.push(newTx); // otherwise weird transactions get int he list
    }

    // #####################################

    ret.sort(function (a, b) {
      return b.received - a.received;
    });

    return ret;
  }

  async fetchTransactions() {
    this._pendingChannels = await lnd.pendingChannels(); // pending channels come and go
    this._listChannels = await lnd.listChannels(); // channels come and go

    const tempPayments = await lnd.listPayments();
    this._listPayments = tempPayments || this._listPayments;

    const tempInvoices = await lnd.listInvoices();
    this._listInvoices = tempInvoices || this._listInvoices;

    const tempTransactions = await lnd.getTransactions();
    this._getTransactions = tempTransactions || this._getTransactions;

    await this.getUserInvoices();
  }

  getBalance() {
    return parseInt(this?._channelBalance?.localBalance?.sat) || 0;
  }

  getReceivableBalance() {
    let balance = 0;
    for (const ch of this?._listChannels?.channels || []) {
      const chanReceivable = parseInt(ch.remoteBalance || 0) - parseInt(ch?.remoteConstraints?.chanReserveSat || 0);
      balance += chanReceivable > 0 ? chanReceivable : 0;
    }
    return balance;
  }

  async walletBalance() {
    return lnd.walletBalance();
  }

  async fetchBalance() {
    const tempBalance = await lnd.channelBalance();
    this._channelBalance = tempBalance || this._channelBalance;
    this._lastBalanceFetch = +new Date();
  }

  async claimCoins(address) {
    return await lnd.sendAllCoins(address);
  }

  async fetchInfo() {
    throw new Error('Not implemented 7');
  }

  allowReceive() {
    return true;
  }

  async closeChannel(deliveryAddress, fundingTxidHex, outputIndex, force = false) {
    return await lnd.closeChannel(deliveryAddress, fundingTxidHex, outputIndex, force);
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
    return lnd.getLogs();
  }

  async fetchPendingTransactions() {}

  async fetchUserInvoices() {}
}
