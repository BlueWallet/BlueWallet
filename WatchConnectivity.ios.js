import * as Watch from 'react-native-watch-connectivity';
import { InteractionManager } from 'react-native';
const loc = require('./loc');
export default class WatchConnectivity {
  isAppInstalled = false;
  BlueApp = require('./BlueApp');

  constructor() {
    this.getIsWatchAppInstalled();
  }

  getIsWatchAppInstalled() {
    Watch.getIsWatchAppInstalled((err, isAppInstalled) => {
      if (!err) {
        this.isAppInstalled = isAppInstalled;
        this.sendWalletsToWatch();
      }
    });
    Watch.subscribeToMessages(async (err, message, reply) => {
      if (!err) {
        if (message.request === 'createInvoice') {
          const createInvoiceRequest = await this.handleLightningInvoiceCreateRequest(
            message.walletIndex,
            message.amount,
            message.description,
          );
          reply({ invoicePaymentRequest: createInvoiceRequest });
        }
      } else {
        reply(err);
      }
    });
  }

  async handleLightningInvoiceCreateRequest(walletIndex, amount, description) {
    const wallet = this.BlueApp.getWallets()[walletIndex];
    if (wallet.allowReceive() && amount > 0 && description.trim().length > 0) {
      try {
        const invoiceRequest = await wallet.addInvoice(amount, description);
        return invoiceRequest;
      } catch (error) {
        return error;
      }
    }
  }

  async sendWalletsToWatch() {
    InteractionManager.runAfterInteractions(async () => {
      if (this.isAppInstalled) {
        const allWallets = this.BlueApp.getWallets();
        const wallets = [];
        for (const wallet of allWallets) {
          let receiveAddress = '';
          if (wallet.allowReceive()) {
            if (wallet.getAddressAsync) {
              await wallet.getAddressAsync();
              const address = wallet.getAddress();
              if (address.length === 0) {
                receiveAddress = wallet._getExternalAddressByIndex(wallet.next_free_address_index);
              } else {
                receiveAddress = address;
              }
            } else {
              receiveAddress = wallet.getAddress();
            }
          }
          if (receiveAddress.length === 0) {
            continue;
          }
          const transactions = wallet.getTransactions(10);
          const watchTransactions = [];
          for (const transaction of transactions) {
            let type = 'pendingConfirmation';
            let memo = '';
            let amount = 0;

            if (transaction.confirmations && transaction.confirmations < 1) {
              type = 'pendingConfirmation';
            } else if (transaction.type === 'user_invoice' || transaction.type === 'payment_request') {
              const currentDate = new Date();
              const now = (currentDate.getTime() / 1000) | 0;
              const invoiceExpiration = transaction.timestamp + transaction.expire_time;

              if (invoiceExpiration > now) {
                type = 'pendingConfirmation';
              } else if (invoiceExpiration < now) {
                if (transaction.ispaid) {
                  type = 'received';
                } else {
                  type = 'sent';
                }
              }
            } else if (transaction.value / 100000000 < 0) {
              type = 'sent';
            } else {
              type = 'received';
            }
            if (transaction.type === 'user_invoice' || transaction.type === 'payment_request') {
              if (isNaN(transaction.value)) {
                amount = '0';
              }
              const currentDate = new Date();
              const now = (currentDate.getTime() / 1000) | 0;
              const invoiceExpiration = transaction.timestamp + transaction.expire_time;

              if (invoiceExpiration > now) {
                amount = loc.formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
              } else if (invoiceExpiration < now) {
                if (transaction.ispaid) {
                  amount = loc.formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
                } else {
                  amount = loc.lnd.expired;
                }
              } else {
                amount = loc.formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
              }
            } else {
              amount = loc.formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
            }
            if (this.BlueApp.tx_metadata[transaction.hash] && this.BlueApp.tx_metadata[transaction.hash].memo) {
              memo = this.BlueApp.tx_metadata[transaction.hash].memo;
            } else if (transaction.memo) {
              memo = transaction.memo;
            }
            const watchTX = { type, amount, memo, time: loc.transactionTimeToReadable(transaction.received) };
            watchTransactions.push(watchTX);
          }
          wallets.push({
            label: wallet.getLabel(),
            balance: loc.formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
            type: wallet.type,
            preferredBalanceUnit: wallet.getPreferredBalanceUnit(),
            receiveAddress: receiveAddress,
            transactions: watchTransactions,
          });
        }

        Watch.updateApplicationContext({ wallets });
      }
    });
  }
}

WatchConnectivity.init = function() {
  if (WatchConnectivity.shared) return;
  WatchConnectivity.shared = new WatchConnectivity();
};
