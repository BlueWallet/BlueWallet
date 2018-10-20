import Frisbee from 'frisbee';

export class NetworkTransactionFee {
  constructor(fastestFee, halfHourFee, hourFee) {
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
          throw new Error('Could not fetch recommended network fees: ' + response.err);
        }
      } catch (err) {
        console.warn(err);
        const networkFee = new NetworkTransactionFee(1, 1, 1);
        reject(networkFee);
      }
    });
  }
}
