import { useEffect, useState, useCallback, useRef } from 'react';
import * as BlueElectrum from '../blue_modules/BlueElectrum';
import { MempoolTransaction } from '../blue_modules/BlueElectrum';

type AddressData = {
  balance: {
    confirmed: number;
    unconfirmed: number;
  };
  mempool: MempoolTransaction[];
  history: BlueElectrum.ElectrumHistory[];
  isLoading: boolean;
  error: Error | null;
  txEstimate: {
    eta: string;
    satPerVbyte: number | null;
  };
  tooManyTransactions?: boolean; // Flag for addresses with too many transactions
  serverBusy?: boolean; // New flag to indicate Electrum server is busy
  source?: 'subscription' | 'polling'; // Track how the data was obtained
};

interface AddressMonitorResult extends AddressData {
  refresh: () => Promise<void>;
  getSubscriptionStatus: () => SubscriptionStatus;
  isStaleData: boolean;
  lastSuccessfulFetch: number | null;
}

interface SubscriptionStatus {
  isSubscribed: boolean;
  status?: unknown;
  isStale?: boolean;
  lastSuccessfulFetch?: number | null;
}

type SubscriberRef = {
  onUpdate: (
    balance: { confirmed: number; unconfirmed: number },
    history: BlueElectrum.ElectrumHistory[],
    mempool?: BlueElectrum.MempoolTransaction[],
    txEstimate?: { eta: string; satPerVbyte: number | null },
  ) => void;
  onError: (error: Error) => void;
};

interface TimedPromiseOptions {
  timeoutMs?: number;
  timeoutMessage?: string;
}

// Enum to track reason for subscription events
enum SubscriptionEvent {
  MOUNT = 'component_mount',
  UNMOUNT = 'component_unmount',
  ADDRESS_CHANGE = 'address_change',
  ERROR_RECOVERY = 'error_recovery',
  SERVER_BUSY = 'server_busy',
  MANUAL_REFRESH = 'manual_refresh',
  RECONNECTION = 'scheduled_reconnection',
  TIMEOUT = 'connection_timeout',
}

// Error types for better categorization
enum AddressErrorType {
  TOO_MANY_TRANSACTIONS = 'too_many_transactions',
  SERVER_BUSY = 'server_busy',
  HISTORY_TOO_LARGE = 'history_too_large', // New error type
  GENERIC = 'generic',
}

// Helper function to categorize errors
const categorizeError = (errorMessage: string): AddressErrorType => {
  // Check for server busy errors
  if (errorMessage.includes('server busy') || errorMessage.includes('timed out') || errorMessage.includes('code: -102')) {
    return AddressErrorType.SERVER_BUSY;
  }

  // Check for too many transactions errors
  if (errorMessage.includes('history of > ') || errorMessage.includes('not supported')) {
    return AddressErrorType.TOO_MANY_TRANSACTIONS;
  }

  // Check for history too large errors - add more specific matching
  if (
    errorMessage.includes('history too large') ||
    errorMessage.includes('history is too large') ||
    errorMessage.includes('too many') ||
    errorMessage.includes('too large') ||
    errorMessage.includes('code: 1')  // Add specific code matching
  ) {
    return AddressErrorType.HISTORY_TOO_LARGE;
  }

  // Default case - generic error
  return AddressErrorType.GENERIC;
};

/**
 * Hook to monitor a bitcoin address for balance and transaction changes
 * @param address Bitcoin address to monitor
 * @returns Address data and refresh function
 */
export const useAddressMonitor = (address: string | undefined): AddressMonitorResult => {
  const [addressData, setAddressData] = useState<AddressData>({
    balance: { confirmed: 0, unconfirmed: 0 },
    mempool: [],
    history: [],
    isLoading: true,
    error: null,
    txEstimate: {
      eta: '',
      satPerVbyte: null,
    },
    tooManyTransactions: false,
  });
  const subscriberRef = useRef<SubscriberRef | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  // Track last successful data fetch time
  const lastSuccessfulFetchRef = useRef<number | null>(null);
  // Track if we're showing stale data
  const [showingStaleData, setShowingStaleData] = useState(false);
  // Track subscription state to prevent redundant subscriptions
  const subscriptionInProgressRef = useRef<boolean>(false);
  // Track server busy state to adjust reconnection strategy
  const serverBusyRef = useRef<boolean>(false);
  // Track the last time we attempted a subscription to prevent rapid cycling
  const lastSubscriptionAttemptRef = useRef<number>(0);
  // Track the current address to detect address changes in cleanup
  const currentAddressRef = useRef<string | undefined>(address);
  // Track reconnection timeout to clear it if needed
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add debounce timer to avoid rapid subscription changes
  const subscriptionDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track last unsubscribed address and time to prevent unnecessary resubscriptions
  const lastUnsubscribedAddressRef = useRef<{ address: string; timestamp: number } | null>(null);
  // Flag to track if we're currently in an unmounting phase
  const isUnmountingRef = useRef<boolean>(false);

  // Manual refresh function with improved error handling
  const refresh = useCallback(async () => {
    if (!address) return;

    // Helper function to run a promise with a timeout - moved inside the callback
    const executeWithTimeout = async <T>(promise: Promise<T>, options: TimedPromiseOptions = {}): Promise<T> => {
      const { timeoutMs = 15000, timeoutMessage = 'Request timed out' } = options;

      let timeoutId: NodeJS.Timeout;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      });

      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        clearTimeout(timeoutId!);
      }
    };

    console.log(`[useAddressMonitor] Manual refresh (POLLING) for ${address}`);
    setAddressData(prev => ({ ...prev, isLoading: true, serverBusy: false }));

    try {
      // Fetch balance and history with timeouts
      const balance = await executeWithTimeout(BlueElectrum.getBalanceByAddress(address), { timeoutMessage: 'Balance fetch timed out' });

      const history = await executeWithTimeout(BlueElectrum.getTransactionsByAddress(address), {
        timeoutMessage: 'Transaction history fetch timed out',
      });

      // Fetch mempool and estimates (less critical, so don't let these fail the whole operation)
      let mempool: MempoolTransaction[] = [];
      let txEstimate = { eta: '', satPerVbyte: null as number | null };

      try {
        mempool = await BlueElectrum.getMempoolTransactionsByAddress(address);
        if (balance.unconfirmed !== 0) {
          txEstimate = await BlueElectrum.getTransactionEstimate(address, mempool);
        }
      } catch (secondaryError) {
        console.log(
          `[useAddressMonitor] Non-critical error fetching secondary data: ${
            secondaryError instanceof Error ? secondaryError.message : String(secondaryError)
          }`,
        );
      }

      // Reset server busy state on successful fetch
      serverBusyRef.current = false;

      // Update last successful fetch timestamp
      lastSuccessfulFetchRef.current = Date.now();
      setShowingStaleData(false);

      // Enhanced logging for manual polling
      if (balance.unconfirmed > 0) {
        console.log(
          `🔔 [useAddressMonitor] INCOMING PAYMENT DETECTED for ${address}: amount=${
            balance.unconfirmed
          } satoshis (${balance.unconfirmed / 100000000} BTC) via POLLING`,
        );
      } else {
        console.log(
          `[useAddressMonitor] Manual refresh completed for ${address}: balance=${JSON.stringify(balance)}, tx count=${history.length}`,
        );
      }

      setAddressData({
        balance,
        history,
        mempool,
        isLoading: false,
        error: null,
        txEstimate,
        tooManyTransactions: false,
        serverBusy: false,
        source: 'polling',
      });

      // Reset reconnect attempts on successful manual refresh
      if (reconnectAttempts > 0) {
        setReconnectAttempts(0);
      }
    } catch (error) {
      console.log(`[useAddressMonitor] Error refreshing data: ${error instanceof Error ? error.message : String(error)}`);

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = categorizeError(errorMessage);

      // Update server busy state
      if (errorType === AddressErrorType.SERVER_BUSY || errorType === AddressErrorType.HISTORY_TOO_LARGE) {
        serverBusyRef.current = true;
      }

      // Keep showing old data if we have it
      if ((errorType === AddressErrorType.SERVER_BUSY || errorType === AddressErrorType.HISTORY_TOO_LARGE) && 
          !addressData.isLoading && lastSuccessfulFetchRef.current) {
        setShowingStaleData(true);
        setAddressData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
          serverBusy: true,
        }));
      } else {
        setAddressData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
          tooManyTransactions: errorType === AddressErrorType.TOO_MANY_TRANSACTIONS || errorType === AddressErrorType.HISTORY_TOO_LARGE,
          serverBusy: errorType === AddressErrorType.SERVER_BUSY || errorType === AddressErrorType.HISTORY_TOO_LARGE,
          source: 'polling',
        }));
      }
    }
  }, [address, addressData.isLoading, reconnectAttempts]);

  // Get subscription status
  const getSubscriptionStatus = useCallback((): SubscriptionStatus => {
    if (!address) return { isSubscribed: false };

    const status = BlueElectrum.getActiveSubscriptions();
    const isSubscribed = status.addresses.includes(address);

    return {
      isSubscribed,
      status,
      isStale: showingStaleData,
      lastSuccessfulFetch: lastSuccessfulFetchRef.current,
    };
  }, [address, showingStaleData]);

  // Subscribe to address with improved handling of errors and duplicates
  const subscribeToAddressWithRetry = useCallback(
    async (reason: SubscriptionEvent): Promise<void> => {
      if (!address || subscriptionInProgressRef.current) return;

      // Skip if we just unsubscribed from this same address within the last 300ms
      if (
        lastUnsubscribedAddressRef.current &&
        lastUnsubscribedAddressRef.current.address === address &&
        Date.now() - lastUnsubscribedAddressRef.current.timestamp < 300
      ) {
        console.log(
          `[useAddressMonitor] Skipping subscription to recently unsubscribed address: ${address.substring(0, 8)}...${address.substring(
            address.length - 8,
          )}`,
        );
        return;
      }

      // Clear any existing debounce timer
      if (subscriptionDebounceTimerRef.current) {
        clearTimeout(subscriptionDebounceTimerRef.current);
        subscriptionDebounceTimerRef.current = null;
      }

      // Debounce subscription setup to avoid rapid cycles
      subscriptionDebounceTimerRef.current = setTimeout(async () => {
        // Double check that address and component are still valid before proceeding
        if (!address || isUnmountingRef.current) {
          console.log(`[useAddressMonitor] Subscription canceled - component unmounting or address changed`);
          return;
        }

        // Prevent multiple concurrent subscription attempts
        subscriptionInProgressRef.current = true;

        // Record the attempt time
        const now = Date.now();
        lastSubscriptionAttemptRef.current = now;

        try {
          console.log(`[useAddressMonitor] Setting up subscription for ${address} - Reason: ${reason}`);

          // Create subscriber object with callbacks
          const subscriber = {
            incomingOnly: true,
            onUpdate: (
              balance: { confirmed: number; unconfirmed: number },
              history: BlueElectrum.ElectrumHistory[],
              mempool: BlueElectrum.MempoolTransaction[] = [],
              txEstimate: { eta: string; satPerVbyte: number | null } = { eta: '', satPerVbyte: null },
            ) => {
              // Update last successful fetch timestamp
              lastSuccessfulFetchRef.current = Date.now();
              
              // Avoid layout animation conflicts by using requestAnimationFrame
              requestAnimationFrame(() => {
                setShowingStaleData(false);
                serverBusyRef.current = false; // Clear server busy flag on successful update
              });

              // Enhanced logging for subscription updates
              if (balance.unconfirmed > 0) {
                console.log(
                  `🔔 [useAddressMonitor] INCOMING PAYMENT DETECTED for ${address}: amount=${
                    balance.unconfirmed
                  } satoshis (${balance.unconfirmed / 100000000} BTC) via SUBSCRIPTION`,
                );
              } else {
                console.log(
                  `[useAddressMonitor] Subscription update for ${address}: balance=${JSON.stringify(balance)}, tx count=${history.length}`,
                );
              }

              // Use requestAnimationFrame to avoid layout animation conflicts
              requestAnimationFrame(() => {
                setAddressData({
                  balance,
                  history,
                  mempool,
                  isLoading: false,
                  error: null,
                  txEstimate,
                  tooManyTransactions: false,
                  serverBusy: false,
                  source: 'subscription',
                });

                // Reset reconnect attempts on successful update
                if (reconnectAttempts > 0) {
                  setReconnectAttempts(0);
                }
              });
            },
            onError: (error: Error) => {
              console.log(`[useAddressMonitor] Error for ${address}: ${error.message}`);
              const errorMessage = error.message || String(error);
              const errorType = categorizeError(errorMessage);

              // Update server busy state if needed
              if (errorType === AddressErrorType.SERVER_BUSY) {
                serverBusyRef.current = true;
              }

              // Use requestAnimationFrame to avoid layout animation conflicts
              requestAnimationFrame(() => {
                // Keep showing old data if the server is just busy
                if (errorType === AddressErrorType.SERVER_BUSY && !addressData.isLoading && lastSuccessfulFetchRef.current) {
                  // If we have previous data, just mark it as stale but continue showing it
                  setShowingStaleData(true);
                  setAddressData(prev => ({
                    ...prev,
                    isLoading: false,
                    error,
                    serverBusy: true,
                  }));
                } else {
                  // Otherwise update the state with the error
                  setAddressData(prev => ({
                    ...prev,
                    isLoading: false,
                    error,
                    tooManyTransactions:
                      errorType === AddressErrorType.TOO_MANY_TRANSACTIONS || errorType === AddressErrorType.HISTORY_TOO_LARGE,
                    serverBusy: errorType === AddressErrorType.SERVER_BUSY,
                    // If too many transactions or server busy, set a default balance to show something
                    ...(errorType !== AddressErrorType.GENERIC && !prev.balance.confirmed
                      ? {
                          balance: { confirmed: 0, unconfirmed: 0 }, // We can't know the true balance
                        }
                      : {}),
                  }));
                }
              });

              // Only attempt reconnection if it's not a too-many-transactions error and we haven't exceeded max retry attempts
              const isTooManyOrHistoryError =
                errorType === AddressErrorType.TOO_MANY_TRANSACTIONS || errorType === AddressErrorType.HISTORY_TOO_LARGE;

              if (!isTooManyOrHistoryError && reconnectAttempts < 5) {
                // Clear any previous reconnection timer
                if (reconnectionTimeoutRef.current) {
                  clearTimeout(reconnectionTimeoutRef.current);
                  reconnectionTimeoutRef.current = null;
                }

                // Increment the reconnect attempts
                const newAttempt = reconnectAttempts + 1;
                setReconnectAttempts(newAttempt);
                console.log(`[useAddressMonitor] Scheduling reconnection attempt #${newAttempt}`);

                // Enhanced backoff strategy for server busy errors
                const baseBackoffTime = 1000 * Math.pow(2, reconnectAttempts);
                // Extra delay for server busy errors - increases with each attempt
                const serverBusyMultiplier = serverBusyRef.current ? Math.min(3 * reconnectAttempts, 10) : 1;
                // Cap at 60 seconds maximum wait time
                const backoffTime = Math.min(baseBackoffTime * serverBusyMultiplier, 60000);

                console.log(
                  `[useAddressMonitor] Backing off for ${Math.round(backoffTime / 1000)} seconds (${serverBusyRef.current ? 'server busy' : 'error'})`,
                );

                // Schedule reconnection attempt
                reconnectionTimeoutRef.current = setTimeout(() => {
                  console.log(`[useAddressMonitor] Attempting reconnection #${newAttempt}`);
                  subscriberRef.current = subscriber;
                  subscriptionInProgressRef.current = false; // Reset flag before trying again
                  // Call recursive function with error recovery reason
                  subscribeToAddressWithRetry(SubscriptionEvent.ERROR_RECOVERY);
                }, backoffTime);
              } else if (isTooManyOrHistoryError) {
                console.log(`[useAddressMonitor] Not reconnecting - address has too many transactions or history is too large`);
                subscriptionInProgressRef.current = false;
              } else if (reconnectAttempts >= 5) {
                console.log(`[useAddressMonitor] Not reconnecting - maximum attempts (${reconnectAttempts}) reached`);
                subscriptionInProgressRef.current = false;
              }
            },
          };

          // Store the subscriber reference for future use
          subscriberRef.current = subscriber;

          // Subscribe to the address
          await BlueElectrum.subscribeToAddress(address, subscriber);

          // Reset subscription in progress after successful subscription
          subscriptionInProgressRef.current = false;
        } catch (error) {
          console.log(`[useAddressMonitor] Error setting up subscription: ${error instanceof Error ? error.message : String(error)}`);
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorType = categorizeError(errorMessage);

          // Update server busy state if needed
          if (errorType === AddressErrorType.SERVER_BUSY) {
            serverBusyRef.current = true;
          }

          // Use requestAnimationFrame to avoid layout animation conflicts
          requestAnimationFrame(() => {
            setAddressData(prev => ({
              ...prev,
              isLoading: false,
              error: error instanceof Error ? error : new Error(String(error)),
              tooManyTransactions: errorType === AddressErrorType.TOO_MANY_TRANSACTIONS || errorType === AddressErrorType.HISTORY_TOO_LARGE,
              serverBusy: errorType === AddressErrorType.SERVER_BUSY,
              // Set default balance if needed
              ...(errorType !== AddressErrorType.GENERIC
                ? {
                    balance: { confirmed: 0, unconfirmed: 0 },
                  }
                : {}),
            }));
          });

          // Handle errors during initial subscription setup
          if (errorType === AddressErrorType.SERVER_BUSY && reconnectAttempts < 5) {
            // Clear any previous reconnection timer
            if (reconnectionTimeoutRef.current) {
              clearTimeout(reconnectionTimeoutRef.current);
              reconnectionTimeoutRef.current = null;
            }

            // Increment the reconnect attempts
            const newAttempt = reconnectAttempts + 1;
            setReconnectAttempts(newAttempt);
            console.log(`[useAddressMonitor] Server busy during setup, attempting recovery #${newAttempt}`);

            // Enhanced backoff for server busy errors
            const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts) * 2, 60000);
            console.log(`[useAddressMonitor] Server busy backoff: ${Math.round(backoffTime / 1000)} seconds`);

            // For server busy errors, try manual refresh instead of subscription
            reconnectionTimeoutRef.current = setTimeout(() => {
              console.log(`[useAddressMonitor] Attempting manual refresh after server busy error`);
              refresh();
              // Reset the subscription flag after the timeout
              subscriptionInProgressRef.current = false;
            }, backoffTime);
          } else {
            // For other errors, reset subscription flag to allow future attempts
            subscriptionInProgressRef.current = false;
          }
        }
      }, 100); // Short delay to debounce rapid subscription requests
    },
    [address, addressData.isLoading, reconnectAttempts, refresh],
  );

  // Set up subscription to address updates
  useEffect(() => {
    if (!address) return;

    // Reset unmounting flag when effect runs
    isUnmountingRef.current = false;

    // Update the current address reference
    currentAddressRef.current = address;

    // Reset subscription tracking state on address change
    setAddressData(prev => ({ ...prev, isLoading: true, error: null, serverBusy: false }));

    // Clear any existing reconnection timeout
    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current);
      reconnectionTimeoutRef.current = null;
    }

    // Set up subscription with component mount reason
    subscribeToAddressWithRetry(SubscriptionEvent.MOUNT);

    // Cleanup: unsubscribe when component unmounts or address changes
    return () => {
      // Set unmounting flag to prevent new subscriptions during cleanup
      isUnmountingRef.current = true;

      // Determine cleanup reason
      const reason = currentAddressRef.current !== address ? SubscriptionEvent.ADDRESS_CHANGE : SubscriptionEvent.UNMOUNT;

      console.log(`[useAddressMonitor] Cleaning up subscription for ${address} - Reason: ${reason}`);

      // Clear any pending reconnection timers
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
        reconnectionTimeoutRef.current = null;
      }

      // Clear subscription debounce timer
      if (subscriptionDebounceTimerRef.current) {
        clearTimeout(subscriptionDebounceTimerRef.current);
        subscriptionDebounceTimerRef.current = null;
      }

      // Only attempt unsubscribe if we have a subscriber reference
      if (subscriberRef.current) {
        // Record this unsubscription to prevent rapid resubscription
        lastUnsubscribedAddressRef.current = {
          address: address,
          timestamp: Date.now(),
        };

        BlueElectrum.unsubscribeFromAddress(address, subscriberRef.current, reason).catch((error: unknown) => {
          console.log(`[useAddressMonitor] Error unsubscribing: ${error instanceof Error ? error.message : String(error)}`);
        });
      }
    };
  }, [address, subscribeToAddressWithRetry]);

  // Combine results with additional status flags
  return {
    ...addressData,
    refresh,
    getSubscriptionStatus,
    isStaleData: showingStaleData,
    lastSuccessfulFetch: lastSuccessfulFetchRef.current,
  };
};
