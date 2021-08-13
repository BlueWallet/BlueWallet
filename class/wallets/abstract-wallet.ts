/* eslint-disable @typescript-eslint/no-explicit-any */
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import b58 from 'bs58check';
import createHash from 'create-hash';

type WalletStatics = {
  type: string;
  typeReadable: string;
  segwitType?: string;
  derivationPath?: string;
};

type WalletWithPassphrase = AbstractWallet & { getPassphrase: () => string };
type UtxoMetadata = {
  frozen?: boolean;
  memo?: string;
};

export class AbstractWallet {
  static type = 'abstract';
  static typeReadable = 'abstract';

  static fromJson(obj: string): AbstractWallet {
    const obj2 = JSON.parse(obj);
    const temp = new this();
    for (const key2 of Object.keys(obj2)) {
      // @ts-ignore This kind of magic is not allowed in typescript, we should try and be more specific
      temp[key2] = obj2[key2];
    }

    return temp;
  }

  type: string;
  typeReadable: string;
  segwitType?: string;
  _derivationPath?: string;
  label: string;
  secret: string;
  balance: number;
  unconfirmed_balance: number; // eslint-disable-line camelcase
  _address: string | false;
  utxo: string[];
  _lastTxFetch: number;
  _lastBalanceFetch: number;
  preferredBalanceUnit: BitcoinUnit;
  chain: Chain;
  hideBalance: boolean;
  userHasSavedExport: boolean;
  _hideTransactionsInWalletsList: boolean;
  _utxoMetadata: Record<string, UtxoMetadata>;
  use_with_hardware_wallet: boolean; // eslint-disable-line camelcase
  masterFingerprint: number | false;

  constructor() {
    const Constructor = (this.constructor as unknown) as WalletStatics;

    this.type = Constructor.type;
    this.typeReadable = Constructor.typeReadable;
    this.segwitType = Constructor.segwitType;
    this._derivationPath = Constructor.derivationPath;
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
    this.use_with_hardware_wallet = false;
    this.masterFingerprint = false;
  }

  /**
   * @returns {number} Timestamp (millisecsec) of when last transactions were fetched from the network
   */
  getLastTxFetch(): number {
    return this._lastTxFetch;
  }

  getID(): string {
    const thisWithPassphrase = (this as unknown) as WalletWithPassphrase;
    const passphrase = thisWithPassphrase.getPassphrase ? thisWithPassphrase.getPassphrase() : '';
    const string2hash = this.getSecret() + passphrase;
    return createHash('sha256').update(string2hash).digest().toString('hex');
  }

  // TODO: return type is incomplete
  getTransactions(): { received: number }[] {
    throw new Error('not implemented');
  }

  getUserHasSavedExport(): boolean {
    return this.userHasSavedExport;
  }

  setUserHasSavedExport(value: boolean): void {
    this.userHasSavedExport = value;
  }

  getHideTransactionsInWalletsList(): boolean {
    return this._hideTransactionsInWalletsList;
  }

  setHideTransactionsInWalletsList(value: boolean): void {
    this._hideTransactionsInWalletsList = value;
  }

  /**
   *
   * @returns {string}
   */
  getLabel(): string {
    if (this.label.trim().length === 0) {
      return 'Wallet';
    }
    return this.label;
  }

  getXpub(): string | false {
    return this._address;
  }

  /**
   *
   * @returns {number} Available to spend amount, int, in sats
   */
  getBalance(): number {
    return this.balance + (this.getUnconfirmedBalance() < 0 ? this.getUnconfirmedBalance() : 0);
  }

  getPreferredBalanceUnit(): BitcoinUnit {
    for (const value of Object.values(BitcoinUnit)) {
      if (value === this.preferredBalanceUnit) {
        return this.preferredBalanceUnit;
      }
    }
    return BitcoinUnit.BTC;
  }

  allowReceive(): boolean {
    return true;
  }

  allowSend(): boolean {
    return true;
  }

  allowRBF(): boolean {
    return false;
  }

  allowHodlHodlTrading(): boolean {
    return false;
  }

  allowPayJoin(): boolean {
    return false;
  }

  allowCosignPsbt(): boolean {
    return false;
  }

  allowSignVerifyMessage(): boolean {
    return false;
  }

  allowMasterFingerprint(): boolean {
    return false;
  }

  allowXpub(): boolean {
    return false;
  }

  weOwnAddress(address: string): boolean {
    throw Error('not implemented');
  }

  weOwnTransaction(txid: string): boolean {
    throw Error('not implemented');
  }

  /**
   * Returns delta of unconfirmed balance. For example, if theres no
   * unconfirmed balance its 0
   *
   * @return {number} Satoshis
   */
  getUnconfirmedBalance(): number {
    return this.unconfirmed_balance;
  }

  setLabel(newLabel: string): this {
    this.label = newLabel;
    return this;
  }

  getSecret(): string {
    return this.secret;
  }

  setSecret(newSecret: string): this {
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
        let masterFingerprint: number | false = false;
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

  getLatestTransactionTime(): number {
    return 0;
  }

  getLatestTransactionTimeEpoch(): number {
    if (this.getTransactions().length === 0) {
      return 0;
    }
    let max = 0;
    for (const tx of this.getTransactions()) {
      max = Math.max(new Date(tx.received).getTime(), max);
    }
    return max;
  }

  /**
   * @deprecated
   * TODO: be more precise on the type
   */
  createTx(): any {
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
   *
   * TODO: be more specific on the return type
   */
  createTransaction(
    utxos: { vout: number; value: number; txId: string; address: string }[],
    targets: { value: number; address: string },
    feeRate: number,
    changeAddress: string,
    sequence: number,
    skipSigning = false,
    masterFingerprint: number,
  ): { outputs: any[]; tx: any; inputs: any[]; fee: number; psbt: any } {
    throw Error('not implemented');
  }

  getAddress(): string {
    throw Error('not implemented');
  }

  getAddressAsync(): Promise<string> {
    return new Promise(resolve => resolve(this.getAddress()));
  }

  async getChangeAddressAsync(): Promise<string> {
    return new Promise(resolve => resolve(this.getAddress()));
  }

  useWithHardwareWalletEnabled(): boolean {
    return false;
  }

  async wasEverUsed(): Promise<boolean> {
    throw new Error('Not implemented');
  }

  /**
   * Returns _all_ external addresses in hierarchy (for HD wallets) or just address for single-address wallets
   * _Not_ internal ones, as this method is supposed to be used for subscription of external notifications.
   *
   * @returns string[] Addresses
   */
  getAllExternalAddresses(): string[] {
    return [];
  }

  /*
   * Converts zpub to xpub
   *
   * @param {String} zpub
   * @returns {String} xpub
   */
  static _zpubToXpub(zpub: string): string {
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
  static _ypubToXpub(ypub: string): string {
    let data = b58.decode(ypub);
    if (data.readUInt32BE() !== 0x049d7cb2) throw new Error('Not a valid ypub extended key!');
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);

    return b58.encode(data);
  }

  prepareForSerialization(): void {}

  /*
   * Get metadata (frozen, memo) for a specific UTXO
   *
   * @param {String} txid - transaction id
   * @param {number} vout - an index number of the output in transaction
   */
  getUTXOMetadata(txid: string, vout: number): UtxoMetadata {
    return this._utxoMetadata[`${txid}:${vout}`] || {};
  }

  /*
   * Set metadata (frozen, memo) for a specific UTXO
   *
   * @param {String} txid - transaction id
   * @param {number} vout - an index number of the output in transaction
   * @param {{memo: String, frozen: Boolean}} opts - options to attach to UTXO
   */
  setUTXOMetadata(txid: string, vout: number, opts: UtxoMetadata): void {
    const meta = this._utxoMetadata[`${txid}:${vout}`] || {};
    if ('memo' in opts) meta.memo = opts.memo;
    if ('frozen' in opts) meta.frozen = opts.frozen;
    this._utxoMetadata[`${txid}:${vout}`] = meta;
  }

  /**
   * @returns {string} Root derivation path for wallet if any
   */
  getDerivationPath(): string {
    return this._derivationPath ?? '';
  }
}
