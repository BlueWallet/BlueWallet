import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ViewEditMultisigCosignersComponent } from './LazyLoadViewEditMultisigCosignersStack';
import { useTheme } from '../components/themes';
import navigationStyle from '../components/navigationStyle';
import loc from '../loc';

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
          closeButton: true,
          headerBackVisible: false,
          title: loc.multisig.manage_keys,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ViewEditMultisigCosignersStackRoot;
