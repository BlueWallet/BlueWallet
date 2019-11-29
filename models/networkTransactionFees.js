const BlueElectrum = require('../BlueElectrum');

export const NetworkTransactionFeeStatus = Object.freeze({
  FAILED: 'FAILED',
  FETCHING: 'FETCHING',
  INACTIVE: 'INACTIVE',
});
export const NetworkTransactionFeeType = Object.freeze({
  FAST: 'Fast',
  MEDIUM: 'MEDIUM',
  SLOW: 'SLOW',
  CUSTOM: 'CUSTOM',
});

export class NetworkTransactionFee {
  static StorageKey = 'NetworkTransactionFee';

  constructor(fast = 1, medium = 1, slow = 1) {
    this.fast = fast;
    this.medium = medium;
    this.slow = slow;
  }
}

export default class NetworkTransactionFees {
  static recommendedFees() {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await BlueElectrum.estimateFees();
        if (typeof response === 'object') {
          const networkFee = new NetworkTransactionFee(response.fast, response.medium, response.slow);
          resolve(networkFee);
        } else {
          reject(new Error());
        }
      } catch (err) {
        console.warn(err);
        reject(err);
      }
    });
  }
}
