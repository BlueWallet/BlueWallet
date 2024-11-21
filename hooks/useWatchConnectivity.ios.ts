import { useCallback, useEffect, useRef } from 'react';
import {
  transferCurrentComplicationUserInfo,
  updateApplicationContext,
  useInstalled,
  usePaired,
  useReachability,
  watchEvents,
} from 'react-native-watch-connectivity';
import { MultisigHDWallet } from '../class';
import loc from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { FiatUnit } from '../models/fiatUnit';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { isNotificationsEnabled, majorTomToGroundControl } from '../blue_modules/notifications';
import { LightningTransaction, Transaction } from '../class/wallets/types';

interface Message {
  request?: string;
  message?: string;
  walletIndex?: number;
  amount?: number;
  description?: string;
  hideBalance?: boolean;
}

interface Reply {
  (response: Record<string, any>): void;
}

interface LightningInvoiceCreateRequest {
  walletIndex: number;
  amount: number;
  description?: string;
}

export function useWatchConnectivity() {
  const { walletsInitialized, wallets, fetchWalletTransactions, saveToDisk, txMetadata } = useStorage();
  const { preferredFiatCurrency } = useSettings();
  const isReachable = useReachability();
  const isInstalled = useInstalled();
  const isPaired = usePaired();

  const messagesListenerActive = useRef(false);
  const lastPreferredCurrency = useRef(FiatUnit.USD.endPointKey);

  const createContextPayload = () => ({
    randomID: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
  });

  useEffect(() => {
    if (!isInstalled || !isPaired || !walletsInitialized || !isReachable) return;

    const contextPayload = createContextPayload();
    try {
      updateApplicationContext(contextPayload);
      console.debug('Transferred user info:', contextPayload);
    } catch (error) {
      console.error('Failed to transfer user info:', error);
    }
  }, [isReachable, walletsInitialized, isInstalled, isPaired]);

  useEffect(() => {
    if (!isInstalled || !isPaired || !walletsInitialized || !isReachable || !preferredFiatCurrency) return;

    if (lastPreferredCurrency.current !== preferredFiatCurrency.endPointKey) {
      try {
        const currencyPayload = { preferredFiatCurrency: preferredFiatCurrency.endPointKey };
        transferCurrentComplicationUserInfo(currencyPayload);
        lastPreferredCurrency.current = preferredFiatCurrency.endPointKey;
        console.debug('Apple Watch: updated preferred fiat currency', currencyPayload);
      } catch (error) {
        console.error('Error updating preferredFiatCurrency on watch:', error);
      }
    } else {
      console.debug('WatchConnectivity: preferred currency has not changed');
    }
  }, [preferredFiatCurrency, walletsInitialized, isReachable, isInstalled, isPaired]);

  const handleLightningInvoiceCreateRequest = useCallback(
    async ({ walletIndex, amount, description = loc.lnd.placeholder }: LightningInvoiceCreateRequest): Promise<string | undefined> => {
      const wallet = wallets[walletIndex];
      if (wallet.allowReceive() && amount > 0) {
        try {
          if ('addInvoice' in wallet) {
            const invoiceRequest = await wallet.addInvoice(amount, description);
            if (await isNotificationsEnabled()) {
              const decoded = await wallet.decodeInvoice(invoiceRequest);
              majorTomToGroundControl([], [decoded.payment_hash], []);
              return invoiceRequest;
            }
            console.debug('Created Lightning invoice:', { invoiceRequest });
            return invoiceRequest;
          }
        } catch (invoiceError) {
          console.error('Error creating invoice:', invoiceError);
        }
      }
    },
    [wallets],
  );

  const constructWalletsToSendToWatch = useCallback(async () => {
    if (!Array.isArray(wallets) || !walletsInitialized) return;

    const walletsToProcess = await Promise.allSettled(
      wallets.map(async wallet => {
        try {
          const receiveAddress = wallet.chain === Chain.ONCHAIN ? await wallet.getAddressAsync() : wallet.getAddress();
          const transactions: Transaction[] = wallet
            .getTransactions()
            .slice(0, 10)
            .map((transaction: Transaction & LightningTransaction) => ({
              type: determineTransactionType(transaction),
              amount: transaction.value ?? 0,
              memo:
                'hash' in (transaction as Transaction)
                  ? txMetadata[(transaction as Transaction).hash]?.memo || transaction.memo || ''
                  : transaction.memo || '',
              time: transaction.received ?? transaction.time,
            }));

          const walletData = {
            label: wallet.getLabel(),
            balance: Number(wallet.getBalance()),
            type: wallet.type,
            preferredBalanceUnit: wallet.getPreferredBalanceUnit(),
            receiveAddress,
            transactions,
            chain: wallet.chain,
            hideBalance: wallet.hideBalance ? 1 : 0,
            ...(wallet.chain === Chain.ONCHAIN &&
              wallet.type !== MultisigHDWallet.type && {
                xpub: wallet.getXpub() || wallet.getSecret(),
              }),
            ...(wallet.allowBIP47() &&
              wallet.isBIP47Enabled() &&
              'getBIP47PaymentCode' in wallet && { paymentCode: wallet.getBIP47PaymentCode() }),
          };

          console.debug('Constructed wallet data for watch:', {
            label: walletData.label,
            type: walletData.type,
            preferredBalanceUnit: walletData.preferredBalanceUnit,
            transactionCount: transactions.length,
          });
          return walletData;
        } catch (error) {
          console.error('Failed to construct wallet data:', error);
          return null;
        }
      }),
    );

    const processedWallets = walletsToProcess
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<any>).value);

    console.debug('Constructed wallets to process for Apple Watch:', {
      walletCount: processedWallets.length,
      walletLabels: processedWallets.map(wallet => wallet.label),
    });
    return { wallets: processedWallets, randomID: `${Date.now()}${Math.floor(Math.random() * 1000)}` };
  }, [wallets, walletsInitialized, txMetadata]);

  const determineTransactionType = (transaction: Transaction & LightningTransaction): string => {
    const confirmations = (transaction as Transaction).confirmations ?? 0;
    if (confirmations < 3) {
      return 'pending_transaction';
    }

    if (transaction.type === 'bitcoind_tx') {
      return 'onchain';
    }

    if (transaction.type === 'paid_invoice') {
      return 'offchain';
    }

    if (transaction.type === 'user_invoice' || transaction.type === 'payment_request') {
      const currentDate = new Date();
      const now = Math.floor(currentDate.getTime() / 1000);
      const timestamp = transaction.timestamp ?? 0;
      const expireTime = transaction.expire_time ?? 0;
      const invoiceExpiration = timestamp + expireTime;
      if (!transaction.ispaid && invoiceExpiration < now) {
        return 'expired_transaction';
      } else {
        return 'incoming_transaction';
      }
    }

    if ((transaction.value ?? 0) < 0) {
      return 'outgoing_transaction';
    } else {
      return 'incoming_transaction';
    }
  };

  const handleMessages = useCallback(
    async (message: Message, reply: Reply) => {
      console.debug('Received message from Apple Watch:', message);
      try {
        if (message.request === 'createInvoice' && typeof message.walletIndex === 'number' && typeof message.amount === 'number') {
          const createInvoiceRequest = await handleLightningInvoiceCreateRequest({
            walletIndex: message.walletIndex,
            amount: message.amount,
            description: message.description,
          });
          reply({ invoicePaymentRequest: createInvoiceRequest });
        } else if (message.message === 'sendApplicationContext') {
          const walletsToProcess = await constructWalletsToSendToWatch();
          if (walletsToProcess) {
            updateApplicationContext(walletsToProcess);
            console.debug('Transferred user info on request:', walletsToProcess);
          }
        } else if (message.message === 'fetchTransactions') {
          await fetchWalletTransactions();
          await saveToDisk();
          reply({});
        } else if (
          message.message === 'hideBalance' &&
          typeof message.walletIndex === 'number' &&
          typeof message.hideBalance === 'boolean' &&
          message.walletIndex >= 0 &&
          message.walletIndex < wallets.length
        ) {
          wallets[message.walletIndex].hideBalance = message.hideBalance;
          await saveToDisk();
          reply({});
        }
      } catch (error) {
        console.error('Error handling message:', error);
        reply({});
      }
    },
    [fetchWalletTransactions, saveToDisk, wallets, constructWalletsToSendToWatch, handleLightningInvoiceCreateRequest],
  );

  useEffect(() => {
    if (!isInstalled || !isPaired || !walletsInitialized) return;

    const sendWalletData = async () => {
      try {
        const walletsToProcess = await constructWalletsToSendToWatch();
        if (walletsToProcess) {
          updateApplicationContext(walletsToProcess);
          console.debug('Apple Watch: sent wallet data via transferUserInfo', walletsToProcess);
        }
      } catch (error) {
        console.error('Failed to send wallets to watch:', error);
      }
    };
    sendWalletData();
  }, [walletsInitialized, isInstalled, isPaired, constructWalletsToSendToWatch]);

  useEffect(() => {
    if (!isInstalled) return;

    const unsubscribe = watchEvents.addListener('message', (message: any) => {
      if (message.request === 'wakeUpApp') {
        console.debug('Received wake-up request from Apple Watch');
      } else {
        handleMessages(message, () => {});
      }
    });

    messagesListenerActive.current = true;
    console.debug('Message listener set up for Apple Watch');

    return () => {
      unsubscribe();
      messagesListenerActive.current = false;
      console.debug('Message listener for Apple Watch cleaned up');
    };
  }, [isInstalled, handleMessages]);
}

export default useWatchConnectivity;
