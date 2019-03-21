import * as watch from 'react-native-watch-connectivity';
import { InteractionManager } from 'react-native';
const loc = require('./loc');
export default class WatchConnectivity {
  isAppInstalled = false;
  BlueApp = require('./BlueApp');

  constructor() {
    this.getIsWatchAppInstalled();
  }

  getIsWatchAppInstalled() {
    watch.getIsWatchAppInstalled((err, isAppInstalled) => {
      if (!err) {
        this.isAppInstalled = isAppInstalled;
        this.sendWalletsToWatch();
      }
    });
  }

  async sendWalletsToWatch() {
    InteractionManager.runAfterInteractions(async () => {
      if (this.isAppInstalled) {
        const allWallets = this.BlueApp.getWallets();
        let wallets = [];
        for (const wallet of allWallets) {
          let receiveAddress = '';
          if (wallet.getAddressAsync) {
            receiveAddress = await wallet.getAddressAsync();
          } else {
            receiveAddress = wallet.getAddress();
          }
          let transactions = wallet.getTransactions(10);
          let watchTransactions = [];
          for (const transaction of transactions) {
            let type = 'pendingConfirmation';
            let memo = '';
            let amount = 0;

            if (transaction.hasOwnProperty('confirmations') && !transaction.confirmations > 0) {
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
                amount =
                  loc.formatBalanceWithoutSuffix(transaction.value, wallet.getPreferredBalanceUnit(), true).toString() +
                  ' ' +
                  wallet.getPreferredBalanceUnit();
              } else if (invoiceExpiration < now) {
                if (transaction.ispaid) {
                  amount =
                    loc.formatBalanceWithoutSuffix(transaction.value, wallet.getPreferredBalanceUnit(), true).toString() +
                    ' ' +
                    wallet.getPreferredBalanceUnit();
                } else {
                  amount = loc.lnd.expired;
                }
              } else {
                amount =
                  loc.formatBalanceWithoutSuffix(transaction.value, wallet.getPreferredBalanceUnit(), true).toString() +
                  ' ' +
                  wallet.getPreferredBalanceUnit();
              }
            } else {
              amount =
                loc.formatBalanceWithoutSuffix(transaction.value, wallet.getPreferredBalanceUnit(), true).toString() +
                ' ' +
                wallet.getPreferredBalanceUnit();
            }
            if (this.BlueApp.tx_metadata[transaction.hash] && this.BlueApp.tx_metadata[transaction.hash]['memo']) {
              memo = this.BlueApp.tx_metadata[transaction.hash]['memo'];
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

        watch.updateApplicationContext({ wallets });
        watch.sendUserInfo({ wallets });
        watch.subscribeToMessages((err, message, _reply) => {
          if (!err) {
            if (message.message === 'sendApplicationContext') {
              watch.sendUserInfo({ wallets });
            }
          }
        });
      }
    });
  }
}

WatchConnectivity.init = function() {
  if (WatchConnectivity.shared) return;
  WatchConnectivity.shared = new WatchConnectivity();
};
