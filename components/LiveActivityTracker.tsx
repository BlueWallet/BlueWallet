import { useEffect, useState } from 'react';
import LiveActivityManager from 'react-native-live-activity';
import { DevSettings } from 'react-native';
import { ExtendedTransaction, Transaction, TWallet } from '../class/wallets/types';
import { useStorage } from '../hooks/context/useStorage';

type StartLiveActivityParams = {
  transactionID: string;
  amount: number;
  status: string;
  walletName: string;
  type: string;
  pendingTransactionsCount: number;
};

const liveActivityManager = new LiveActivityManager<StartLiveActivityParams>();

const LiveActivityTracker: React.FC = () => {
  const { wallets } = useStorage();
  const [pendingTransactionsCount, setPendingTransactionsCount] = useState<number>(0);
  const [activeActivities, setActiveActivities] = useState<string[]>([]);

  useEffect(() => {
    const handleLiveActivities = async () => {
      let totalPending = 0;

      for (const wallet of wallets) {
        const unconfirmedTransactions = wallet.getTransactions().filter((transaction: Transaction) => transaction.confirmations === 0);

        totalPending += unconfirmedTransactions.length;

        for (const transaction of unconfirmedTransactions) {
          if (!activeActivities.includes(transaction.txid)) {
            await startTransactionLiveActivity(transaction, wallet, totalPending);
            setActiveActivities((prev) => [...prev, transaction.txid]);
          }
        }
      }

      setPendingTransactionsCount(totalPending);
    };

    handleLiveActivities();

    const intervalId = setInterval(handleLiveActivities, 60000); 

    return () => clearInterval(intervalId); 
  }, [wallets, activeActivities]);

  useEffect(() => {
    if (pendingTransactionsCount > 0) {
      updatePendingTransactionsActivity(pendingTransactionsCount);
    } else {
      endPendingTransactionsActivity();
    }
  }, [pendingTransactionsCount]);

  const createFakeLiveActivity = async () => {
    const fakeTransaction: ExtendedTransaction = {
      txid: 'fake-txid-' + Math.random().toString(36).substring(7),
      hash: 'fake-hash',
      version: 1,
      size: 250,
      vsize: 150,
      weight: 400,
      locktime: 0,
      inputs: [],
      outputs: [],
      blockhash: '',
      confirmations: 0,
      time: Math.floor(Date.now() / 1000),
      blocktime: 0,
      walletID: 'fake-wallet',
      walletPreferredBalanceUnit: 'BTC',
    };

    const fakeWallet: TWallet = {
      id: 'fake-wallet',
      label: 'Fake Wallet',
      transactions: [fakeTransaction],
      walletPreferredBalanceUnit: 'BTC',
    };

    await startTransactionLiveActivity(fakeTransaction, fakeWallet, 1);
    console.log('Fake Live Activity created:', fakeTransaction.txid);

    const activities = await liveActivityManager.listAllActivities();
    console.log('All Activities:', activities);
  };

  useEffect(() => {
    DevSettings.addMenuItem('Create Fake Live Activity', createFakeLiveActivity);
  }, []);

  const startTransactionLiveActivity = async (
    transaction: ExtendedTransaction,
    wallet: TWallet,
    pendingTransactionsCount: number,
  ): Promise<void> => {
    try {
      await liveActivityManager.startActivity({
        transactionID: transaction.txid,
        amount: transaction.value!,
        status: 'Pending',
        walletName: wallet.label,
        type: transaction.value! < 0 ? 'Outgoing' : 'Incoming',
        pendingTransactionsCount,
      });
    } catch (error) {
      console.error('Failed to start Live Activity:', error);
    }
  };

  const updatePendingTransactionsActivity = async (pendingTransactionsCount: number): Promise<void> => {
    try {
      await liveActivityManager.updateActivity('pending-transactions-summary', {
        transactionID: 'summary',
        amount: pendingTransactionsCount,
        status: `You have ${pendingTransactionsCount} pending transaction${pendingTransactionsCount > 1 ? 's' : ''}.`,
        walletName: 'Summary',
        type: 'Summary',
        pendingTransactionsCount,
      });
    } catch (error) {
      console.error('Failed to update Live Activity:', error);
    }
  };

  const endPendingTransactionsActivity = async (): Promise<void> => {
    try {
      await liveActivityManager.endActivity('pending-transactions-summary');
    } catch (error) {
      console.error('Failed to end Live Activity:', error);
    }
  };

  return null;
};

export default LiveActivityTracker;