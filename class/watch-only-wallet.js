import { LegacyWallet } from './legacy-wallet';
import { BitcoinUnit } from '../models/bitcoinUnits';
const bitcoin = require('bitcoinjs-lib');

export class WatchOnlyWallet extends LegacyWallet {
  constructor() {
    super();
    this.type = 'watchOnly';
    this.preferredBalanceUnit = BitcoinUnit.BTC;
  }

  getPreferredBalanceUnit() {
    return this.preferredBalanceUnit || BitcoinUnit.BTC;
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

  valid() {
    try {
      bitcoin.address.toOutputScript(this.getAddress());
      return true;
    } catch (e) {
      return false;
    }
  }
}
