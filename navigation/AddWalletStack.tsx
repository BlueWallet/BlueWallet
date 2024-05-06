import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  AddComponent,
  ImportCustomDerivationPathComponent,
  ImportWalletComponent,
  PleaseBackupComponent,
  PleaseBackupLNDHubComponent,
  PleaseBackupLdkComponent,
  ProvideEntropyComponent,
  WalletsAddMultisigComponent,
  WalletsAddMultisigStep2Component,
  WalletsAddMultisigHelpComponent,
  ImportWalletDiscoveryComponent,
  ImportSpeedComponent,
} from './LazyLoadAddWalletStack';
import { AddWalletStackParamList } from '../typings/NavigationTypes';
import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';

const Stack = createNativeStackNavigator<AddWalletStackParamList>();

const AddWalletStack = () => {
  const theme = useTheme();
  return (
    <Stack.Navigator initialRouteName="AddWallet">
      <Stack.Screen
        name="AddWallet"
        component={AddComponent}
        options={navigationStyle({
          closeButton: true,
          headerBackVisible: false,
          title: loc.wallets.add_title,
        })(theme)}
      />
      <Stack.Screen name="ImportCustomDerivationPath" component={ImportCustomDerivationPathComponent} />
      <Stack.Screen
        name="ImportWallet"
        component={ImportWalletComponent}
        options={navigationStyle({ title: loc.wallets.import_title })(theme)}
      />
      <Stack.Screen
        name="ImportSpeed"
        component={ImportSpeedComponent}
        options={navigationStyle({ statusBarStyle: 'light', title: loc.wallets.import_title })(theme)}
      />
      <Stack.Screen
        name="ImportWalletDiscovery"
        component={ImportWalletDiscoveryComponent}
        options={navigationStyle({
          title: loc.wallets.import_discovery_title,
        })(theme)}
      />
      <Stack.Screen
        name="PleaseBackup"
        component={PleaseBackupComponent}
        options={navigationStyle({
          gestureEnabled: false,
          headerBackVisible: false,
          title: loc.pleasebackup.title,
        })(theme)}
      />
      <Stack.Screen
        name="PleaseBackupLNDHub"
        component={PleaseBackupLNDHubComponent}
        options={navigationStyle({ gestureEnabled: false, headerBackVisible: false, title: loc.pleasebackup.title })(theme)}
      />
      <Stack.Screen
        name="PleaseBackupLdk"
        component={PleaseBackupLdkComponent}
        options={navigationStyle({
          title: loc.pleasebackup.title,
          gestureEnabled: false,
          headerBackVisible: false,
        })(theme)}
      />
      <Stack.Screen
        name="ProvideEntropy"
        component={ProvideEntropyComponent}
        options={navigationStyle({ title: loc.entropy.title })(theme)}
      />
      <Stack.Screen name="WalletsAddMultisig" component={WalletsAddMultisigComponent} options={navigationStyle({ title: '' })(theme)} />
      <Stack.Screen
        name="WalletsAddMultisigStep2"
        component={WalletsAddMultisigStep2Component}
        options={navigationStyle({ title: '', gestureEnabled: false })(theme)}
      />
      <Stack.Screen
        name="WalletsAddMultisigHelp"
        component={WalletsAddMultisigHelpComponent}
        options={navigationStyle({
          title: '',
          gestureEnabled: false,
          headerStyle: {
            backgroundColor: '#0070FF',
          },
          headerTintColor: '#FFFFFF',
          headerBackTitleVisible: false,
          statusBarStyle: 'light',
          headerShadowVisible: false,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default AddWalletStack;
