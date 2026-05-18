import React, { lazy, useEffect, useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';
import { SendDetailsStackParamList } from './SendDetailsStackParamList';
import HeaderRightButton from '../components/HeaderRightButton';
import { BitcoinUnit, Chain } from '../models/bitcoinUnits';
import SelectFeeScreen from '../screen/SelectFeeScreen';
import CoinControlOutputSheet from '../screen/send/CoinControlOutputSheet';
import { useStorage } from '../hooks/context/useStorage';

const Stack = createNativeStackNavigator<SendDetailsStackParamList>();

const importSendDetails = () => import('../screen/send/SendDetails');
const importConfirm = () => import('../screen/send/Confirm');
const importPsbtWithHardwareWallet = () => import('../screen/send/psbtWithHardwareWallet');
const importCreateTransaction = () => import('../screen/send/create');
const importPsbtMultisig = () => import('../screen/send/psbtMultisig');
const importPsbtMultisigQRCode = () => import('../screen/send/PsbtMultisigQRCode');
const importSuccess = () => import('../screen/send/success');
const importSelectWallet = () => import('../screen/wallets/SelectWallet');
const importCoinControl = () => import('../screen/send/CoinControl');
const importPaymentCodesList = () => import('../screen/wallets/PaymentCodesList');
const importScanQRCode = () => import('../screen/send/ScanQRCode');

const SendDetails = lazy(importSendDetails);
const Confirm = lazy(importConfirm);
const PsbtWithHardwareWallet = lazy(importPsbtWithHardwareWallet);
const CreateTransaction = lazy(importCreateTransaction);
const PsbtMultisig = lazy(importPsbtMultisig);
const PsbtMultisigQRCode = lazy(importPsbtMultisigQRCode);
const Success = lazy(importSuccess);
const SelectWallet = lazy(importSelectWallet);
const CoinControl = lazy(importCoinControl);
const PaymentCodesList = lazy(importPaymentCodesList);
const ScanQRCode = lazy(importScanQRCode);

const SendDetailsComponent = withLazySuspense(SendDetails);
const ConfirmComponent = withLazySuspense(Confirm);
const PsbtWithHardwareWalletComponent = withLazySuspense(PsbtWithHardwareWallet);
const CreateTransactionComponent = withLazySuspense(CreateTransaction);
const PsbtMultisigComponent = withLazySuspense(PsbtMultisig);
const PsbtMultisigQRCodeComponent = withLazySuspense(PsbtMultisigQRCode);
const SuccessComponent = withLazySuspense(Success);
const SelectWalletComponent = withLazySuspense(SelectWallet);
const CoinControlComponent = withLazySuspense(CoinControl);
const PaymentCodesListComponent = withLazySuspense(PaymentCodesList);
const ScanQRCodeComponent = withLazySuspense(ScanQRCode);

const SendDetailsStack = () => {
  const theme = useTheme();
  const { wallets, walletsInitialized } = useStorage();
  const warmModule = (importer: () => Promise<unknown>) => {
    importer().catch(() => {
      // Keep lazy fallback behavior if background preload fails.
    });
  };

  const DetailsButton = useMemo(
    () => <HeaderRightButton testID="TransactionDetailsButton" disabled={true} title={loc.send.create_details} />,
    [],
  );

  useEffect(() => {
    if (!walletsInitialized) {
      return;
    }

    const hasOnchainSendWallet = wallets.some(wallet => wallet.chain === Chain.ONCHAIN && wallet.allowSend());
    const hasMultisigWallet = wallets.some(wallet => wallet.type === 'HDmultisig');
    const hasOffchainWallet = wallets.some(wallet => wallet.chain === Chain.OFFCHAIN);

    if (hasOnchainSendWallet) {
      warmModule(importConfirm);
      warmModule(importCreateTransaction);
      warmModule(importCoinControl);
      warmModule(importPsbtWithHardwareWallet);
      warmModule(importSelectWallet);
      warmModule(importScanQRCode);
      warmModule(importSuccess);
    }

    if (hasMultisigWallet) {
      warmModule(importPsbtMultisig);
      warmModule(importPsbtMultisigQRCode);
    }

    if (hasOffchainWallet) {
      warmModule(importPaymentCodesList);
    }
  }, [wallets, walletsInitialized]);

  return (
    <Stack.Navigator initialRouteName="SendDetails" screenOptions={{ headerShadowVisible: false, fullScreenGestureEnabled: false }}>
      <Stack.Screen
        name="SendDetails"
        component={SendDetailsComponent}
        options={navigationStyle({
          title: loc.send.header,
          statusBarStyle: 'light',
          closeButtonPosition: CloseButtonPosition.Left,
        })(theme)}
        initialParams={{ isEditable: true, feeUnit: BitcoinUnit.BTC, amountUnit: BitcoinUnit.BTC }} // Correctly typed now
      />
      <Stack.Screen
        name="SelectFee"
        component={SelectFeeScreen}
        options={navigationStyle({
          presentation: 'formSheet',
          headerTitle: '',
          sheetAllowedDetents: Platform.OS === 'ios' ? 'fitToContents' : [0.45],
          sheetGrabberVisible: true,
          contentStyle: { flex: 1 },
          keyboardHandlingEnabled: true,
          navigationBarTranslucent: false,
        })(theme)}
      />
      <Stack.Screen
        name="Confirm"
        component={ConfirmComponent}
        options={navigationStyle({ title: loc.send.confirm_header, headerRight: () => DetailsButton })(theme)}
      />
      <Stack.Screen
        name="PsbtWithHardwareWallet"
        component={PsbtWithHardwareWalletComponent}
        options={navigationStyle({ title: loc.send.header, gestureEnabled: false, fullScreenGestureEnabled: false })(theme)}
      />
      <Stack.Screen
        name="CreateTransaction"
        component={CreateTransactionComponent}
        options={navigationStyle({ title: loc.send.create_details })(theme)}
      />
      <Stack.Screen
        name="PsbtMultisig"
        component={PsbtMultisigComponent}
        options={navigationStyle({ title: loc.multisig.header })(theme)}
      />
      <Stack.Screen
        name="PsbtMultisigQRCode"
        component={PsbtMultisigQRCodeComponent}
        options={navigationStyle({ title: loc.multisig.header })(theme)}
      />
      <Stack.Screen
        name="Success"
        component={SuccessComponent}
        options={navigationStyle({ headerShown: false, gestureEnabled: false })(theme)}
      />
      <Stack.Screen
        name="SelectWallet"
        component={SelectWalletComponent}
        options={navigationStyle({ title: loc.wallets.select_wallet })(theme)}
      />
      <Stack.Screen
        name="CoinControlOutput"
        component={CoinControlOutputSheet}
        options={navigationStyle({
          presentation: 'formSheet',
          sheetAllowedDetents: Platform.OS === 'ios' ? 'fitToContents' : [0.9],
          headerTitle: '',
          sheetGrabberVisible: true,
          closeButtonPosition: CloseButtonPosition.Right,
        })(theme)}
      />
      <Stack.Screen name="CoinControl" component={CoinControlComponent} options={navigationStyle({ title: loc.cc.header })(theme)} />
      <Stack.Screen
        name="PaymentCodeList"
        component={PaymentCodesListComponent}
        options={navigationStyle({ title: loc.bip47.contacts })(theme)}
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

export default SendDetailsStack;
