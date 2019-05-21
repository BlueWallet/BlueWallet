const BlueElectrum = require('../BlueElectrum');

export const NetworkTransactionFeeStatus = Object.freeze({
  FAILED: 'FAILED',
  FETCHING: 'FETCHING',
  INACTIVE: 'INACTIVE',
});

export class NetworkTransactionFee {
  static StorageKey = 'NetworkTransactionFee';

  constructor(fast = 1, moderate = 1, economy = 1) {
    this.fast = fast;
    this.moderate = moderate;
    this.economy = economy;
  }
}

export default class NetworkTransactionFees {
  static recommendedFees() {
    return new Promise(async (resolve, reject) => {
    //  reject(new Error());
      try {
        let response = await BlueElectrum.estimateFees();
        if (typeof response === 'object') {
          const networkFee = new NetworkTransactionFee(response.fast, response.moderate, response.economy);
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
