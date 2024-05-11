import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExportMultisigCoordinationSetupComponent } from './LazyLoadExportMultisigCoordinationSetupStack';
import { useTheme } from '../components/themes';
import navigationStyle from '../components/navigationStyle';
import loc from '../loc';

const Stack = createNativeStackNavigator();

const ExportMultisigCoordinationSetupStackRoot = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen
        name="ExportMultisigCoordinationSetup"
        component={ExportMultisigCoordinationSetupComponent}
        options={navigationStyle({
          closeButton: true,
          headerBackVisible: false,
          statusBarStyle: 'light',
          title: loc.multisig.export_coordination_setup,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default ExportMultisigCoordinationSetupStackRoot;
