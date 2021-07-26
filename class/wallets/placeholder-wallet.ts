import { AbstractWallet } from './abstract-wallet';

export class PlaceholderWallet extends AbstractWallet {
  static type = 'placeholder';
  static typeReadable = 'Placeholder';

  _isFailure: boolean;

  constructor() {
    super();
    this._isFailure = false;
  }

  setSecret(newSecret: string): this {
    // so TRY AGAIN when something goes wrong during import has more consistent prefilled text
    this.secret = newSecret;

    return this;
  }

  allowSend(): boolean {
    return false;
  }

  getLabel(): string {
    // no longer used in wallets carousel
    return this.getIsFailure() ? 'Wallet Import' : 'Importing Wallet...';
  }

  allowReceive(): boolean {
    return false;
  }

  getIsFailure(): boolean {
    return this._isFailure;
  }

  setIsFailure(value: boolean): void {
    this._isFailure = value;
  }
}
