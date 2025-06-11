import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import {
  AddComponent,
  ImportCustomDerivationPathComponent,
  ImportSpeedComponent,
  ImportWalletComponent,
  ImportWalletDiscoveryComponent,
  PleaseBackupComponent,
  PleaseBackupLNDHubComponent,
  ProvideEntropyComponent,
  WalletsAddMultisigComponent,
  MultisigAdvancedComponent,
  WalletsAddMultisigHelpComponent,
  WalletsAddMultisigStep2Component,
} from './LazyLoadAddWalletStack';
import { ScanQRCodeComponent } from './LazyLoadScanQRCodeStack';
import { ScanQRCodeParamList } from './DetailViewStackParamList';

export type AddWalletStackParamList = {
  AddWallet: {
    entropy?: string;
    words?: number;
  };
  ImportWallet?: {
    label?: string;
    triggerImport?: boolean;
    onBarScanned?: string;
  };
  ImportWalletDiscovery: {
    importText: string;
    askPassphrase: boolean;
    searchAccounts: boolean;
  };
  ImportSpeed: undefined;
  ImportCustomDerivationPath: {
    importText: string;
    password: string | undefined;
  };
  PleaseBackup: {
    walletID: string;
  };
  PleaseBackupLNDHub: {
    walletID: string;
  };
  ProvideEntropy: {
    words: number;
    entropy?: string;
  };
  WalletsAddMultisig: {
    walletLabel: string;
  };
  MultisigAdvanced: {
    m: number;
    n: number;
    format: string;
    onSave: (m: number, n: number, format: string) => void;
  };
  WalletsAddMultisigStep2: {
    m: number;
    n: number;
    walletLabel: string;
    format: string;
    onBarScanned?: string;
  };
  WalletsAddMultisigHelp: undefined;
  ScanQRCode: ScanQRCodeParamList;
};

const Stack = createNativeStackNavigator<AddWalletStackParamList>();

const AddWalletStack = () => {
  const theme = useTheme();
  return (
    <Stack.Navigator initialRouteName="AddWallet">
      <Stack.Screen
        name="AddWallet"
        component={AddComponent}
        options={navigationStyle({
          closeButtonPosition: CloseButtonPosition.Left,
          title: loc.wallets.add_title,
        })(theme)}
      />
      <Stack.Screen
        name="ImportCustomDerivationPath"
        component={ImportCustomDerivationPathComponent}
        options={navigationStyle({ statusBarStyle: 'light', title: loc.wallets.import_derivation_title })(theme)}
      />
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
        name="ProvideEntropy"
        component={ProvideEntropyComponent}
        options={navigationStyle({ title: loc.entropy.title })(theme)}
      />
      <Stack.Screen
        name="WalletsAddMultisig"
        component={WalletsAddMultisigComponent}
        options={navigationStyle({ title: '' })(theme)}
        initialParams={{ walletLabel: loc.multisig.default_label }}
      />
      <Stack.Screen
        name="MultisigAdvanced"
        component={MultisigAdvancedComponent}
        options={navigationStyle({
          title: loc.multisig.vault_advanced_customize,
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          contentStyle: { flex: 1 },
          headerShown: true,
          headerTitle: loc.multisig.vault_advanced_customize,
        })(theme)}
      />
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
          headerBackTitle: undefined,
          statusBarStyle: 'light',
          headerShadowVisible: false,
        })(theme)}
      />
      <Stack.Screen
        name="ScanQRCode"
        component={ScanQRCodeComponent}
        options={navigationStyle({
          headerShown: false,
          statusBarHidden: true,
          presentation: 'fullScreenModal',
          headerShadowVisible: false,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default AddWalletStack;
