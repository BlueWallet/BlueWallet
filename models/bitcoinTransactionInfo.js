export class BitcoinTransaction {
  constructor(address = '', amount, amountSats) {
    this.address = address;
    this.amount = amount;
    this.amountSats = amountSats;
  }
}
