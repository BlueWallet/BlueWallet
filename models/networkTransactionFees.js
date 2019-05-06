const BlueElectrum = require('../BlueElectrum');
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
      try {
        let response = await BlueElectrum.estimateFees();
        if (typeof response === 'object') {
          const networkFee = new NetworkTransactionFee(response.fast, response.moderate, response.economy);
          resolve(networkFee);
        } else {
          const networkFee = new NetworkTransactionFee(1, 1, 1);
          reject(networkFee);
        }
      } catch (err) {
        console.warn(err);
        const networkFee = new NetworkTransactionFee(1, 1, 1);
        reject(networkFee);
      }
    });
  }
}
