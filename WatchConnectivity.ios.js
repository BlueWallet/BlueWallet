import * as Watch from 'react-native-watch-connectivity';
import { InteractionManager } from 'react-native';
const loc = require('./loc');
export default class WatchConnectivity {
  isAppInstalled = false;
  static shared = new WatchConnectivity();
  wallets;
  fetchTransactionsFunction = () => {};

  constructor() {
    this.getIsWatchAppInstalled();
  }

  getIsWatchAppInstalled() {
    Watch.getIsWatchAppInstalled((err, isAppInstalled) => {
      if (!err) {
        WatchConnectivity.shared.isAppInstalled = isAppInstalled;
        Watch.subscribeToWatchState((err, watchState) => {
          if (!err) {
            if (watchState === 'Activated') {
              WatchConnectivity.shared.sendWalletsToWatch();
            }
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
            } else if (message.message === 'sendApplicationContext') {
              await WatchConnectivity.shared.sendWalletsToWatch(WatchConnectivity.shared.wallets);
            } else if (message.message === 'fetchTransactions') {
              await WatchConnectivity.shared.fetchTransactionsFunction();
            }
          } else {
            reply(err);
          }
        });
      }
    });
  }

  async handleLightningInvoiceCreateRequest(walletIndex, amount, description) {
    const wallet = WatchConnectivity.shared.wallets[walletIndex];
    if (wallet.allowReceive() && amount > 0 && description.trim().length > 0) {
      try {
        const invoiceRequest = await wallet.addInvoice(amount, description);
        return invoiceRequest;
      } catch (error) {
        return error;
      }
    }
  }

  async sendWalletsToWatch(allWallets) {
    if (allWallets === undefined && WatchConnectivity.shared.wallets !== undefined) {
      allWallets = WatchConnectivity.shared.wallets;
    }
    if (allWallets && allWallets.length === 0) {
      return;
    }

    return InteractionManager.runAfterInteractions(async () => {
      if (WatchConnectivity.shared.isAppInstalled) {
        let wallets = [];

        for (const wallet of allWallets) {
          let receiveAddress = '';
          if (wallet.allowReceive()) {
            if (wallet.getAddressAsync) {
              try {
                await wallet.getAddressAsync();
                receiveAddress = wallet.getAddress();
              } catch (error) {
                console.log(error);
                receiveAddress = wallet.getAddress();
              }
            } else {
              receiveAddress = wallet.getAddress();
            }
          }
          let transactions = wallet.getTransactions(10);
          let watchTransactions = [];
          for (const transaction of transactions) {
            let type = 'pendingConfirmation';
            let memo = '';
            let amount = 0;

            if (transaction.hasOwnProperty('confirmations') && !(transaction.confirmations > 0)) {
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
              amount = isNaN(transaction.value) ? '0' : amount;
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
            if (WatchConnectivity.shared.tx_metadata[transaction.hash] && WatchConnectivity.shared.tx_metadata[transaction.hash]['memo']) {
              memo = WatchConnectivity.shared.tx_metadata[transaction.hash]['memo'];
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
        Watch.updateApplicationContext({ wallets, randomID: Math.floor(Math.random() * 11) });
        return { wallets };
      }
    });
  }
}
