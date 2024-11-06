import 'react-native-gesture-handler'; // should be on top

import React from 'react';
import { LargeScreenProvider } from './components/Context/LargeScreenProvider';
import MasterView from './navigation/MasterView';
import { StorageProvider } from './components/Context/StorageProvider';
import { SettingsProvider } from './components/Context/SettingsProvider';

const App = () => {
  return (
    <LargeScreenProvider>
      <StorageProvider>
      <SettingsProvider>

        <MasterView />
        </SettingsProvider>
      </StorageProvider>
    </LargeScreenProvider>
  );
};

export default App;
