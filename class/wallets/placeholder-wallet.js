import { AbstractWallet } from './abstract-wallet';

export class PlaceholderWallet extends AbstractWallet {
  static type = 'placeholder';
  static typeReadable = 'Placeholder';

  constructor() {
    super();
    this._isFailure = false;
  }

  allowSend() {
    return false;
  }

  getLabel() {
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
