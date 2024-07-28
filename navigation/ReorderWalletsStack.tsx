import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import ReorderWallets from '../screen/wallets/ReorderWallets';

const Stack = createNativeStackNavigator();

const ReorderWalletsStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="ReorderWalletsScreen"
        component={ReorderWallets}
        options={navigationStyle({
          headerBackVisible: false,
          headerLargeTitle: true,

          headerTitle: loc.wallets.reorder_title,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ReorderWalletsStackRoot;
