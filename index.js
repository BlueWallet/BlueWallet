import './shim.js';

import React, { useEffect } from 'react';
import { AppRegistry } from 'react-native';

import App from './App';
import { BlueStorageProvider } from './blue_modules/storage-context';
import A from './blue_modules/analytics';
import { SettingsProvider } from './components/Context/SettingsContext';
import { restoreSavedPreferredFiatCurrencyAndExchangeFromStorage } from './blue_modules/currency';

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

const BlueAppComponent = () => {
  useEffect(() => {
    restoreSavedPreferredFiatCurrencyAndExchangeFromStorage();
    A(A.ENUM.INIT);
  }, []);

  return (
    <BlueStorageProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </BlueStorageProvider>
  );
};

AppRegistry.registerComponent('BlueWallet', () => BlueAppComponent);
