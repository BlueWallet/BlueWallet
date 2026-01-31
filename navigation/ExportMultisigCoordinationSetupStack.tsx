import React, { lazy } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';

export type ExportMultisigCoordinationSetupStackRootParamList = {
  ExportMultisigCoordinationSetup: {
    walletID: string;
  };
};

const Stack = createNativeStackNavigator<ExportMultisigCoordinationSetupStackRootParamList>();

const ExportMultisigCoordinationSetup = lazy(() => import('../screen/wallets/ExportMultisigCoordinationSetup'));
const ExportMultisigCoordinationSetupComponent = withLazySuspense(ExportMultisigCoordinationSetup);

const ExportMultisigCoordinationSetupStack = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator initialRouteName="ExportMultisigCoordinationSetup">
      <Stack.Screen
        name="ExportMultisigCoordinationSetup"
        component={ExportMultisigCoordinationSetupComponent}
        options={navigationStyle({
          headerBackVisible: false,
          statusBarStyle: 'light',
          title: loc.multisig.export_coordination_setup,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ExportMultisigCoordinationSetupStack;
