import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
const createHash = require('create-hash');

export class AbstractWallet {
  static type = 'abstract';
  static typeReadable = 'abstract';

  static fromJson(obj) {
    const obj2 = JSON.parse(obj);
    const temp = new this();
    for (const key2 of Object.keys(obj2)) {
      temp[key2] = obj2[key2];
    }

    return temp;
  }

  constructor() {
    this.type = this.constructor.type;
    this.typeReadable = this.constructor.typeReadable;
    this.label = '';
    this.secret = ''; // private key or recovery phrase
    this.balance = 0;
    this.unconfirmed_balance = 0;
    this.transactions = [];
    this._address = false; // cache
    this.utxo = [];
    this._lastTxFetch = 0;
    this._lastBalanceFetch = 0;
    this.preferredBalanceUnit = BitcoinUnit.BTC;
    this.chain = Chain.ONCHAIN;
    this.hideBalance = false;
    this.userHasSavedExport = false;
    this._hideTransactionsInWalletsList = false;
  }

  getID() {
    return createHash('sha256').update(this.getSecret()).digest().toString('hex');
  }

  getTransactions() {
    return this.transactions;
  }

  getUserHasSavedExport() {
    return this.userHasSavedExport;
  }

  setUserHasSavedExport(value) {
    this.userHasSavedExport = value;
  }

  getHideTransactionsInWalletsList() {
    return this._hideTransactionsInWalletsList;
  }

  setHideTransactionsInWalletsList(value) {
    this._hideTransactionsInWalletsList = value;
  }

  /**
   *
   * @returns {string}
   */
  getLabel() {
    if (this.label.trim().length === 0) {
      return 'Wallet';
    }
    return this.label;
  }

  getXpub() {
    return this._address;
  }

  /**
   *
   * @returns {number} Available to spend amount, int, in sats
   */
  getBalance() {
    return this.balance + (this.getUnconfirmedBalance() < 0 ? this.getUnconfirmedBalance() : 0);
  }

  getPreferredBalanceUnit() {
    for (const value of Object.values(BitcoinUnit)) {
      if (value === this.preferredBalanceUnit) {
        return this.preferredBalanceUnit;
      }
    }
    return BitcoinUnit.BTC;
  }

  allowReceive() {
    return true;
  }

  allowSend() {
    return true;
  }

  allowSendMax(): boolean {
    return false;
  }

  allowRBF() {
    return false;
  }

  allowBatchSend() {
    return false;
  }

  allowHodlHodlTrading() {
    return false;
  }

  weOwnAddress(address) {
    throw Error('not implemented');
  }

  /**
   * Returns delta of unconfirmed balance. For example, if theres no
   * unconfirmed balance its 0
   *
   * @return {number} Satoshis
   */
  getUnconfirmedBalance() {
    return this.unconfirmed_balance;
  }

  setLabel(newLabel) {
    this.label = newLabel;
    return this;
  }

  getSecret() {
    return this.secret;
  }

  setSecret(newSecret) {
    this.secret = newSecret.trim().replace('bitcoin:', '').replace('BITCOIN:', '');

    if (this.secret.startsWith('BC1')) this.secret = this.secret.toLowerCase();

    // [fingerprint/derivation]zpub
    const re = /\[([^\]]+)\](.*)/;
    const m = this.secret.match(re);
    if (m && m.length === 3) {
      let hexFingerprint = m[1].split('/')[0];
      if (hexFingerprint.length === 8) {
        hexFingerprint = Buffer.from(hexFingerprint, 'hex').reverse().toString('hex');
        this.masterFingerprint = parseInt(hexFingerprint, 16);
      }
      this.secret = m[2];
    }

    try {
      const parsedSecret = JSON.parse(this.secret);
      if (parsedSecret && parsedSecret.keystore && parsedSecret.keystore.xpub) {
        let masterFingerprint = false;
        if (parsedSecret.keystore.ckcc_xfp) {
          // It is a ColdCard Hardware Wallet
          masterFingerprint = Number(parsedSecret.keystore.ckcc_xfp);
        }
        this.secret = parsedSecret.keystore.xpub;
        this.masterFingerprint = masterFingerprint;
      }
      // It is a Cobo Vault Hardware Wallet
      if (parsedSecret && parsedSecret.ExtPubKey && parsedSecret.MasterFingerprint) {
        this.secret = parsedSecret.ExtPubKey;
        const mfp = Buffer.from(parsedSecret.MasterFingerprint, 'hex').reverse().toString('hex');
        this.masterFingerprint = parseInt(mfp, 16);
        this.setLabel('Cobo Vault ' + parsedSecret.MasterFingerprint);
      }
    } catch (_) {}
    return this;
  }

  getLatestTransactionTime() {
    return 0;
  }

  /**
   * @deprecated
   */
  createTx() {
    throw Error('not implemented');
  }

  /**
   *
   * @param utxos {Array.<{vout: Number, value: Number, txId: String, address: String}>} List of spendable utxos
   * @param targets {Array.<{value: Number, address: String}>} Where coins are going. If theres only 1 target and that target has no value - this will send MAX to that address (respecting fee rate)
   * @param feeRate {Number} satoshi per byte
   * @param changeAddress {String} Excessive coins will go back to that address
   * @param sequence {Number} Used in RBF
   * @param skipSigning {boolean} Whether we should skip signing, use returned `psbt` in that case
   * @param masterFingerprint {number} Decimal number of wallet's master fingerprint
   * @returns {{outputs: Array, tx: Transaction, inputs: Array, fee: Number, psbt: Psbt}}
   */
  createTransaction(utxos, targets, feeRate, changeAddress, sequence, skipSigning = false, masterFingerprint) {
    throw Error('not implemented');
  }

  getAddress() {
    throw Error('not implemented');
  }

  getAddressAsync() {
    return new Promise(resolve => resolve(this.getAddress()));
  }

  useWithHardwareWalletEnabled() {
    return false;
  }

  async wasEverUsed() {
    throw new Error('Not implemented');
  }
}
