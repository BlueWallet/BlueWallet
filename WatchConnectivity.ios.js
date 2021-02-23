import { useContext, useEffect } from 'react';
import {
  updateApplicationContext,
  watchEvents,
  useReachability,
  useInstalled,
  transferCurrentComplicationUserInfo,
} from 'react-native-watch-connectivity';
import { InteractionManager } from 'react-native';
import { Chain } from './models/bitcoinUnits';
import loc, { formatBalance, transactionTimeToReadable } from './loc';
import { BlueStorageContext } from './blue_modules/storage-context';
import Notifications from './blue_modules/notifications';

function WatchConnectivity() {
  const { walletsInitialized, wallets, fetchWalletTransactions, saveToDisk, txMetadata, preferredFiatCurrency } = useContext(
    BlueStorageContext,
  );
  const isReachable = useReachability();
  const isInstalled = useInstalled(); // true | false

  useEffect(() => {
    if (isInstalled && isReachable && walletsInitialized) {
      sendWalletsToWatch();
      watchEvents.on('message', handleMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized, wallets, preferredFiatCurrency, isReachable, isInstalled]);

  useEffect(() => {
    if (isInstalled && isReachable && walletsInitialized && preferredFiatCurrency) {
      try {
        transferCurrentComplicationUserInfo({
          preferredFiatCurrency: JSON.parse(preferredFiatCurrency).endPointKey,
        });
      } catch (e) {
        console.log('WatchConnectivity useEffect preferredFiatCurrency error');
        console.log(e);
      }
    }
  }, [preferredFiatCurrency, walletsInitialized, isReachable, isInstalled]);

  const handleMessages = (message, reply) => {
    if (message.request === 'createInvoice') {
      handleLightningInvoiceCreateRequest(message.walletIndex, message.amount, message.description)
        .then(createInvoiceRequest => reply({ invoicePaymentRequest: createInvoiceRequest }))
        .catch(e => console.log(e));
    } else if (message.message === 'sendApplicationContext') {
      sendWalletsToWatch();
    } else if (message.message === 'fetchTransactions') {
      fetchWalletTransactions().then(() => saveToDisk());
    } else if (message.message === 'hideBalance') {
      const walletIndex = message.walletIndex;
      const wallet = wallets[walletIndex];
      wallet.hideBalance = message.hideBalance;
      saveToDisk().finally(() => reply({}));
    }
  };

  const handleLightningInvoiceCreateRequest = async (walletIndex, amount, description = loc.lnd.placeholder) => {
    const wallet = wallets[walletIndex];
    if (wallet.allowReceive() && amount > 0) {
      try {
        const invoiceRequest = await wallet.addInvoice(amount, description);

        // lets decode payreq and subscribe groundcontrol so we can receive push notification when our invoice is paid
        try {
          // Let's verify if notifications are already configured. Otherwise the watch app will freeze waiting for user approval in iOS app
          if (await Notifications.isNotificationsEnabled()) {
            const decoded = await wallet.decodeInvoice(invoiceRequest);
            Notifications.majorTomToGroundControl([], [decoded.payment_hash], []);
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

  const sendWalletsToWatch = () => {
    if (!Array.isArray(wallets)) {
      console.log('No Wallets set to sync with Watch app. Exiting...');
      return;
    } else if (wallets.length === 0) {
      console.log('Wallets array is set. No Wallets set to sync with Watch app. Exiting...');
      updateApplicationContext({ wallets: [], randomID: Math.floor(Math.random() * 11) });
      return;
    }

    return InteractionManager.runAfterInteractions(async () => {
      const walletsToProcess = [];

      for (const wallet of wallets) {
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
          if (txMetadata[transaction.hash] && txMetadata[transaction.hash].memo) {
            memo = txMetadata[transaction.hash].memo;
          } else if (transaction.memo) {
            memo = transaction.memo;
          }
          const watchTX = { type, amount, memo, time: transactionTimeToReadable(transaction.received) };
          watchTransactions.push(watchTX);
        }
        walletsToProcess.push({
          label: wallet.getLabel(),
          balance: formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
          type: wallet.type,
          preferredBalanceUnit: wallet.getPreferredBalanceUnit(),
          receiveAddress: receiveAddress,
          transactions: watchTransactions,
          xpub: wallet.getXpub() ? wallet.getXpub() : wallet.getSecret(),
          hideBalance: wallet.hideBalance,
        });
      }
      updateApplicationContext({ wallets: walletsToProcess, randomID: Math.floor(Math.random() * 11) });
    });
  };

  return null;
}

export default WatchConnectivity;
