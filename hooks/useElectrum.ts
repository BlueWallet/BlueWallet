import { useState, useEffect, useCallback } from 'react';
import * as BlueElectrum from '../blue_modules/BlueElectrum';

const useElectrum = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentConfig = await BlueElectrum.getConfig();
      setConfig(currentConfig);
    } catch (fetchError) {
      console.error('Error fetching config:', fetchError);
      setError('Error fetching config');
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectElectrum = useCallback(() => {
    try {
      BlueElectrum.disconnect();
      setConfig({ connected: 0, host: '', port: 0 });
    } catch (disconnectError) {
      console.error('Error disconnecting Electrum:', disconnectError);
      setError('Error disconnecting Electrum');
    }
  }, []);

  useEffect(() => {
    refreshConfig();
    const unsubscribe = BlueElectrum.subscribeToConfig(newConfig => {
      setConfig(newConfig);
    });
    return () => unsubscribe();
  }, [refreshConfig]);

  return { config, loading, error, refreshConfig, disconnectElectrum };
};

export default useElectrum;
