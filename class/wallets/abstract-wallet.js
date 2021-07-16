import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import b58 from 'bs58check';
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
    this.segwitType = this.constructor.segwitType;
    this._derivationPath = this.constructor.derivationPath;
    this.label = '';
    this.secret = ''; // private key or recovery phrase
    this.balance = 0;
    this.unconfirmed_balance = 0;
    this._address = false; // cache
    this.utxo = [];
    this._lastTxFetch = 0;
    this._lastBalanceFetch = 0;
    this.preferredBalanceUnit = BitcoinUnit.BTC;
    this.chain = Chain.ONCHAIN;
    this.hideBalance = false;
    this.userHasSavedExport = false;
    this._hideTransactionsInWalletsList = false;
    this._utxoMetadata = {};
  }

  /**
   * @returns {number} Timestamp (millisecsec) of when last transactions were fetched from the network
   */
  getLastTxFetch() {
    return this._lastTxFetch;
  }

  getID() {
    const passphrase = this.getPassphrase ? this.getPassphrase() : '';
    const string2hash = this.getSecret() + passphrase;
    return createHash('sha256').update(string2hash).digest().toString('hex');
  }

  getTransactions() {
    throw new Error('not implemented');
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

  allowRBF() {
    return false;
  }

  allowHodlHodlTrading() {
    return false;
  }

  allowPayJoin() {
    return false;
  }

  allowCosignPsbt() {
    return false;
  }

  allowSignVerifyMessage() {
    return false;
  }

  allowMasterFingerprint() {
    return false;
  }

  allowXpub() {
    return false;
  }

  weOwnAddress(address) {
    throw Error('not implemented');
  }

  weOwnTransaction(txid) {
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
      let [hexFingerprint, ...derivationPathArray] = m[1].split('/');
      const derivationPath = `m/${derivationPathArray.join('/').replace(/h/g, "'")}`;
      if (hexFingerprint.length === 8) {
        hexFingerprint = Buffer.from(hexFingerprint, 'hex').reverse().toString('hex');
        this.masterFingerprint = parseInt(hexFingerprint, 16);
        this._derivationPath = derivationPath;
      }
      this.secret = m[2];
    }

    try {
      let parsedSecret;
      // regex might've matched invalid data. if so, parse newSecret.
      if (this.secret.trim().length > 0) {
        try {
          parsedSecret = JSON.parse(this.secret);
        } catch (e) {
          parsedSecret = JSON.parse(newSecret);
        }
      } else {
        parsedSecret = JSON.parse(newSecret);
      }
      if (parsedSecret && parsedSecret.keystore && parsedSecret.keystore.xpub) {
        let masterFingerprint = false;
        if (parsedSecret.keystore.ckcc_xfp) {
          // It is a ColdCard Hardware Wallet
          masterFingerprint = Number(parsedSecret.keystore.ckcc_xfp);
        } else if (parsedSecret.keystore.root_fingerprint) {
          masterFingerprint = Number(parsedSecret.keystore.root_fingerprint);
        }
        if (parsedSecret.keystore.label) {
          this.setLabel(parsedSecret.keystore.label);
        }
        if (parsedSecret.keystore.derivation) {
          this._derivationPath = parsedSecret.keystore.derivation;
        }
        this.secret = parsedSecret.keystore.xpub;
        this.masterFingerprint = masterFingerprint;

        if (parsedSecret.keystore.type === 'hardware') this.use_with_hardware_wallet = true;
      }
      // It is a Cobo Vault Hardware Wallet
      if (parsedSecret && parsedSecret.ExtPubKey && parsedSecret.MasterFingerprint && parsedSecret.AccountKeyPath) {
        this.secret = parsedSecret.ExtPubKey;
        const mfp = Buffer.from(parsedSecret.MasterFingerprint, 'hex').reverse().toString('hex');
        this.masterFingerprint = parseInt(mfp, 16);
        this._derivationPath = `m/${parsedSecret.AccountKeyPath}`;
        if (parsedSecret.CoboVaultFirmwareVersion) this.use_with_hardware_wallet = true;
      }
    } catch (_) {}

    if (!this._derivationPath) {
      if (this.secret.startsWith('xpub')) {
        this._derivationPath = "m/44'/0'/0'"; // Assume default BIP44 path for legacy wallets
      } else if (this.secret.startsWith('ypub')) {
        this._derivationPath = "m/49'/0'/0'"; // Assume default BIP49 path for segwit wrapped wallets
      } else if (this.secret.startsWith('zpub')) {
        this._derivationPath = "m/84'/0'/0'"; // Assume default BIP84 for native segwit wallets
      }
    }

    return this;
  }

  getLatestTransactionTime() {
    return 0;
  }

  getLatestTransactionTimeEpoch() {
    if (this.getTransactions().length === 0) {
      return 0;
    }
    let max = 0;
    for (const tx of this.getTransactions()) {
      max = Math.max(new Date(tx.received) * 1, max);
    }
    return max;
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

  async getChangeAddressAsync() {
    return new Promise(resolve => resolve(this.getAddress()));
  }

  useWithHardwareWalletEnabled() {
    return false;
  }

  async wasEverUsed() {
    throw new Error('Not implemented');
  }

  /**
   * Returns _all_ external addresses in hierarchy (for HD wallets) or just address for single-address wallets
   * _Not_ internal ones, as this method is supposed to be used for subscription of external notifications.
   *
   * @returns string[] Addresses
   */
  getAllExternalAddresses() {
    return [];
  }

  /*
   * Converts zpub to xpub
   *
   * @param {String} zpub
   * @returns {String} xpub
   */
  static _zpubToXpub(zpub) {
    let data = b58.decode(zpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);

    return b58.encode(data);
  }

  /**
   * Converts ypub to xpub
   * @param {String} ypub - wallet ypub
   * @returns {*}
   */
  static _ypubToXpub(ypub) {
    let data = b58.decode(ypub);
    if (data.readUInt32BE() !== 0x049d7cb2) throw new Error('Not a valid ypub extended key!');
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);

    return b58.encode(data);
  }

  prepareForSerialization() {}

  /*
   * Get metadata (frozen, memo) for a specific UTXO
   *
   * @param {String} txid - transaction id
   * @param {number} vout - an index number of the output in transaction
   */
  getUTXOMetadata(txid, vout) {
    return this._utxoMetadata[`${txid}:${vout}`] || {};
  }

  /*
   * Set metadata (frozen, memo) for a specific UTXO
   *
   * @param {String} txid - transaction id
   * @param {number} vout - an index number of the output in transaction
   * @param {{memo: String, frozen: Boolean}} opts - options to attach to UTXO
   */
  setUTXOMetadata(txid, vout, opts) {
    const meta = this._utxoMetadata[`${txid}:${vout}`] || {};
    if ('memo' in opts) meta.memo = opts.memo;
    if ('frozen' in opts) meta.frozen = opts.frozen;
    this._utxoMetadata[`${txid}:${vout}`] = meta;
  }

  /**
   * @returns {string} Root derivation path for wallet if any
   */
  getDerivationPath() {
    return this._derivationPath ?? '';
  }
}
