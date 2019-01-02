import { AbstractHDWallet } from './abstract-hd-wallet';
import Frisbee from 'frisbee';
import { NativeModules } from 'react-native';
import bitcoin from 'bitcoinjs-lib';
import bip39 from 'bip39';
import BigNumber from 'bignumber.js';
import b58 from 'bs58check';
import signer from '../models/signer';

const { RNRandomBytes } = NativeModules;

/**
 * Converts ypub to xpub
 * @param {String} ypub - wallet ypub
 * @returns {*}
 */
function ypubToXpub(ypub) {
  let data = b58.decode(ypub);
  data = data.slice(4);
  data = Buffer.concat([Buffer.from('0488b21e', 'hex'), data]);

  return b58.encode(data);
}

/**
 * Creates Segwit P2SH Bitcoin address
 * @param hdNode
 * @returns {String}
 */
function nodeToP2shSegwitAddress(hdNode) {
  const pubkeyBuf = hdNode.keyPair.getPublicKeyBuffer();
  const hash = bitcoin.crypto.hash160(pubkeyBuf);
  const redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(hash);
  const hash2 = bitcoin.crypto.hash160(redeemScript);
  const scriptPubkey = bitcoin.script.scriptHash.output.encode(hash2);

  return bitcoin.address.fromOutputScript(scriptPubkey);
}

/**
 * HD Wallet (BIP39).
 * In particular, BIP49 (P2SH Segwit)
 * @see https://github.com/bitcoin/bips/blob/master/bip-0049.mediawiki
 */
export class HDSegwitP2SHWallet extends AbstractHDWallet {
  static type = 'HDsegwitP2SH';
  static typeReadable = 'HD SegWit (BIP49 P2SH)';

  allowSend() {
    return true;
  }

  async generate() {
    let that = this;
    return new Promise(function(resolve) {
      if (typeof RNRandomBytes === 'undefined') {
        // CLI/CI environment
        // crypto should be provided globally by test launcher
        return crypto.randomBytes(32, (err, buf) => { // eslint-disable-line
          if (err) throw err;
          that.secret = bip39.entropyToMnemonic(buf.toString('hex'));
          resolve();
        });
      }

      // RN environment
      RNRandomBytes.randomBytes(32, (err, bytes) => {
        if (err) throw new Error(err);
        let b = Buffer.from(bytes, 'base64').toString('hex');
        that.secret = bip39.entropyToMnemonic(b);
        resolve();
      });
    });
  }

  _getExternalWIFByIndex(index) {
    return this._getWIFByIndex(false, index);
  }

  _getInternalWIFByIndex(index) {
    return this._getWIFByIndex(true, index);
  }

  /**
   * Get internal/external WIF by wallet index
   * @param {Boolean} internal
   * @param {Number} index
   * @returns {*}
   * @private
   */
  _getWIFByIndex(internal, index) {
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.HDNode.fromSeedBuffer(seed);
    const path = `m/49'/0'/0'/${internal ? 1 : 0}/${index}`;
    const child = root.derivePath(path);

    return child.keyPair.toWIF();
  }

  _getExternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit

    const xpub = ypubToXpub(this.getXpub());
    const hdNode = bitcoin.HDNode.fromBase58(xpub);
    const address = nodeToP2shSegwitAddress(hdNode.derive(0).derive(index));

    return (this.external_addresses_cache[index] = address);
  }

  _getInternalAddressByIndex(index) {
    index = index * 1; // cast to int
    if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit

    const xpub = ypubToXpub(this.getXpub());
    const hdNode = bitcoin.HDNode.fromBase58(xpub);
    const address = nodeToP2shSegwitAddress(hdNode.derive(1).derive(index));

    return (this.internal_addresses_cache[index] = address);
  }

  /**
   * Returning ypub actually, not xpub. Keeping same method name
   * for compatibility.
   *
   * @return {String} ypub
   */
  getXpub() {
    if (this._xpub) {
      return this._xpub; // cache hit
    }
    // first, getting xpub
    const mnemonic = this.secret;
    const seed = bip39.mnemonicToSeed(mnemonic);
    const root = bitcoin.HDNode.fromSeedBuffer(seed);

    const path = "m/49'/0'/0'";
    const child = root.derivePath(path).neutered();
    const xpub = child.toBase58();

    // bitcoinjs does not support ypub yet, so we just convert it from xpub
    let data = b58.decode(xpub);
    data = data.slice(4);
    data = Buffer.concat([Buffer.from('049d7cb2', 'hex'), data]);
    this._xpub = b58.encode(data);

    return this._xpub;
  }

  /**
   * @inheritDoc
   */
  async fetchTransactions() {
    try {
      if (this.usedAddresses.length === 0) {
        // just for any case, refresh balance (it refreshes internal `this.usedAddresses`)
        await this.fetchBalance();
      }

      let addresses = this.usedAddresses.join('|');
      addresses += '|' + this._getExternalAddressByIndex(this.next_free_address_index);
      addresses += '|' + this._getInternalAddressByIndex(this.next_free_change_address_index);

      const api = new Frisbee({ baseURI: 'https://blockchain.info' });
      this.transactions = [];
      let offset = 0;

      while (1) {
        let response = await api.get('/multiaddr?active=' + addresses + '&n=100&offset=' + offset);

        if (response && response.body) {
          if (response.body.txs && response.body.txs.length === 0) {
            break;
          }

          this._lastTxFetch = +new Date();

          // processing TXs and adding to internal memory
          if (response.body.txs) {
            for (let tx of response.body.txs) {
              let value = 0;

              for (let input of tx.inputs) {
                // ----- INPUTS

                if (input.prev_out && input.prev_out.addr && this.weOwnAddress(input.prev_out.addr)) {
                  // this is outgoing from us
                  value -= input.prev_out.value;
                }
              }

              for (let output of tx.out) {
                // ----- OUTPUTS

                if (output.addr && this.weOwnAddress(output.addr)) {
                  // this is incoming to us
                  value += output.value;
                }
              }

              tx.value = value; // new BigNumber(value).div(100000000).toString() * 1;
              if (response.body.hasOwnProperty('info')) {
                if (response.body.info.latest_block.height && tx.block_height) {
                  tx.confirmations = response.body.info.latest_block.height - tx.block_height + 1;
                } else {
                  tx.confirmations = 0;
                }
              } else {
                tx.confirmations = 0;
              }
              this.transactions.push(tx);
            }

            if (response.body.txs.length < 100) {
              // this fetch yilded less than page size, thus requesting next batch makes no sense
              break;
            }
          } else {
            break; // error ?
          }
        } else {
          throw new Error('Could not fetch transactions from API: ' + response.err); // breaks here
        }

        offset += 100;
      }
    } catch (err) {
      console.warn(err);
    }
  }

  createTx(utxos, amount, fee, address) {
    for (let utxo of utxos) {
      utxo.wif = this._getWifForAddress(utxo.address);
    }

    let amountPlusFee = parseFloat(new BigNumber(amount).plus(fee).toString(10));
    return signer.createHDSegwitTransaction(
      utxos,
      address,
      amountPlusFee,
      fee,
      this._getInternalAddressByIndex(this.next_free_change_address_index),
    );
  }
}
