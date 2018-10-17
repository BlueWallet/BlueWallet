import Frisbee from 'frisbee';

export class BitcoinBIP70Transaction {
  constructor(amount, address, memo, fee) {
    this.amount = amount;
    this.address = address;
    this.memo = memo;
    this.fee = fee;
  }
}

export class BitcoinBIP70TransactionError {
  constructor(errorMessage) {
    this.errorMessage = errorMessage;
  }
}

export default class BitcoinBIP70TransactionDecode {
  static decode(data) {
    return new Promise(async (resolve, reject) => {
      try {
        const url = data.match(/bitcoin:\?r=https?:\/\/\S+/gi);
        const api = new Frisbee({
          baseURI: url.toString().split('bitcoin:?r=')[1],
          headers: {
            Accept: 'application/payment-request',
          },
        });
        let response = await api.get();
        if (response && response.body) {
          const parsedJSON = JSON.parse(response.body);

          // Check that the invoice has not expired
          const expires = new Date(parsedJSON.expires).getTime();
          const now = new Date().getTime();
          if (now > expires) {
            throw new BitcoinBIP70TransactionError('This invoice has expired.');
          }
          //

          const decodedTransaction = new BitcoinBIP70Transaction(
            parsedJSON.outputs[0].amount,
            parsedJSON.outputs[0].address,
            parsedJSON.memo,
            parsedJSON.requiredFeeRate.toFixed(0),
          );
          console.log(decodedTransaction);
          resolve(decodedTransaction);
        } else {
          console.log('Could not fetch transaction details: ' + response.err);
          throw new BitcoinBIP70TransactionError('Unable to fetch transaction details. Please, make sure the provided link is valid.');
        }
      } catch (err) {
        console.warn(err);
        reject(err);
      }
    });
  }

  static matchesPaymentURL(data) {
    return data.match(/bitcoin:\?r=https?:\/\/\S+/gi) !== null;
  }
}
