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
  }

  allowSend() {
    return !!this.use_with_hardware_wallet && this._hdWalletInstance instanceof HDSegwitBech32Wallet && this._hdWalletInstance.allowSend();
  }

  allowBatchSend() {
    return (
      !!this.use_with_hardware_wallet && this._hdWalletInstance instanceof HDSegwitBech32Wallet && this._hdWalletInstance.allowBatchSend()
    );
  }

  allowSendMax() {
    return (
      !!this.use_with_hardware_wallet && this._hdWalletInstance instanceof HDSegwitBech32Wallet && this._hdWalletInstance.allowSendMax()
    );
  }

  getAddress() {
    return this.secret;
  }

  createTx(utxos, amount, fee, toAddress, memo) {
    throw new Error('Not supported');
  }

  valid() {
    if (this.secret.startsWith('xpub') || this.secret.startsWith('ypub') || this.secret.startsWith('zpub')) return true;

    try {
      bitcoin.address.toOutputScript(this.getAddress());
      return true;
    } catch (e) {
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
    if (this._hdWalletInstance) return this._hdWalletInstance.getAddressAsync();
    throw new Error('Not initialized');
  }

  async _getExternalAddressByIndex(index) {
    if (this._hdWalletInstance) return this._hdWalletInstance._getExternalAddressByIndex(index);
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
      return this._hdWalletInstance.createTransaction(utxos, targets, feeRate, changeAddress, sequence, true);
    } else {
      throw new Error('Not a zpub watch-only wallet, cant create PSBT (or just not initialized)');
    }
  }
}
