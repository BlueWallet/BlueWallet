import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { ViewEditMultisigCosignersComponent } from './LazyLoadViewEditMultisigCosignersStack';

export type ViewEditMultisigCosignersStackParamList = {
  ViewEditMultisigCosigners: {
    walletID: string;
  };
};

const Stack = createNativeStackNavigator<ViewEditMultisigCosignersStackParamList>();

const ViewEditMultisigCosignersStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="ViewEditMultisigCosigners"
        component={ViewEditMultisigCosignersComponent}
        options={navigationStyle({
          headerBackVisible: false,
          title: loc.multisig.manage_keys,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ViewEditMultisigCosignersStackRoot;
