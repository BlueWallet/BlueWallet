import BIP47Factory from '@spsina/bip47';

import ecc from '../blue_modules/noble_ecc';
import { TWallet } from './wallets/types';

export class ContactList {
  private _wallet: TWallet;

  constructor(wallet: TWallet) {
    if (!wallet.allowBIP47()) throw new Error('BIP47 is not allowed for the wallet');
    if (!wallet.isBIP47Enabled()) throw new Error('BIP47 is not enabled');

    this._wallet = wallet;
  }

  isPaymentCodeValid(pc: string): boolean {
    try {
      BIP47Factory(ecc).fromPaymentCode(pc);
      return true;
    } catch (_) {
      return false;
    }
  }
}
