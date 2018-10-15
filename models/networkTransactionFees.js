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
        const response = await fetch('https://bitcoinfees.earn.com/api/v1/fees/recommended');
        const responseJSON = await response.json();
        const networkFee = new NetworkTransactionFee(responseJSON.fastestFee, responseJSON.halfHourFee, responseJSON.hourFee);
        resolve(networkFee);
      } catch (error) {
        const networkFee = new NetworkTransactionFee(1, 1, 1);
        reject(networkFee);
      }
    });
  }
}
