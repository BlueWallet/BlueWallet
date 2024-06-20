import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { ExportMultisigCoordinationSetupComponent } from './LazyLoadExportMultisigCoordinationSetupStack';

const Stack = createNativeStackNavigator();

const ExportMultisigCoordinationSetupStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="ExportMultisigCoordinationSetup"
        component={ExportMultisigCoordinationSetupComponent}
        options={navigationStyle({
          closeButtonPosition: CloseButtonPosition.Right,
          headerBackVisible: false,
          statusBarStyle: 'light',
          title: loc.multisig.export_coordination_setup,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ExportMultisigCoordinationSetupStackRoot;
