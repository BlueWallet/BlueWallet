import Frisbee from 'frisbee';

export class BitcoinBIP70Transaction {
  constructor(amount, address, memo, fee) {
    this.amount = amount;
    this.address = address;
    this.memo = memo;
    this.fee = fee;
  }
}

export default class BitcoinBIP70TransactionDecode {
  static decode(data) {
    return new Promise(async (resolve, reject) => {
      try {
        const url = data.match(/\bhttps?:\/\/\S+/gi);
        const api = new Frisbee({
          baseURI: url,
          headers: {
            Accept: 'application/payment-request',
          },
        });
        let response = await api.get();
        if (response && response.body) {
          const parsedJSON = JSON.parse(response.body);
          const decodedTransaction = new BitcoinBIP70Transaction(
            parsedJSON.outputs[0].amount,
            parsedJSON.outputs[0].address,
            parsedJSON.memo,
            parsedJSON.requiredFeeRate,
          );
          console.log(decodedTransaction)
          resolve(decodedTransaction);
        } else {
          throw new Error('Could not fetch transaction details: ' + response.err);
        }
      } catch (err) {
        console.warn(err);
        reject(err);
      }
    });
  }

  static matchesPaymentURL(data) {
    return data.match(/\bhttps?:\/\/\S+/gi) !== null;
  }
}
