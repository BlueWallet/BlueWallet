export default class WatchConnectivity {
  isAppInstalled = false;
  static shared = new WatchConnectivity();
  wallets;
  fetchTransactionsFunction = () => {};

  getIsWatchAppInstalled() {}

  async handleLightningInvoiceCreateRequest(_walletIndex, _amount, _description) {}

  async sendWalletsToWatch() {}
}
