// TransactionsMonitor.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { Alert, NativeModules } from 'react-native';
import { subscribeToTransactionConfirmed, getAllTxIds } from '../helpers/transactionsMonitorUtils'; // Adjust the path as necessary
import { useStorage } from '../hooks/context/useStorage';
import { Chain } from '../models/bitcoinUnits';
import LiveActivityManager from 'react-native-live-activity';

type StartLiveActivityParams = {
  status: string;
  transactionCount: number;
};

const liveActivity = new LiveActivityManager<StartLiveActivityParams>();

const { TransactionsMonitor: TransactionsMonitorModule } = NativeModules;

// Debugging: Log the TransactionsMonitorModule
console.log('TransactionsMonitorModule:', TransactionsMonitorModule);

if (!TransactionsMonitorModule) {
  console.error('TransactionsMonitorModule is not available. Ensure it is correctly linked and implemented.');
}

const TransactionsMonitor: React.FC = () => {
  const { wallets, refreshAllWalletTransactions } = useStorage();

  const [activityId, setActivityId] = useState<string | null>(null);
  const [monitoredTxs, setMonitoredTxs] = useState<Set<string>>(new Set());

  // Load transactions on mount
  const loadTransactions = useCallback(async () => {
    try {
      const allTxids = await getAllTxIds();
      setMonitoredTxs(new Set(allTxids));
      console.debug(`Loaded ${allTxids.length} transactions for monitoring.`);
    } catch (error) {
      console.error('Error loading transaction data:', error);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Update monitoredTxs when wallets change
  const updateMonitoredTransactions = useCallback(async () => {
    try {
      const onchainTransactions = wallets
        .filter(wallet => wallet.chain === Chain.ONCHAIN)
        .flatMap(wallet => wallet.getTransactions())
        .filter(tx => tx.confirmations === 0)
        .map(tx => tx.txid);

      const externalTxids = await getAllTxIds();

      setMonitoredTxs(new Set([...onchainTransactions, ...externalTxids]));
      console.debug(`Updated monitored transactions. Total: ${onchainTransactions.length + externalTxids.length}`);
    } catch (error) {
      console.error('Error updating monitored transactions:', error);
    }
  }, [wallets]);

  useEffect(() => {
    updateMonitoredTransactions();
  }, [updateMonitoredTransactions]);

  // Subscribe to TransactionConfirmed events
  useEffect(() => {
    const unsubscribe = subscribeToTransactionConfirmed((txid: string) => {
      Alert.alert('Transaction Confirmed', `Transaction ID: ${txid} has been confirmed.`);
      refreshAllWalletTransactions();
      setMonitoredTxs(prev => {
        const updatedTxs = new Set(prev);
        updatedTxs.delete(txid);
        return updatedTxs;
      });
      console.debug(`Transaction ${txid} confirmed and removed from monitoring.`);
    });
    return () => {
      unsubscribe();
    };
  }, [refreshAllWalletTransactions]);

  // Start monitoring and Live Activity
  useEffect(() => {
    const startMonitoring = async () => {
      if (!TransactionsMonitorModule || !TransactionsMonitorModule.startMonitoringTransactions) {
        console.error('startMonitoringTransactions method is not available on TransactionsMonitorModule.');
        return;
      }

      // Start the native transaction monitoring
      TransactionsMonitorModule.startMonitoringTransactions();
      console.debug('Started native transaction monitoring.');

      // Only start Live Activity if there are transactions to monitor
      if (monitoredTxs.size > 0) {
        try {
          const newActivityId = await liveActivity.startActivity({
            status: 'Monitoring Transactions',
            transactionCount: monitoredTxs.size,
          });
          setActivityId(newActivityId);
          console.debug('Live Activity started.');
        } catch (error) {
          console.error('Error starting Live Activity:', error);
        }
      } else {
        console.debug('No transactions to monitor. Live Activity not started.');
      }
    };

    // Start monitoring if there are transactions and no active Live Activity
    if (monitoredTxs.size > 0 && !activityId) {
      startMonitoring();
    }
  }, [monitoredTxs, activityId]);

  // Manage Live Activity updates
  useEffect(() => {
    const manageLiveActivity = async () => {
      if (activityId) {
        if (monitoredTxs.size > 0) {
          // Update Live Activity with the current number of pending transactions
          try {
            await liveActivity.updateActivity(activityId, {
              status: `Monitoring ${monitoredTxs.size} Transactions`,
              transactionCount: monitoredTxs.size,
            });
            console.debug('Live Activity updated with pending transactions.');
          } catch (error) {
            console.error('Error updating Live Activity:', error);
          }
        } else {
          // No more transactions to monitor; end Live Activity
          try {
            await liveActivity.endActivity(activityId);
            setActivityId(null);
            console.debug('Live Activity ended as there are no pending transactions.');
          } catch (error) {
            console.error('Error ending Live Activity:', error);
          }
        }
      }
    };

    manageLiveActivity();
  }, [monitoredTxs, activityId]);

  // Optional: Alert or log when there are no transactions to monitor
  useEffect(() => {
    if (monitoredTxs.size === 0 && activityId) {
      // If there are no transactions but a Live Activity is active, end it
      const endActivity = async () => {
        try {
          await liveActivity.endActivity(activityId);
          setActivityId(null);
          console.debug('Live Activity ended due to no transactions to monitor.');
        } catch (error) {
          console.error('Error ending Live Activity:', error);
        }
      };
      endActivity();
    }
  }, [monitoredTxs, activityId]);

  return null; // Headless component
};

export default TransactionsMonitor;