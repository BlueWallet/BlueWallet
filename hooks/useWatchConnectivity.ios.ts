import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
  transferCurrentComplicationUserInfo,
  transferUserInfo,
  updateApplicationContext,
  useInstalled,
  useReachability,
  watchEvents,
  WatchPayload,
} from 'react-native-watch-connectivity';
import Notifications from '../blue_modules/notifications';
import { LightningCustodianWallet, MultisigHDWallet } from '../class';
import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { FiatUnit } from '../models/fiatUnit';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';

const useWatchConnectivity = () => {
  const { walletsInitialized, wallets, fetchWalletTransactions, saveToDisk, txMetadata } = useStorage();
  const { preferredFiatCurrency } = useSettings();
  const isReachable = useReachability();
  const isInstalled = useInstalled();
  const messagesListenerActive = useRef(false);
  const lastPreferredCurrency = useRef(FiatUnit.USD.endPointKey);

  useEffect(() => {
    if (!isInstalled || !isReachable || !walletsInitialized || messagesListenerActive.current) return;

    const messagesListener = watchEvents.addListener(
      'message',
      (
        message: WatchPayload & {
          request: string;
          walletIndex: number;
          amount: number;
          description?: string;
          hideBalance?: boolean;
          message?: string;
        },
        reply,
      ) => {
        if (reply) {
          handleMessages(message, reply);
        }
      },
    );
    messagesListenerActive.current = true;

    return () => {
      messagesListener();
      messagesListenerActive.current = false;
    };
  }, [walletsInitialized, isReachable, isInstalled]);

  const constructWalletsToSendToWatch = useCallback(async () => {
    if (!walletsInitialized || !Array.isArray(wallets)) return;

    try {
      const walletsToProcess = await Promise.all(
        wallets.map(async wallet => {
          const transactions = wallet
            .getTransactions()
            .map((transaction: { confirmations: number; hash: string | number; memo: any; value: number; received: string | number; }) => {
              const type = transaction.confirmations && transaction.confirmations > 0 ? 'received' : 'pendingConfirmation';
              const memo = txMetadata[transaction.hash]?.memo || transaction.memo || '';
              const amount = formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
              return { type, amount, memo, time: transactionTimeToReadable(transaction.received) };
            });

          let receiveAddress;
          if (wallet.chain === Chain.ONCHAIN) {
            receiveAddress = await wallet.getAddressAsync();
          } else if (wallet.chain === Chain.OFFCHAIN) {
            receiveAddress = (await wallet.getAddressAsync()) || wallet.getAddress();
          }

          const walletInformation = {
            label: wallet.getLabel(),
            balance: formatBalance(wallet.getBalance(), wallet.getPreferredBalanceUnit(), true),
            type: wallet.type,
            preferredBalanceUnit: wallet.getPreferredBalanceUnit(),
            receiveAddress,
            transactions,
            hideBalance: wallet.hideBalance,
            xpub:
              wallet.chain === Chain.ONCHAIN && wallet.type !== MultisigHDWallet.type ? wallet.getXpub() || wallet.getSecret() : undefined,
            paymentCode: wallet.allowBIP47() && wallet.isBIP47Enabled() ? undefined : undefined,
          };
          return walletInformation;
        }),
      );

      return { wallets: walletsToProcess, randomID: Math.floor(Math.random() * 11) };
    } catch (error) {
      Alert.alert('Error', `Error constructing wallets to send to watch: ${(error as Error).message}\nData: ${JSON.stringify(wallets)}`);
      throw error;
    }
  }, [walletsInitialized, wallets, txMetadata]);

  useEffect(() => {
    if (!isInstalled || !walletsInitialized) return;

    const sendWalletsToWatch = async () => {
      try {
        const walletsToProcess = await constructWalletsToSendToWatch();
        if (walletsToProcess) {
          isReachable ? transferUserInfo(walletsToProcess) : updateApplicationContext(walletsToProcess);
        }
      } catch (error) {
        Alert.alert('Error', `Error sending wallets to watch: ${(error as Error).message}\nData: ${JSON.stringify(wallets)}`);
      }
    };

    sendWalletsToWatch();
  }, [walletsInitialized, wallets, isReachable, isInstalled, constructWalletsToSendToWatch]);

  useEffect(() => {
    if (!isInstalled || !isReachable || !walletsInitialized) return;

    try {
      updateApplicationContext({ isWalletsInitialized: walletsInitialized, randomID: Math.floor(Math.random() * 11) });
    } catch (error) {
      Alert.alert('Error', `Error updating application context: ${(error as Error).message}\nData: ${JSON.stringify({ isWalletsInitialized: walletsInitialized })}`);
    }
  }, [isInstalled, isReachable, walletsInitialized]);

  useEffect(() => {
    if (!isInstalled || !isReachable || !walletsInitialized || !preferredFiatCurrency) return;

    const preferredFiatCurrencyParsed = preferredFiatCurrency ?? FiatUnit.USD;
    if (lastPreferredCurrency.current !== preferredFiatCurrencyParsed.endPointKey) {
      try {
        transferCurrentComplicationUserInfo({
          preferredFiatCurrency: preferredFiatCurrencyParsed.endPointKey,
        });
        lastPreferredCurrency.current = preferredFiatCurrencyParsed.endPointKey;
      } catch (error) {
        const errorMessage = (error as Error).message;
        Alert.alert('Error', `Error transferring complication user info: ${errorMessage}\nData: ${JSON.stringify({ preferredFiatCurrency: preferredFiatCurrencyParsed })}`);
      }
    }
  }, [preferredFiatCurrency, walletsInitialized, isReachable, isInstalled]);

  const handleMessages = async (
    message: WatchPayload & { request: string; walletIndex: number; amount: number; description?: string; hideBalance?: boolean; message?: string; },
    reply: { (resp: WatchPayload): void; (arg0: { invoicePaymentRequest?: any; }): void; }
  ) => {
    try {
      if (message.request === 'createInvoice') {
        const invoiceRequest = await handleLightningInvoiceCreateRequest(message.walletIndex, message.amount, message.description);
        reply({ invoicePaymentRequest: invoiceRequest });
      } else {
        const actions = {
          sendApplicationContext: async () => {
            const walletsToProcess = await constructWalletsToSendToWatch();
            walletsToProcess && updateApplicationContext(walletsToProcess);
          },
          fetchTransactions: async () => {
            await fetchWalletTransactions();
            await saveToDisk();
            reply({});
          },
          hideBalance: async () => {
            const wallet = message.walletIndex !== undefined ? wallets[message.walletIndex] : undefined;
            if (!wallet) {
              throw new Error('Invalid wallet index');
            }
            wallet.hideBalance = message.hideBalance ?? false;
            await saveToDisk();
            reply({});
          },
        };
        if (message.message && actions[message.message as keyof typeof actions]) {
          await actions[message.message as keyof typeof actions]();
        }
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      Alert.alert('Error', `Error handling message: ${errorMessage}\nData: ${JSON.stringify(message)}`);
      reply({});
    }
  };

  const handleLightningInvoiceCreateRequest = async (walletIndex: number, amount: number, description = loc.lnd.placeholder) => {
    try {
      const wallet = wallets[walletIndex] as LightningCustodianWallet
      if (wallet.allowReceive() && amount > 0) {
        const invoiceRequest = await wallet.addInvoice(amount, description);
        // @ts-ignore: later
        if (await Notifications.isNotificationsEnabled()) {
          const decoded = await wallet.decodeInvoice(invoiceRequest);
          // @ts-ignore: later
          Notifications.majorTomToGroundControl([], [decoded.payment_hash], []);
        }
        return invoiceRequest;
      }
    } catch (error) {
      Alert.alert('Error', `Error creating lightning invoice: ${(error as Error).message}\nData: ${JSON.stringify({ walletIndex, amount, description })}`);
      throw error;
    }
  };
};

export default useWatchConnectivity;