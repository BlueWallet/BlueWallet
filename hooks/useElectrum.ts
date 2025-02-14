import { useState, useEffect, useCallback } from 'react';
import * as BlueElectrum from '../blue_modules/BlueElectrum';
import { getConfig, disconnect, serverFeatures, subscribeToConfig } from '../blue_modules/BlueElectrum';

function useElectrum() {
  const [connected, setConnected] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // New states for config and loading status
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function init() {
      try {
        const d = await BlueElectrum.isDisabled();
        setDisabled(d);
        if (d) {
          console.debug('Electrum is disabled.');
          setConnected(false);
        } else {
          await BlueElectrum.connectMain();
          await BlueElectrum.waitTillConnected();
          setConnected(true);
        }
      } catch (err) {
        console.error('Error initializing Electrum:', err);
        setConnected(false);
      }
    }
    init();
  }, []);

  // New refreshConfig function to update config from BlueElectrum
  const refreshConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await getConfig();
      setConfig(cfg);
    } catch (error) {
      console.error('useElectrum - Error refreshing config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Optionally load config on mount
  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    const unsub = subscribeToConfig(cfg => {
      setConnected(Boolean(cfg?.connected));
    });
    return unsub;
  }, []);

  const getBalanceByAddress = async (address: string) => {
    return BlueElectrum.getBalanceByAddress(address);
  };

  const getMempoolTransactionsByAddress = async (address: string) => {
    return BlueElectrum.getMempoolTransactionsByAddress(address);
  };

  const multiGetTransactionByTxid = async (txids: string[], verbose: boolean, batchsize: number = 10) => {
    return BlueElectrum.multiGetTransactionByTxid(txids, verbose, batchsize);
  };

  const estimateFees = async () => {
    return BlueElectrum.estimateFees();
  };

  // Updated subscription helper to add debug logs
  const subscribeBalance = (
    address: string,
    callback: (balance: { confirmed: number; unconfirmed: number }) => void,
    intervalMs: number = 5000,
  ) => {
    console.debug(`subscribeBalance: Subscribing for address ${address} with interval ${intervalMs}ms`);
    const id = setInterval(async () => {
      try {
        const balance = await getBalanceByAddress(address);
        console.debug(`subscribeBalance: Fetched balance for ${address}:`, balance);
        // Log update received from subscription
        console.log(`subscribeBalance: Received update for address ${address}:`, balance);
        callback(balance);
      } catch (error) {
        console.error(`subscribeBalance: Error fetching balance for ${address}:`, error);
      }
    }, intervalMs);
    return () => {
      console.debug(`subscribeBalance: Unsubscribing from balance updates for address ${address} (timer id: ${id})`);
      clearInterval(id);
    };
  };

  return {
    connected,
    disabled,
    getBalanceByAddress,
    getMempoolTransactionsByAddress,
    multiGetTransactionByTxid,
    estimateFees,
    subscribeBalance,
    config,
    loading,
    refreshConfig,
    disconnect,
    serverFeatures,
    setDisabled,
  };
}

export default useElectrum;
