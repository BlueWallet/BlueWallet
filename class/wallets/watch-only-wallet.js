import { LegacyWallet } from './legacy-wallet';
import { HDSegwitP2SHWallet } from './hd-segwit-p2sh-wallet';
import { HDLegacyP2PKHWallet } from './hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from './hd-segwit-bech32-wallet';
const bitcoin = require('bitcoinjs-lib');

export class WatchOnlyWallet extends LegacyWallet {
  static type = 'watchOnly';
  static typeReadable = 'Watch-only';

  constructor() {
    super();
    this.use_with_hardware_wallet = false;
    this.masterFingerprint = false;
  }

  allowSend() {
    return (
      this.useWithHardwareWalletEnabled() && this._hdWalletInstance instanceof HDSegwitBech32Wallet && this._hdWalletInstance.allowSend()
    );
  }

  allowBatchSend() {
    return (
      this.useWithHardwareWalletEnabled() &&
      this._hdWalletInstance instanceof HDSegwitBech32Wallet &&
      this._hdWalletInstance.allowBatchSend()
    );
  }

  allowSendMax() {
    return (
      this.useWithHardwareWalletEnabled() && this._hdWalletInstance instanceof HDSegwitBech32Wallet && this._hdWalletInstance.allowSendMax()
    );
  }

  getAddress() {
    if (this.isAddressValid(this.secret)) return this.secret; // handling case when there is an XPUB there
    if (this._hdWalletInstance) throw new Error('Should not be used in watch-only HD wallets');
    throw new Error('Not initialized');
  }

  valid() {
    if (this.secret.startsWith('xpub') || this.secret.startsWith('ypub') || this.secret.startsWith('zpub')) return true;

    try {
      bitcoin.address.toOutputScript(this.getAddress());
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * this method creates appropriate HD wallet class, depending on whether we have xpub, ypub or zpub
   * as a property of `this`, and in case such property exists - it recreates it and copies data from old one.
   * this is needed after serialization/save/load/deserialization procedure.
   */
  init() {
    let hdWalletInstance;
    if (this.secret.startsWith('xpub')) hdWalletInstance = new HDLegacyP2PKHWallet();
    else if (this.secret.startsWith('ypub')) hdWalletInstance = new HDSegwitP2SHWallet();
    else if (this.secret.startsWith('zpub')) hdWalletInstance = new HDSegwitBech32Wallet();
    else return;
    hdWalletInstance._xpub = this.secret;
    if (this._hdWalletInstance) {
      // now, porting all properties from old object to new one
      for (let k of Object.keys(this._hdWalletInstance)) {
        hdWalletInstance[k] = this._hdWalletInstance[k];
      }

      // deleting properties that cant survive serialization/deserialization:
      delete hdWalletInstance._node1;
      delete hdWalletInstance._node0;
    }
    this._hdWalletInstance = hdWalletInstance;
  }

  getBalance() {
    if (this._hdWalletInstance) return this._hdWalletInstance.getBalance();
    return super.getBalance();
  }

  getTransactions() {
    if (this._hdWalletInstance) return this._hdWalletInstance.getTransactions();
    return super.getTransactions();
  }

  async fetchBalance() {
    if (this.secret.startsWith('xpub') || this.secret.startsWith('ypub') || this.secret.startsWith('zpub')) {
      if (!this._hdWalletInstance) this.init();
      return this._hdWalletInstance.fetchBalance();
    } else {
      // return LegacyWallet.prototype.fetchBalance.call(this);
      return super.fetchBalance();
    }
  }

  async fetchTransactions() {
    if (this.secret.startsWith('xpub') || this.secret.startsWith('ypub') || this.secret.startsWith('zpub')) {
      if (!this._hdWalletInstance) this.init();
      return this._hdWalletInstance.fetchTransactions();
    } else {
      // return LegacyWallet.prototype.fetchBalance.call(this);
      return super.fetchTransactions();
    }
  }

  async getAddressAsync() {
    if (this.isAddressValid(this.secret)) return new Promise(resolve => resolve(this.secret));
    if (this._hdWalletInstance) return this._hdWalletInstance.getAddressAsync();
    throw new Error('Not initialized');
  }

  async _getExternalAddressByIndex(index) {
    if (this._hdWalletInstance) return this._hdWalletInstance._getExternalAddressByIndex(index);
    throw new Error('Not initialized');
  }

  getNextFreeAddressIndex() {
    if (this._hdWalletInstance) return this._hdWalletInstance.next_free_address_index;
    throw new Error('Not initialized');
  }

  async getChangeAddressAsync() {
    if (this._hdWalletInstance) return this._hdWalletInstance.getChangeAddressAsync();
    throw new Error('Not initialized');
  }

  async fetchUtxo() {
    if (this._hdWalletInstance) return this._hdWalletInstance.fetchUtxo();
    throw new Error('Not initialized');
  }

  getUtxo() {
    if (this._hdWalletInstance) return this._hdWalletInstance.getUtxo();
    throw new Error('Not initialized');
  }

  combinePsbt(base64one, base64two) {
    if (this._hdWalletInstance) return this._hdWalletInstance.combinePsbt(base64one, base64two);
    throw new Error('Not initialized');
  }

  broadcastTx(hex) {
    if (this._hdWalletInstance) return this._hdWalletInstance.broadcastTx(hex);
    throw new Error('Not initialized');
  }

  /**
   * signature of this method is the same ad BIP84 createTransaction, BUT this method should be used to create
   * unsinged PSBT to be used with HW wallet (or other external signer)
   * @see HDSegwitBech32Wallet.createTransaction
   */
  createTransaction(utxos, targets, feeRate, changeAddress, sequence) {
    if (this._hdWalletInstance instanceof HDSegwitBech32Wallet) {
      return this._hdWalletInstance.createTransaction(utxos, targets, feeRate, changeAddress, sequence, true, this.getMasterFingerprint());
    } else {
      throw new Error('Not a zpub watch-only wallet, cant create PSBT (or just not initialized)');
    }
  }

  getMasterFingerprint() {
    return this.masterFingerprint;
  }

  getMasterFingerprintHex() {
    if (!this.masterFingerprint) return '00000000';
    let masterFingerprintHex = Number(this.masterFingerprint).toString(16);
    if (masterFingerprintHex.length < 8) masterFingerprintHex = '0' + masterFingerprintHex; // conversion without explicit zero might result in lost byte
    // poor man's little-endian conversion:
    // ¯\_(ツ)_/¯
    return (
      masterFingerprintHex[6] +
      masterFingerprintHex[7] +
      masterFingerprintHex[4] +
      masterFingerprintHex[5] +
      masterFingerprintHex[2] +
      masterFingerprintHex[3] +
      masterFingerprintHex[0] +
      masterFingerprintHex[1]
    );
  }

  isHd() {
    return this.secret.startsWith('xpub') || this.secret.startsWith('ypub') || this.secret.startsWith('zpub');
  }

  weOwnAddress(address) {
    if (this.isHd()) {
      if (this._hdWalletInstance) return this._hdWalletInstance.weOwnAddress(address);
      throw new Error('Not initialized');
    }

    return this.getAddress() === address;
  }

  allowHodlHodlTrading() {
    return this.isHd();
  }

  useWithHardwareWalletEnabled() {
    return !!this.use_with_hardware_wallet;
  }

  setUseWithHardwareWalletEnabled(enabled) {
    this.use_with_hardware_wallet = !!enabled;
  }
}
