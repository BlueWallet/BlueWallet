import React, { lazy } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';

export type ExportMultisigCoordinationSetupStackRootParamList = {
  ExportMultisigCoordinationSetup: {
    walletID: string;
    closeButtonState?: 'Enabled';
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
        options={navigationStyle(
          {
            headerBackVisible: false,
            closeButtonPosition: CloseButtonPosition.Right,
            statusBarStyle: 'light',
            title: loc.multisig.export_coordination_setup,
          },
          (options, { route }) => ({
            ...options,
            ...(route.params?.closeButtonState ? { closeButtonState: route.params.closeButtonState } : {}),
          }),
        )(theme)}
      />
    </Stack.Navigator>
  );
};

export default ExportMultisigCoordinationSetupStack;
