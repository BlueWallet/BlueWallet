import { updateApplicationContext, watchEvents, getIsWatchAppInstalled } from 'react-native-watch-connectivity';
import { InteractionManager } from 'react-native';
import { Chain } from './models/bitcoinUnits';
import loc, { formatBalance, transactionTimeToReadable } from './loc';
const notifications = require('./blue_modules/notifications');

const WatchConnectivity = () => {
  const handleMessages = (message, reply) => {
    const BlueApp = require('./BlueApp');
    if (message.request === 'createInvoice') {
      handleLightningInvoiceCreateRequest(message.walletIndex, message.amount, message.description)
        .then(createInvoiceRequest => reply({ invoicePaymentRequest: createInvoiceRequest }))
        .catch(e => console.log(e));
    } else if (message.message === 'sendApplicationContext') {
      WatchConnectivity.sendWalletsToWatch();
    } else if (message.message === 'fetchTransactions') {
      BlueApp.fetchWalletTransactions().then(() => BlueApp.saveToDisk());
    }
  };

  const handleLightningInvoiceCreateRequest = async (walletIndex, amount, description = loc.lnd.placeholder) => {
    const BlueApp = require('./BlueApp');
    const wallet = BlueApp.getWallets()[walletIndex];
    if (wallet.allowReceive() && amount > 0) {
      try {
        const invoiceRequest = await wallet.addInvoice(amount, description);

        // lets decode payreq and subscribe groundcontrol so we can receive push notification when our invoice is paid
        try {
          // Let's verify if notifications are already configured. Otherwise the watch app will freeze waiting for user approval in iOS app
          if (await notifications.isNotificationsEnabled()) {
            const decoded = await wallet.decodeInvoice(invoiceRequest);
            notifications.majorTomToGroundControl([], [decoded.payment_hash], []);
          }
        } catch (e) {
          console.log('WatchConnectivity - Running in Simulator');
          console.log(e);
        }
        return invoiceRequest;
      } catch (error) {
        return error;
      }
    }
  };

  getIsWatchAppInstalled().then(installed => {
    if (installed) {
      watchEvents.addListener('message', handleMessages);
    }
  });
};

WatchConnectivity.sendWalletsToWatch = () => {
  const BlueApp = require('./BlueApp');
  const allWallets = BlueApp.getWallets();
  if (!Array.isArray(allWallets)) {
    console.log('No Wallets set to sync with Watch app. Exiting...');
    return;
  } else if (allWallets.length === 0) {
    console.log('Wallets array is set. No Wallets set to sync with Watch app. Exiting...');
    return;
  }

  return InteractionManager.runAfterInteractions(async () => {
    const BlueApp = require('./BlueApp');
    const wallets = [];

    for (const wallet of allWallets) {
      let receiveAddress;
      if (wallet.getAddressAsync) {
        if (wallet.chain === Chain.ONCHAIN) {
          try {
            receiveAddress = await wallet.getAddressAsync();
          } catch (_) {}
          if (!receiveAddress) {
            // either sleep expired or getAddressAsync threw an exception
            receiveAddress = wallet._getExternalAddressByIndex(wallet.next_free_address_index);
          }
        } else if (wallet.chain === Chain.OFFCHAIN) {
          try {
            await wallet.getAddressAsync();
            receiveAddress = wallet.getAddress();
          } catch (_) {}
          if (!receiveAddress) {
            // either sleep expired or getAddressAsync threw an exception
            receiveAddress = wallet.getAddress();
          }
        }
      }
      const transactions = wallet.getTransactions(10);
      const watchTransactions = [];
      for (const transaction of transactions) {
        let type = 'pendingConfirmation';
        let memo = '';
        let amount = 0;

        if ('confirmations' in transaction && !(transaction.confirmations > 0)) {
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
            amount = formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
          } else if (invoiceExpiration < now) {
            if (transaction.ispaid) {
              amount = formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
            } else {
              amount = loc.lnd.expired;
            }
          } else {
            amount = formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
          }
        } else {
          amount = formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
        }
        if (BlueApp.tx_metadata[transaction.hash] && BlueApp.tx_metadata[transaction.hash].memo) {
          memo = BlueApp.tx_metadata[transaction.hash].memo;
        } else if (transaction.memo) {
          memo = transaction.memo;
        }
        const watchTX = { type, amount, memo, time: transactionTimeToReadable(transaction.received) };
        watchTransactions.push(watchTX);
      }
      wallets.push({
        label: wallet.getLabel(),
        balance: formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
        type: wallet.type,
        preferredBalanceUnit: wallet.getPreferredBalanceUnit(),
        receiveAddress: receiveAddress,
        transactions: watchTransactions,
        xpub: wallet.getXpub() ? wallet.getXpub() : wallet.getSecret(),
      });
    }
    updateApplicationContext({ wallets, randomID: Math.floor(Math.random() * 11) });
    return { wallets };
  });
};
export default WatchConnectivity;
WatchConnectivity();
