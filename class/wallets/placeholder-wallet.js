import { AbstractWallet } from './abstract-wallet';

export class PlaceholderWallet extends AbstractWallet {
  static type = 'placeholder';
  static typeReadable = 'Placeholder';

  constructor() {
    super();
    this._isFailure = false;
  }

  setSecret(newSecret) {
    // so TRY AGAIN when something goes wrong during import has more consistent prefilled text
    this.secret = newSecret;
  }

  allowSend() {
    return false;
  }

  getLabel() {
    // no longer used in wallets carousel
    return this.getIsFailure() ? 'Wallet Import' : 'Importing Wallet...';
  }

  allowReceive() {
    return false;
  }

  getIsFailure() {
    return this._isFailure;
  }

  setIsFailure(value) {
    this._isFailure = value;
  }
}
