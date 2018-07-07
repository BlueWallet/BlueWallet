import { LegacyWallet, HDSegwitP2SHWallet } from './';
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');

/**
 * HD Wallet (BIP39).
 * In particular, BIP44 (P2PKH legacy addressess)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
 */
export class HDLegacyP2PKHWallet extends HDSegwitP2SHWallet {
  constructor() {
    super();
    this.type = 'HDlegacyP2PKH';
  }

  getTypeReadable() {
    return 'HD Legacy (BIP44 P2PKH)';
  }

  getXpub() {
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/44'/0'/0'";
    let child = root.derivePath(path).neutered();
    return child.toBase58();
  }

  _getExternalWIFByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/44'/0'/0'/0/" + index;
    let child = root.derivePath(path);
    return child.keyPair.toWIF();
  }

  _getInternalWIFByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/44'/0'/0'/1/" + index;
    let child = root.derivePath(path);
    return child.keyPair.toWIF();
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/44'/0'/0'/0/" + index;
    let child = root.derivePath(path);

    let w = new LegacyWallet();
    w.setSecret(child.keyPair.toWIF());
    return w.getAddress();
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/44'/0'/0'/1/" + index;
    let child = root.derivePath(path);

    let w = new LegacyWallet();
    w.setSecret(child.keyPair.toWIF());
    return w.getAddress();
  }

  /**
   * @inheritDoc
   */
  async getAddressAsync() {
    // looking for free external address
    let freeAddress = '';
    let c;
    for (c = -1; c < 5; c++) {
      let Legacy = new LegacyWallet();
      Legacy.setSecret(this._getExternalWIFByIndex(this.next_free_address_index + c));
      await Legacy.fetchTransactions();
      if (Legacy.transactions.length === 0) {
        // found free address
        freeAddress = Legacy.getAddress();
        this.next_free_address_index += c + 1; // now points to the one _after_
        break;
      }
    }

    if (!freeAddress) {
      // could not find in cycle above, give up
      freeAddress = this._getExternalAddressByIndex(this.next_free_address_index + c); // we didnt check this one, maybe its free
      this.next_free_address_index += c + 1; // now points to the one _after_
    }

    return freeAddress;
  }
}
