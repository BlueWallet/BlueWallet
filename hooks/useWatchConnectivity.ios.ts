import { useCallback, useEffect, useRef } from 'react';
import {
  transferCurrentComplicationUserInfo,
  transferUserInfo,
  updateApplicationContext,
  useInstalled,
  usePaired,
  useReachability,
  watchEvents,
} from 'react-native-watch-connectivity';
import { MultisigHDWallet } from '../class';
import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { Chain } from '../models/bitcoinUnits';
import { FiatUnit } from '../models/fiatUnit';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';
import { isNotificationsEnabled, majorTomToGroundControl } from '../blue_modules/notifications';

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

interface Transaction {
  type: string;
  amount: string;
  memo: string;
  time: string;
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
    randomID: `${Date.now()}${Math.floor(Math.random() * 1000)}`, // Flatten to a string
  });

  useEffect(() => {
    if (!isInstalled || !isPaired || !walletsInitialized || !isReachable) return;

    const contextPayload = createContextPayload();
    try {
      updateApplicationContext(contextPayload);
      console.debug('Updated application context:', contextPayload);
    } catch (error) {
      console.error('Failed to update application context:', error);
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
            .map((transaction: any) => ({
              type: transaction.confirmations ? 'pendingConfirmation' : 'received',
              amount: formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString(),
              memo: txMetadata[transaction.hash]?.memo || transaction.memo || '',
              time: transactionTimeToReadable(transaction.received),
            }));

          const walletData = {
            label: wallet.getLabel(),
            balance: formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
            type: wallet.type,
            preferredBalanceUnit: wallet.getPreferredBalanceUnit(),
            receiveAddress,
            transactions: JSON.stringify(transactions), // Serialize transactions array
            hideBalance: wallet.hideBalance ? 1 : 0, // Use 1 and 0 instead of boolean
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

    console.debug('Constructed wallets to process for Apple Watch:', processedWallets);
    return { wallets: JSON.stringify(processedWallets), randomID: `${Date.now()}${Math.floor(Math.random() * 1000)}` };
  }, [wallets, walletsInitialized, txMetadata]);

  const handleMessages = useCallback(
    async (message: Message, reply: Reply) => {
      console.debug('Received message from Apple Watch:', message);
      try {
        if (message.request === 'createInvoice') {
          const createInvoiceRequest = await handleLightningInvoiceCreateRequest({
            walletIndex: message.walletIndex!,
            amount: message.amount!,
            description: message.description,
          });
          reply({ invoicePaymentRequest: createInvoiceRequest });
        } else if (message.message === 'sendApplicationContext') {
          const walletsToProcess = await constructWalletsToSendToWatch();
          if (walletsToProcess) {
            updateApplicationContext(walletsToProcess);
            console.debug('Updated application context on request:', walletsToProcess);
          }
        } else if (message.message === 'fetchTransactions') {
          await fetchWalletTransactions();
          await saveToDisk();
          reply({});
        } else if (message.message === 'hideBalance') {
          wallets[message.walletIndex!].hideBalance = message.hideBalance!;
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
          if (isReachable) {
            transferUserInfo(walletsToProcess);
            console.debug('Apple Watch: sent info to watch via transferUserInfo', walletsToProcess);
          } else {
            updateApplicationContext(walletsToProcess);
            console.debug('Apple Watch: sent info to watch via context', walletsToProcess);
          }
        }
      } catch (error) {
        console.error('Failed to send wallets to watch:', error);
      }
    };
    sendWalletData();
  }, [walletsInitialized, isReachable, isInstalled, isPaired, constructWalletsToSendToWatch]);

  useEffect(() => {
    if (!isInstalled || !isPaired || !walletsInitialized || !isReachable) {
      console.debug('Apple Watch not installed, not paired, or other conditions not met. Exiting message listener setup.');
      return;
    }

    const messagesListener = watchEvents.addListener('message', (message: any) => handleMessages(message, () => {}));
    messagesListenerActive.current = true;
    console.debug('Message listener set up for Apple Watch');

    return () => {
      messagesListener();
      messagesListenerActive.current = false;
      console.debug('Message listener for Apple Watch cleaned up');
    };
  }, [walletsInitialized, isReachable, isInstalled, isPaired, handleMessages]);
}

export default useWatchConnectivity;