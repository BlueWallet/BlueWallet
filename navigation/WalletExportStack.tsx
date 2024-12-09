import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { WalletExportComponent } from './LazyLoadWalletExportStack';

export type WalletExportStackParamList = {
  WalletExport: { walletID: string };
};

const Stack = createNativeStackNavigator<WalletExportStackParamList>();

const WalletExportStack = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="WalletExport"
        component={WalletExportComponent}
        options={navigationStyle({
          headerBackVisible: false,
          title: loc.wallets.export_title,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default WalletExportStack;
