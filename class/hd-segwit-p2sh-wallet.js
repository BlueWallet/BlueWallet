import { LegacyWallet } from './legacy-wallet';
import { SegwitP2SHWallet } from './segwit-p2sh-wallet';
import Frisbee from 'frisbee';
const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const BigNumber = require('bignumber.js');
const b58 = require('bs58check');

/**
 * HD Wallet (BIP39).
 * In particular, BIP49 (P2SH Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki
 */
export class HDSegwitP2SHWallet extends LegacyWallet {
  constructor() {
    super();
    this.type = 'HDsegwitP2SH';
    this.next_free_address_index = 0;
    this.next_free_change_address_index = 0;
    this.internal_addresses_cache = {}; // index => address
    this.external_addresses_cache = {}; // index => address
  }

  allowSend() {
    return false; // TODO send from HD
  }

  validateMnemonic() {
    return bip39.validateMnemonic(this.secret);
  }

  getTypeReadable() {
    return 'HD SegWit (BIP49 P2SH)';
  }

  /**
   * Derives from hierarchy, returns next free address
   * (the one that has no transactions). Looks for several,
   * gives up if none found, and returns the used one
   *
   * @return {Promise.<string>}
   */
  async getAddressAsync() {
    // looking for free external address
    let freeAddress = '';
    let c;
    for (c = -1; c < 5; c++) {
      if (this.next_free_address_index + c < 0) continue;
      let Segwit = new SegwitP2SHWallet();
      Segwit.setSecret(this._getExternalWIFByIndex(this.next_free_address_index + c));
      await Segwit.fetchTransactions();
      if (Segwit.transactions.length === 0) {
        // found free address
        freeAddress = Segwit.getAddress();
        console.log('found free ', freeAddress, ' with index', this.next_free_address_index + c);
        this.next_free_address_index += c; // now points to _this one_
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

  _getExternalWIFByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/49'/0'/0'/0/" + index;
    let child = root.derivePath(path);
    return child.keyPair.toWIF();
  }

  _getInternalWIFByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/49'/0'/0'/1/" + index;
    let child = root.derivePath(path);
    return child.keyPair.toWIF();
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);
    let path = "m/49'/0'/0'/0/" + index;
    let child = root.derivePath(path);

    let keyhash = bitcoin.crypto.hash160(child.getPublicKeyBuffer());
    let scriptSig = bitcoin.script.witnessPubKeyHash.output.encode(keyhash);
    let addressBytes = bitcoin.crypto.hash160(scriptSig);
    let outputScript = bitcoin.script.scriptHash.output.encode(addressBytes);
    return bitcoin.address.fromOutputScript(outputScript, bitcoin.networks.bitcoin);
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/49'/0'/0'/1/" + index;
    let child = root.derivePath(path);

    let keyhash = bitcoin.crypto.hash160(child.getPublicKeyBuffer());
    let scriptSig = bitcoin.script.witnessPubKeyHash.output.encode(keyhash);
    let addressBytes = bitcoin.crypto.hash160(scriptSig);
    let outputScript = bitcoin.script.scriptHash.output.encode(addressBytes);
    return bitcoin.address.fromOutputScript(outputScript, bitcoin.networks.bitcoin);
  }

  /**
   * Returning ypub actually, not xpub. Keeping same method name
   * for compatibility.
   *
   * @return {String} ypub
   */
  getXpub() {
    // first, getting xpub
    let mnemonic = this.secret;
    let seed = bip39.mnemonicToSeed(mnemonic);
    let root = bitcoin.HDNode.fromSeedBuffer(seed);

    let path = "m/49'/0'/0'";
    let child = root.derivePath(path).neutered();
    let xpub = child.toBase58();

    // bitcoinjs does not support ypub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('049d7cb2', 'hex'), data]);
    return b58.encode(data);
  }

  async fetchBalance() {
    const api = new Frisbee({ baseURI: 'https://blockchain.info' });

    let response = await api.get('/balance?active=' + this.getXpub());

    if (response && response.body) {
      for (let xpub of Object.keys(response.body)) {
        this.balance = response.body[xpub].final_balance / 100000000;
      }
    } else {
      throw new Error('Could not fetch balance from API');
    }
  }

  /**
   * Async function to fetch all transactions. Use getter to get actual txs.
   * Also, sets internals:
   *  `this.internal_addresses_cache`
   *  `this.external_addresses_cache`
   *
   * @returns {Promise<void>}
   */
  async fetchTransactions() {
    const api = new Frisbee({ baseURI: 'https://blockchain.info' });
    this.transactions = [];
    let offset = 0;

    while (1) {
      let response = await api.get('/multiaddr?active=' + this.getXpub() + '&n=100&offset=' + offset);

      if (response && response.body) {
        if (response.body.txs && response.body.txs.length === 0) {
          break;
        }

        // processing TXs and adding to internal memory
        if (response.body.txs) {
          for (let tx of response.body.txs) {
            let value = 0;

            for (let input of tx.inputs) {
              // ----- INPUTS
              if (input.prev_out.xpub) {
                // sent FROM US
                value -= input.prev_out.value;

                // setting internal caches to help ourselves in future...
                let path = input.prev_out.xpub.path.split('/');
                if (path[path.length - 2] === '1') {
                  // change address
                  this.next_free_change_address_index = Math.max(path[path.length - 1] * 1 + 1, this.next_free_change_address_index);
                  // setting to point to last maximum known change address + 1
                }
                if (path[path.length - 2] === '0') {
                  // main (aka external) address
                  this.next_free_address_index = Math.max(path[path.length - 1] * 1 + 1, this.next_free_address_index);
                  // setting to point to last maximum known main address + 1
                }
                // done with cache
              }
            }

            for (let output of tx.out) {
              // ----- OUTPUTS
              if (output.xpub) {
                // sent TO US (change)
                value += output.value;

                // setting internal caches to help ourselves in future...
                let path = output.xpub.path.split('/');
                if (path[path.length - 2] === '1') {
                  // change address
                  this.next_free_change_address_index = Math.max(path[path.length - 1] * 1 + 1, this.next_free_change_address_index);
                  // setting to point to last maximum known change address + 1
                }
                if (path[path.length - 2] === '0') {
                  // main (aka external) address
                  this.next_free_address_index = Math.max(path[path.length - 1] * 1 + 1, this.next_free_address_index);
                  // setting to point to last maximum known main address + 1
                }
                // done with cache
              }
            }

            tx.value = new BigNumber(value).div(100000000).toString() * 1;

            this.transactions.push(tx);
          }
        } else {
          break; // error ?
        }
      } else {
        throw new Error('Could not fetch transactions from API'); // breaks here
      }

      offset += 100;
    }
  }
}
