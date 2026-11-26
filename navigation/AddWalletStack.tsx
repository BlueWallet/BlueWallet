import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { lazy } from 'react';

import navigationStyle from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';
import { ScanQRCodeParamList } from './DetailViewStackParamList';

export type AddWalletStackParamList = {
  AddWallet: undefined;
  PleaseBackup: {
    walletID: string;
  };
  ImportNeurai: undefined;
  AddHardwareWallet: undefined;
  ScanQRCode: ScanQRCodeParamList;
};

const Stack = createNativeStackNavigator<AddWalletStackParamList>();

const WalletsAdd = lazy(() => import('../screen/wallets/Add'));
const PleaseBackup = lazy(() => import('../screen/wallets/PleaseBackup'));
const ImportNeurai = lazy(() => import('../screen/wallets/ImportNeurai'));
const AddHardwareWallet = lazy(() => import('../screen/wallets/AddHardwareWallet'));
const ScanQRCode = lazy(() => import('../screen/send/ScanQRCode'));

const AddComponent = withLazySuspense(WalletsAdd);
const PleaseBackupComponent = withLazySuspense(PleaseBackup);
const ImportNeuraiComponent = withLazySuspense(ImportNeurai);
const AddHardwareWalletComponent = withLazySuspense(AddHardwareWallet);
const ScanQRCodeComponent = withLazySuspense(ScanQRCode);

const AddWalletStack = () => {
  const theme = useTheme();
  return (
    <Stack.Navigator initialRouteName="AddWallet">
      {/* Draws its own header (with the close button), like the settings screens. */}
      <Stack.Screen
        name="AddWallet"
        component={AddComponent}
        options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.wallets.add_title }}
      />
      <Stack.Screen
        name="PleaseBackup"
        component={PleaseBackupComponent}
        options={{
          headerShown: false,
          gestureEnabled: false,
          statusBarStyle: theme.dark ? 'light' : 'dark',
          title: loc.pleasebackup.title,
        }}
      />
      <Stack.Screen
        name="ImportNeurai"
        component={ImportNeuraiComponent}
        options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.wallets.import_title }}
      />
      <Stack.Screen
        name="AddHardwareWallet"
        component={AddHardwareWalletComponent}
        options={{ headerShown: false, statusBarStyle: theme.dark ? 'light' : 'dark', title: loc.wallets.hardware_connect_title }}
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
