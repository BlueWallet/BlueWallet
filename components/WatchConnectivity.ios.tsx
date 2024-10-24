import { useEffect, useRef, useCallback } from 'react';
import {
  sendMessage,
  sendMessageData,
  startFileTransfer,
  useReachability,
  useInstalled,
  watchEvents,
  transferUserInfo,
  updateApplicationContext,
  transferCurrentComplicationUserInfo,
  WatchMessage,
} from 'react-native-watch-connectivity';
import { useStorage } from '../hooks/context/useStorage';
import { useSettings } from '../hooks/context/useSettings';
import { LightningCustodianWallet } from '../class';
import { LightningTransaction, Transaction, TWallet } from '../class/wallets/types';
import { Chain } from '../models/bitcoinUnits';

const REQUEST_TYPES = {
  CREATE_INVOICE: 'createInvoice',
  FETCH_TRANSACTIONS: 'fetchTransactions',
  HIDE_BALANCE: 'hideBalance',
};

interface WalletInfo {
  label: string;
  balance: number;
  type: string;
  preferredBalanceUnit: string;
  receiveAddress: string;
  transactions: Array<{
    amount: number;
    type: string;
    memo: string;
    time: number;
  }>;
}

interface MessageRequest {
  request: string;
  walletIndex: number;
  amount?: number;
  description?: string;
  hideBalance?: boolean;
}

export default function WatchConnectivity() {
  const { walletsInitialized, wallets, fetchWalletTransactions, saveToDisk } = useStorage();
  const { preferredFiatCurrency } = useSettings();
  const isReachable = useReachability();
  const isInstalled = useInstalled();

  const messagesListenerActive = useRef(false);

  useEffect(() => {
    if (isInstalled && isReachable && walletsInitialized) {
      syncWalletsToWatch();
    }

    if (!messagesListenerActive.current) {
      const listener = watchEvents.addListener('message', handleMessages);
      messagesListenerActive.current = true;
      return () => {
        listener.remove();
        messagesListenerActive.current = false;
      };
    }
  }, [isInstalled, isReachable, walletsInitialized]);

  const syncWalletsToWatch = useCallback(() => {
    const walletsToProcess: WalletInfo[] = wallets.map((wallet: TWallet | LightningCustodianWallet) => ({
      label: wallet.getLabel(),
      balance: wallet.getBalance(),
      type: wallet.type,
      preferredBalanceUnit: wallet.getPreferredBalanceUnit(),
      receiveAddress: wallet.chain === Chain.ONCHAIN? wallet.getAddress() : wallet.getPaymentCode(),
      transactions: wallet.getTransactions(10).map((transaction: Transaction & LightningTransaction) => ({
        amount: transaction.value,
        type: transaction.type,
        memo: transaction.memo,
        time: transaction.received,
      })),
    }));

    const dataToSend = { wallets: walletsToProcess };

    if (isReachable) {
      transferUserInfo(dataToSend);
    } else {
      try {
        updateApplicationContext(dataToSend);
      } catch (error) {
        console.error('Error updating application context:', error);
      }
    }
  }, [wallets, isReachable]);

  const handleMessages = useCallback(
    async (message: WatchMessage<MessageRequest>, reply: (response: any) => void) => {
      if (!isReachable) {
        reply({});
        return;
      }

      switch (message.request) {
        case REQUEST_TYPES.CREATE_INVOICE: {
          const invoice = await createLightningInvoice(message.walletIndex, message.amount || 0, message.description || '');
          reply({ invoicePaymentRequest: invoice });
          break;
        }
        case REQUEST_TYPES.FETCH_TRANSACTIONS: {
          await fetchWalletTransactions();
          await saveToDisk();
          reply({});
          break;
        }
        case REQUEST_TYPES.HIDE_BALANCE: {
          handleHideBalance(message.walletIndex, message.hideBalance || false, reply);
          break;
        }
        default: {
          reply({});
          break;
        }
      }
    },
    [wallets, isReachable]
  );

  const createLightningInvoice = async (walletIndex: number, amount: number, description: string) => {
    const wallet = wallets[walletIndex] as LightningCustodianWallet;
    if (!wallet || amount <= 0 || !wallet.allowReceive()) return '';

    try {
      const invoice = await wallet.addInvoice(amount, description || 'Invoice');
      // @ts-ignore: fix later
      if (await Notifications.isNotificationsEnabled()) {
        const decoded = await wallet.decodeInvoice(invoice);
        // @ts-ignore: fix later
        Notifications.majorTomToGroundControl([], [decoded.payment_hash], []);
      }
      return invoice;
    } catch (error) {
      return '';
    }
  };

  const handleHideBalance = (walletIndex: number, hideBalance: boolean, reply: (response: any) => void) => {
    const wallet = wallets[walletIndex];
    if (wallet) {
      wallet.hideBalance = hideBalance;
      saveToDisk().then(() => reply({}));
    } else {
      reply({});
    }
  };

  const syncPreferredFiatCurrency = useCallback(() => {
    if (preferredFiatCurrency) {
      transferCurrentComplicationUserInfo({ preferredFiatCurrency: preferredFiatCurrency.endPointKey });
    }
  }, [preferredFiatCurrency]);

  useEffect(() => {
    if (isInstalled && preferredFiatCurrency) {
      syncPreferredFiatCurrency();
    }
  }, [isInstalled, preferredFiatCurrency, syncPreferredFiatCurrency]);

  return null;
}