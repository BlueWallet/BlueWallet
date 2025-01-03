import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import loc from '../loc';
import {
  CoinControlComponent,
  ConfirmComponent,
  CreateTransactionComponent,
  PaymentCodesListComponent,
  PsbtMultisigComponent,
  PsbtMultisigQRCodeComponent,
  PsbtWithHardwareWalletComponent,
  SelectWalletComponent,
  SendDetailsComponent,
  SuccessComponent,
} from './LazyLoadSendDetailsStack';
import { SendDetailsStackParamList } from './SendDetailsStackParamList';
import HeaderRightButton from '../components/HeaderRightButton';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { ScanQRCodeComponent } from './LazyLoadScanQRCodeStack';

const Stack = createNativeStackNavigator<SendDetailsStackParamList>();

const SendDetailsStack = () => {
  const theme = useTheme();
  const DetailsButton = useMemo(
    () => <HeaderRightButton testID="TransactionDetailsButton" disabled={true} title={loc.send.create_details} />,
    [],
  );

  return (
    <Stack.Navigator initialRouteName="SendDetails" screenOptions={{ headerShadowVisible: false }}>
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
