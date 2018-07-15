import { LegacyWallet } from './legacy-wallet';
import Frisbee from 'frisbee';

export class LightningCustodianWallet extends LegacyWallet {
  constructor() {
    super();
    this.type = 'lightningCustodianWallet';
    this.pendingTransactions = [];
    this.token = false;
    this.tokenRefreshedOn = 0;
    this._api = new Frisbee({
      baseURI: 'https://api.blockcypher.com/v1/btc/main/addrs/',
    });
  }

  async createAccount() {}

  async authorize() {}

  async getToken() {}

  async getBtcAddress() {}

  async newBtcAddress() {}

  async getPendngBalance() {}

  async decodeInvoice() {}

  async checkRoute() {}

  async payInvoice() {}

  async sendCoins() {}

  async getTransactions() {}

  async getTransaction() {}

  async getBalance() {}

  async getInfo() {}
}
