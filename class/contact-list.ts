import BIP47Factory from '@spsina/bip47';

import { SilentPayment } from 'silent-payments';

import ecc from '../blue_modules/noble_ecc';

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
}
