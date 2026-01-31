import React, { lazy } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';

export type WalletExportStackParamList = {
  WalletExport: { walletID: string };
};

const Stack = createNativeStackNavigator<WalletExportStackParamList>();

const WalletExport = lazy(() => import('../screen/wallets/WalletExport'));
const WalletExportComponent = withLazySuspense(WalletExport);

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
