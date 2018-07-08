import { LegacyWallet } from './legacy-wallet';

export class WatchOnlyWallet extends LegacyWallet {
  constructor() {
    super();
    this.type = 'watchOnly';
  }

  getTypeReadable() {
    return 'Watch-only';
  }

  allowSend() {
    return false;
  }

  getAddress() {
    return this.secret;
  }

  createTx(utxos, amount, fee, toAddress, memo) {
    throw new Error('Not supported');
  }
}
