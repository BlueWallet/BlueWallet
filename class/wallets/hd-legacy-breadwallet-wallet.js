import * as bitcoinjs from 'bitcoinjs-lib';
import { HDLegacyP2PKHWallet } from './hd-legacy-p2pkh-wallet';
import { AbstractHDElectrumWallet } from './abstract-hd-electrum-wallet';
import BIP32Factory from 'bip32';
import ecc from '../../blue_modules/noble_ecc';

const BlueElectrum = require('../../blue_modules/BlueElectrum');
const bip32 = BIP32Factory(ecc);

/**
 * HD Wallet (BIP39).
 * In particular, Breadwallet-compatible (Legacy addresses)
 */
export class HDLegacyBreadwalletWallet extends HDLegacyP2PKHWallet {
  static type = 'HDLegacyBreadwallet';
  static typeReadable = 'HD Legacy Breadwallet (P2PKH)';
  static derivationPath = "m/0'";

  // track address index at which wallet switched to segwit
  _external_segwit_index = null;
  _internal_segwit_index = null;

  // we need a separate function without external_addresses_cache to use in binarySearch
  _calcNodeAddressByIndex(node, index, p2wpkh = false) {
    let _node;
    if (node === 0) {
      _node = this._node0 || (this._node0 = bip32.fromBase58(this.getXpub()).derive(node));
    }
    if (node === 1) {
      _node = this._node1 || (this._node1 = bip32.fromBase58(this.getXpub()).derive(node));
    }
    const pubkey = _node.derive(index).publicKey;
    const address = p2wpkh ? bitcoinjs.payments.p2wpkh({ pubkey }).address : bitcoinjs.payments.p2pkh({ pubkey }).address;
    return address;
  }

  // this function is different from HDLegacyP2PKHWallet._getNodeAddressByIndex.
  // It takes _external_segwit_index _internal_segwit_index for account
  // and starts to generate segwit addresses if index more than them
  _getNodeAddressByIndex(node, index) {
    index = index * 1; // cast to int
    if (node === 0) {
      if (this.external_addresses_cache[index]) return this.external_addresses_cache[index]; // cache hit
    }

    if (node === 1) {
      if (this.internal_addresses_cache[index]) return this.internal_addresses_cache[index]; // cache hit
    }

    let p2wpkh = false;
    if (
      (node === 0 && this._external_segwit_index !== null && index >= this._external_segwit_index) ||
      (node === 1 && this._internal_segwit_index !== null && index >= this._internal_segwit_index)
    ) {
      p2wpkh = true;
    }

    const address = this._calcNodeAddressByIndex(node, index, p2wpkh);

    if (node === 0) {
      return (this.external_addresses_cache[index] = address);
    }

    if (node === 1) {
      return (this.internal_addresses_cache[index] = address);
    }
  }

  async fetchBalance() {
    try {
      if (this.next_free_change_address_index === 0 && this.next_free_address_index === 0) {
        // doing binary search for last used addresses external/internal and legacy/bech32:
        const [nextFreeExternalLegacy, nextFreeInternalLegacy] = await Promise.all([
          this._binarySearchIteration(0, 1000, 0, false),
          this._binarySearchIteration(0, 1000, 1, false),
        ]);
        const [nextFreeExternalBech32, nextFreeInternalBech32] = await Promise.all([
          this._binarySearchIteration(nextFreeExternalLegacy, nextFreeExternalLegacy + 1000, 0, true),
          this._binarySearchIteration(nextFreeInternalLegacy, nextFreeInternalLegacy + 1000, 1, true),
        ]);

        // trying to detect if segwit activated. This condition can be deleted when BRD will enable segwit by default
        if (nextFreeExternalLegacy < nextFreeExternalBech32) {
          this._external_segwit_index = nextFreeExternalLegacy;
        }
        this.next_free_address_index = nextFreeExternalBech32;

        this._internal_segwit_index = nextFreeInternalLegacy; // force segwit for change
        this.next_free_change_address_index = nextFreeInternalBech32;
      } // end rescanning fresh wallet

      // finally fetching balance
      await this._fetchBalance();
    } catch (err) {
      console.warn(err);
    }
  }

  async _binarySearchIteration(startIndex, endIndex, node = 0, p2wpkh = false) {
    const gerenateChunkAddresses = chunkNum => {
      const ret = [];
      for (let c = this.gap_limit * chunkNum; c < this.gap_limit * (chunkNum + 1); c++) {
        ret.push(this._calcNodeAddressByIndex(node, c, p2wpkh));
      }
      return ret;
    };

    let lastChunkWithUsedAddressesNum = null;
    let lastHistoriesWithUsedAddresses = null;
    for (let c = 0; c < Math.round(endIndex / this.gap_limit); c++) {
      const histories = await BlueElectrum.multiGetHistoryByAddress(gerenateChunkAddresses(c));
      if (this.constructor._getTransactionsFromHistories(histories).length > 0) {
        // in this particular chunk we have used addresses
        lastChunkWithUsedAddressesNum = c;
        lastHistoriesWithUsedAddresses = histories;
      } else {
        // empty chunk. no sense searching more chunks
        break;
      }
    }

    let lastUsedIndex = startIndex;

    if (lastHistoriesWithUsedAddresses) {
      // now searching for last used address in batch lastChunkWithUsedAddressesNum
      for (
        let c = lastChunkWithUsedAddressesNum * this.gap_limit;
        c < lastChunkWithUsedAddressesNum * this.gap_limit + this.gap_limit;
        c++
      ) {
        const address = this._calcNodeAddressByIndex(node, c, p2wpkh);
        if (lastHistoriesWithUsedAddresses[address] && lastHistoriesWithUsedAddresses[address].length > 0) {
          lastUsedIndex = Math.max(c, lastUsedIndex) + 1; // point to next, which is supposed to be unsued
        }
      }
    }

    return lastUsedIndex;
  }

  _addPsbtInput(psbt, input, sequence, masterFingerprintBuffer) {
    // hack to use
    // AbstractHDElectrumWallet._addPsbtInput for bech32 address
    // HDLegacyP2PKHWallet._addPsbtInput for legacy address
    const ProxyClass = input.address.startsWith('bc1') ? AbstractHDElectrumWallet : HDLegacyP2PKHWallet;
    const proxy = new ProxyClass();
    return proxy._addPsbtInput.apply(this, [psbt, input, sequence, masterFingerprintBuffer]);
  }
}
