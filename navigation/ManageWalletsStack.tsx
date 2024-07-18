import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle, { CloseButtonState } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import ManageWallets from '../screen/wallets/ManageWallets';

const Stack = createNativeStackNavigator();

const ManageWalletsStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="ManageWalletsScreen"
        component={ManageWallets}
        options={navigationStyle({
          headerBackVisible: false,
          headerLargeTitle: true,
          closeButtonState: CloseButtonState.Enabled,
          headerTitle: loc.wallets.manage_wallets_title,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ManageWalletsStackRoot;
