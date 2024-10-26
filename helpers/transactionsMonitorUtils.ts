// transactionsMonitorUtils.ts

import { NativeEventEmitter, NativeModules } from 'react-native';

const { TransactionsMonitorEventEmitter, TransactionsMonitor, LiveActivityManager } = NativeModules;

interface TransactionConfirmedEvent {
  txid: string;
}

/**
 * Subscribes to TransactionConfirmed events emitted by the native module.
 * @param callback - Function to handle the confirmed transaction ID.
 * @returns Function to unsubscribe from the event.
 */
export const subscribeToTransactionConfirmed = (callback: (txid: string) => void) => {
  if (!TransactionsMonitorEventEmitter) {
    console.error('TransactionsMonitorEventEmitter is not available.');
    return () => {};
  }

  const eventEmitter = new NativeEventEmitter(TransactionsMonitorEventEmitter);

  const subscription = eventEmitter.addListener('TransactionConfirmed', (event: TransactionConfirmedEvent) => {
    callback(event.txid);
  });

  return () => {
    subscription.remove();
  };
};

/**
 * Adds an external transaction ID to the native module for monitoring.
 * @param txid - The transaction ID to monitor.
 */
export const addExternalTxId = async (txid: string): Promise<void> => {
  if (!TransactionsMonitor || !TransactionsMonitor.addExternalTxId) {
    throw new Error('TransactionsMonitor or addExternalTxId method is not available.');
  }

  try {
    await TransactionsMonitor.addExternalTxId(txid);
    console.debug(`External txid ${txid} added for monitoring.`);
  } catch (error) {
    console.error(`Failed to add external txid ${txid}:`, error);
    throw error;
  }
};

/**
 * Removes an external transaction ID from the native module.
 * @param txid - The transaction ID to remove.
 */
export const removeExternalTxId = async (txid: string): Promise<void> => {
  if (!TransactionsMonitor || !TransactionsMonitor.removeExternalTxId) {
    throw new Error('TransactionsMonitor or removeExternalTxId method is not available.');
  }

  try {
    await TransactionsMonitor.removeExternalTxId(txid);
    console.debug(`External txid ${txid} removed from monitoring.`);
  } catch (error) {
    console.error(`Failed to remove external txid ${txid}:`, error);
    throw error;
  }
};

/**
 * Retrieves all monitored transaction IDs from the native module.
 * @returns Promise that resolves to an array of transaction IDs.
 */
export const getAllTxIds = async (): Promise<string[]> => {
  if (!TransactionsMonitor || !TransactionsMonitor.getAllTxIds) {
    throw new Error('TransactionsMonitor or getAllTxIds method is not available.');
  }

  return new Promise<string[]>((resolve, reject) => {
    TransactionsMonitor.getAllTxIds((error: string | null, txids: string[] | null) => {
      if (error) {
        reject(error);
      } else if (txids) {
        resolve(txids);
      } else {
        resolve([]);
      }
    });
  });
};

/**
 * Fetches transaction confirmations for a given txid.
 * @param txid - The transaction ID to fetch confirmations for.
 * @returns Promise that resolves to the number of confirmations.
 */
export const fetchTransactionConfirmations = async (txid: string): Promise<number> => {
  if (!TransactionsMonitor || !TransactionsMonitor.fetchConfirmations) {
    throw new Error('TransactionsMonitor or fetchConfirmations method is not available.');
  }

  return new Promise<number>((resolve, reject) => {
    TransactionsMonitor.fetchConfirmations(txid, (error: string | null, confirmations: number | null) => {
      if (error) {
        reject(error);
      } else if (confirmations !== null) {
        resolve(confirmations);
      } else {
        reject('No confirmations data received.');
      }
    });
  });
};

/**
 * Starts the persistent Live Activity for Dynamic Island.
 */
export const startPersistentLiveActivity = async (): Promise<void> => {
  if (!LiveActivityManager || !LiveActivityManager.startPersistentLiveActivity) {
    throw new Error('LiveActivityManager or startPersistentLiveActivity method is not available.');
  }

  try {
    await LiveActivityManager.startPersistentLiveActivity();
    console.debug('Persistent Live Activity started.');
  } catch (error) {
    console.error('Failed to start Persistent Live Activity:', error);
    throw error;
  }
};

/**
 * Ends the persistent Live Activity for Dynamic Island.
 */
export const endPersistentLiveActivity = async (): Promise<void> => {
  if (!LiveActivityManager || !LiveActivityManager.endPersistentLiveActivity) {
    throw new Error('LiveActivityManager or endPersistentLiveActivity method is not available.');
  }

  try {
    await LiveActivityManager.endPersistentLiveActivity();
    console.debug('Persistent Live Activity ended.');
  } catch (error) {
    console.error('Failed to end Persistent Live Activity:', error);
    throw error;
  }
};