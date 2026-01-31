import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { lazy } from 'react';

import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';
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

const WalletsAdd = lazy(() => import('../screen/wallets/Add'));
const ImportCustomDerivationPath = lazy(() => import('../screen/wallets/ImportCustomDerivationPath'));
const ImportWalletDiscovery = lazy(() => import('../screen/wallets/ImportWalletDiscovery'));
const ImportSpeed = lazy(() => import('../screen/wallets/ImportSpeed'));
const ImportWallet = lazy(() => import('../screen/wallets/ImportWallet'));
const PleaseBackup = lazy(() => import('../screen/wallets/PleaseBackup'));
const PleaseBackupLNDHub = lazy(() => import('../screen/wallets/pleaseBackupLNDHub'));
const ProvideEntropy = lazy(() => import('../screen/wallets/ProvideEntropy'));
const WalletsAddMultisig = lazy(() => import('../screen/wallets/WalletsAddMultisig'));
const MultisigAdvanced = lazy(() => import('../screen/wallets/MultisigAdvanced'));
const WalletsAddMultisigStep2 = lazy(() => import('../screen/wallets/addMultisigStep2'));
const WalletsAddMultisigHelp = lazy(() => import('../screen/wallets/addMultisigHelp'));
const ScanQRCode = lazy(() => import('../screen/send/ScanQRCode'));

const AddComponent = withLazySuspense(WalletsAdd);
const ImportWalletDiscoveryComponent = withLazySuspense(ImportWalletDiscovery);
const ImportCustomDerivationPathComponent = withLazySuspense(ImportCustomDerivationPath);
const ImportWalletComponent = withLazySuspense(ImportWallet);
const ImportSpeedComponent = withLazySuspense(ImportSpeed);
const PleaseBackupComponent = withLazySuspense(PleaseBackup);
const PleaseBackupLNDHubComponent = withLazySuspense(PleaseBackupLNDHub);
const ProvideEntropyComponent = withLazySuspense(ProvideEntropy);
const WalletsAddMultisigComponent = withLazySuspense(WalletsAddMultisig);
const MultisigAdvancedComponent = withLazySuspense(MultisigAdvanced);
const WalletsAddMultisigStep2Component = withLazySuspense(WalletsAddMultisigStep2);
const WalletsAddMultisigHelpComponent = withLazySuspense(WalletsAddMultisigHelp);
const ScanQRCodeComponent = withLazySuspense(ScanQRCode);

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
