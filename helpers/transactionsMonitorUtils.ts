// transactionsMonitorUtils.ts

import { NativeEventEmitter, NativeModules } from 'react-native';

const { TransactionsMonitorEventEmitter, TransactionsMonitor: TransactionsMonitorModule } = NativeModules;

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

  // Return the unsubscribe function
  return () => {
    subscription.remove();
  };
};

/**
 * Adds an external transaction ID to the native module for monitoring.
 * @param txid - The transaction ID to monitor.
 */
export const addExternalTxId = async (txid: string): Promise<void> => {
  if (!TransactionsMonitorModule || !TransactionsMonitorModule.addExternalTxId) {
    throw new Error('TransactionsMonitorModule or addExternalTxId method is not available.');
  }

  try {
    await TransactionsMonitorModule.addExternalTxId(txid);
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
  if (!TransactionsMonitorModule || !TransactionsMonitorModule.removeExternalTxId) {
    throw new Error('TransactionsMonitorModule or removeExternalTxId method is not available.');
  }

  try {
    await TransactionsMonitorModule.removeExternalTxId(txid);
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
  if (!TransactionsMonitorModule || !TransactionsMonitorModule.getAllTxIds) {
    throw new Error('TransactionsMonitorModule or getAllTxIds method is not available.');
  }

  return new Promise<string[]>((resolve, reject) => {
    TransactionsMonitorModule.getAllTxIds((error: string | null, txids: string[] | null) => {
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
  if (!TransactionsMonitorModule || !TransactionsMonitorModule.fetchConfirmations) {
    throw new Error('TransactionsMonitorModule or fetchConfirmations method is not available.');
  }

  return new Promise<number>((resolve, reject) => {
    TransactionsMonitorModule.fetchConfirmations(txid, (error: string | null, confirmations: number | null) => {
      if (error) {
        reject(error);
      } else if (confirmations !== null) {
        resolve(confirmations);
      } else {
        reject(new Error('No confirmations data received.'));
      }
    });
  });
};