import BIP47Factory from '@spsina/bip47';

import ecc from '../blue_modules/noble_ecc';

export class ContactList {
  isPaymentCodeValid(pc: string): boolean {
    try {
      BIP47Factory(ecc).fromPaymentCode(pc);
      return true;
    } catch (_) {
      return false;
    }
  }
}
