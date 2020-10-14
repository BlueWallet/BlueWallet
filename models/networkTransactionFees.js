import BigNumber from 'bignumber.js';

import { BitcoinUnit } from './bitcoinUnits';

const BlueElectrum = require('../BlueElectrum');
const loc = require('../loc');

export const NetworkTransactionFeeType = Object.freeze({
  FAST: 'Fast',
  MEDIUM: 'MEDIUM',
  SLOW: 'SLOW',
  CUSTOM: 'CUSTOM',
});

export class NetworkTransactionFee {
  static StorageKey = 'NetworkTransactionFee';

  constructor(fastestFee = 1, halfHourFee = 1, hourFee = 1) {
    this.fastestFee = fastestFee;
    this.halfHourFee = halfHourFee;
    this.hourFee = hourFee;
  }
}

export default class NetworkTransactionFees {
  static recommendedFees() {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await BlueElectrum.estimateFees();
        if (typeof response === 'object') {
          const fast = loc.formatBalanceWithoutSuffix(
            new BigNumber(response.fast)
              .multipliedBy(1)
              .toNumber()
              .toFixed(0),
            BitcoinUnit.SATS,
          );
          const medium = loc.formatBalanceWithoutSuffix(
            new BigNumber(response.medium)
              .multipliedBy(1)
              .toNumber()
              .toFixed(0),
            BitcoinUnit.SATS,
          );
          const slow = loc.formatBalanceWithoutSuffix(
            new BigNumber(response.slow)
              .multipliedBy(1)
              .toNumber()
              .toFixed(0),
            BitcoinUnit.SATS,
          );
          const networkFee = new NetworkTransactionFee(fast, medium, slow);
          resolve(networkFee);
        } else {
          const networkFee = new NetworkTransactionFee(1, 1, 1);
          reject(networkFee);
        }
      } catch (err) {
        const networkFee = new NetworkTransactionFee(1, 1, 1);
        reject(networkFee);
      }
    });
  }
}
