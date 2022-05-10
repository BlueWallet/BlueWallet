const BlueElectrum = require('../blue_modules/BlueElectrum');

export const NetworkTransactionFeeType = Object.freeze({
  FAST: 'Fast',
  MEDIUM: 'MEDIUM',
  SLOW: 'SLOW',
  CUSTOM: 'CUSTOM',
});

export class NetworkTransactionFee {
  static StorageKey = 'NetworkTransactionFee';

  constructor(fastestFee = 1, mediumFee = 1, slowFee = 1) {
    this.fastestFee = fastestFee;
    this.mediumFee = mediumFee;
    this.slowFee = slowFee;
  }
}

export default class NetworkTransactionFees {
  static recommendedFees() {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async resolve => {
      try {
        const isDisabled = await BlueElectrum.isDisabled();
        if (isDisabled) {
          throw new Error('Electrum is disabled. Dont attempt to fetch fees');
        }
        const response = await BlueElectrum.estimateFees();
        if (typeof response === 'object') {
          const networkFee = new NetworkTransactionFee(response.fast, response.medium, response.slow);
          resolve(networkFee);
        } else {
          const networkFee = new NetworkTransactionFee(1, 1, 1);
          resolve(networkFee);
        }
      } catch (err) {
        console.warn(err);
        const networkFee = new NetworkTransactionFee(1, 1, 1);
        resolve(networkFee);
      }
    });
  }
}
