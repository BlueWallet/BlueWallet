import BIP47Factory from '@spsina/bip47';

import { bech32m } from 'bech32';

import ecc from '../blue_modules/noble_ecc';
import { concatUint8Arrays } from '../blue_modules/uint8array-extras';
import * as bitcoin from 'bitcoinjs-lib';

export class ContactList {
  isBip47PaymentCodeValid(pc: string) {
    try {
      BIP47Factory(ecc).fromPaymentCode(pc);
      return true;
    } catch (_) {
      return false;
    }
  }

  isBip352PaymentCodeValid(pc: string) {
    // stricter than SilentPayment.isPaymentCodeValid() of pinned silent-payments: checks prefix, case, length and keys
    if (pc !== pc.toLowerCase() && pc !== pc.toUpperCase()) return false;
    try {
      const { prefix, words } = bech32m.decode(pc.toLowerCase(), 118);
      if (prefix !== 'sp' || words.shift() !== 0) return false;
      const data = new Uint8Array(bech32m.fromWords(words));
      return data.length === 66 && ecc.isPoint(data.slice(0, 33)) && ecc.isPoint(data.slice(33));
    } catch (_) {
      return false;
    }
  }

  isPaymentCodeValid(pc: string): boolean {
    return this.isBip47PaymentCodeValid(pc) || this.isBip352PaymentCodeValid(pc);
  }

  isAddressValid(address: string): boolean {
    try {
      bitcoin.address.toOutputScript(address); // throws, no?

      if (!address.toLowerCase().startsWith('bc1')) return true;
      const decoded = bitcoin.address.fromBech32(address);
      if (decoded.version === 0) return true;
      if (decoded.version === 1 && decoded.data.length !== 32) return false;
      if (decoded.version === 1 && !ecc.isPoint(concatUint8Arrays([new Uint8Array([2]), decoded.data]))) return false;
      if (decoded.version > 1) return false;
      // ^^^ some day, when versions above 1 will be actually utilized, we would need to unhardcode this
      return true;
    } catch (e) {
      return false;
    }
  }
}
