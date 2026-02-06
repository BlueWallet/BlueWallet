import React, { lazy, useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';
import { SendDetailsStackParamList } from './SendDetailsStackParamList';
import HeaderRightButton from '../components/HeaderRightButton';
import { BitcoinUnit } from '../models/bitcoinUnits';
import SelectFeeScreen from '../screen/SelectFeeScreen';
import { Platform } from 'react-native';

const Stack = createNativeStackNavigator<SendDetailsStackParamList>();

const SendDetails = lazy(() => import('../screen/send/SendDetails'));
const Confirm = lazy(() => import('../screen/send/Confirm'));
const PsbtWithHardwareWallet = lazy(() => import('../screen/send/psbtWithHardwareWallet'));
const CreateTransaction = lazy(() => import('../screen/send/create'));
const PsbtMultisig = lazy(() => import('../screen/send/psbtMultisig'));
const PsbtMultisigQRCode = lazy(() => import('../screen/send/PsbtMultisigQRCode'));
const Success = lazy(() => import('../screen/send/success'));
const SelectWallet = lazy(() => import('../screen/wallets/SelectWallet'));
const CoinControl = lazy(() => import('../screen/send/CoinControl'));
const PaymentCodesList = lazy(() => import('../screen/wallets/PaymentCodesList'));
const ScanQRCode = lazy(() => import('../screen/send/ScanQRCode'));

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
  const DetailsButton = useMemo(
    () => <HeaderRightButton testID="TransactionDetailsButton" disabled={true} title={loc.send.create_details} />,
    [],
  );

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
          sheetAllowedDetents: Platform.OS === 'ios' ? 'fitToContents' : [0.9],
          presentation: 'formSheet',
          headerTitle: '',
          sheetGrabberVisible: true,
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
