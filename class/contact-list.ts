import BIP47Factory from '@spsina/bip47';

import { SilentPayment } from 'silent-payments';

import ecc from '../blue_modules/noble_ecc';
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
    return SilentPayment.isPaymentCodeValid(pc);
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
      if (decoded.version === 1 && !ecc.isPoint(Buffer.concat([Buffer.from([2]), decoded.data]))) return false;
      if (decoded.version > 1) return false;
      // ^^^ some day, when versions above 1 will be actually utilized, we would need to unhardcode this
      return true;
    } catch (e) {
      return false;
    }
  }
}
