export class BitcoinTransaction {
  /**
   *
   * @param address
   * @param amount {number}
   * @param amountSats {integer} satoshi
   */
  constructor(address = '', amount, amountSats) {
    this.address = address;
    this.amount = amount;
    this.amountSats = amountSats;
  }
}
