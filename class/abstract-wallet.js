export class AbstractWallet {
  constructor() {
    this.type = 'abstract';
    this.label = '';
    this.secret = ''; // private key or recovery phrase
    this.balance = 0;
    this.transactions = [];
    this._address = false; // cache
    this.utxo = [];
  }

  getTransactions() {
    return this.transactions;
  }

  getTypeReadable() {
    return this.type;
  }

  /**
   *
   * @returns {string}
   */
  getLabel() {
    return this.label;
  }

  getBalance() {
    return this.balance;
  }

  setLabel(newLabel) {
    this.label = newLabel;
    return this;
  }

  getSecret() {
    return this.secret;
  }

  setSecret(newSecret) {
    this.secret = newSecret;
    return this;
  }

  static fromJson(obj) {
    let obj2 = JSON.parse(obj);
    let temp = new this();
    for (let key2 of Object.keys(obj2)) {
      temp[key2] = obj2[key2];
    }

    return temp;
  }

  getAddress() {}

  // createTx () { throw Error('not implemented') }
}
