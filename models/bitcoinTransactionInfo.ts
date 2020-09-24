export class BitcoinTransaction {
  address: string;
  amount?: string;
  constructor(address = '', amount?: string) {
    this.address = address;
    this.amount = amount;
  }
}
