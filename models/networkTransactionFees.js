import Frisbee from 'frisbee';

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
        const api = new Frisbee({ baseURI: 'https://bitcoinfees.earn.com' });
        let response = await api.get('/api/v1/fees/recommended');
        if (response && response.body) {
          const networkFee = new NetworkTransactionFee(response.body.fastestFee, response.body.halfHourFee, response.body.hourFee);
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
