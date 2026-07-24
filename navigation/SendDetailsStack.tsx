import React, { lazy, useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { createEllipsisHeaderMenuOptions } from '../components/headerMenuOptions';
import navigationStyle, { CloseButtonPosition, withRouteParamHeaderOptions } from '../components/navigationStyle';
import { isIOS26OrHigher } from '../blue_modules/environment';
import { useTheme } from '../components/themes';
import { Action } from '../components/types';
import loc from '../loc';
import { withLazySuspense } from './LazyLoadingIndicator';
import { CoinControlSortDirection, CoinControlSortType, SendDetailsStackParamList } from './SendDetailsStackParamList';
import HeaderRightButton from '../components/HeaderRightButton';
import { BitcoinUnit } from '../models/bitcoinUnits';
import SelectFeeScreen from '../screen/SelectFeeScreen';
import CoinControlOutputSheet from '../screen/send/CoinControlOutputSheet';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';

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

  const coinControlOptions = navigationStyle(
    {
      title: loc.cc.header,
      closeButtonIfFirstInStack: CloseButtonPosition.Left,
    },
    (options, { navigation, route }) => {
      const sortDirection = route.params?.sortDirection ?? CoinControlSortDirection.ASC;
      const sortType = route.params?.sortType ?? CoinControlSortType.HEIGHT;
      const hasUtxos = route.params?.hasUtxos ?? false;

      const onPressMenuItem = (menuItem: string) => {
        if (menuItem === CommonToolTipActions.SortASC.id) {
          navigation.setParams({ sortDirection: CoinControlSortDirection.DESC });
        } else if (menuItem === CommonToolTipActions.SortDESC.id) {
          navigation.setParams({ sortDirection: CoinControlSortDirection.ASC });
        } else if (menuItem === CommonToolTipActions.SortHeight.id) {
          navigation.setParams({ sortType: CoinControlSortType.HEIGHT });
        } else if (menuItem === CommonToolTipActions.SortValue.id) {
          navigation.setParams({ sortType: CoinControlSortType.VALUE });
        } else if (menuItem === CommonToolTipActions.SortLabel.id) {
          navigation.setParams({ sortType: CoinControlSortType.LABEL });
        } else if (menuItem === CommonToolTipActions.SortStatus.id) {
          navigation.setParams({ sortType: CoinControlSortType.FROZEN });
        }
      };

      const actions: Action[] | Action[][] = [
        [
          { ...CommonToolTipActions.SortHeight, menuState: sortType === CoinControlSortType.HEIGHT },
          { ...CommonToolTipActions.SortValue, menuState: sortType === CoinControlSortType.VALUE },
          { ...CommonToolTipActions.SortLabel, menuState: sortType === CoinControlSortType.LABEL },
          { ...CommonToolTipActions.SortStatus, menuState: sortType === CoinControlSortType.FROZEN },
        ],
        [sortDirection === CoinControlSortDirection.ASC ? CommonToolTipActions.SortASC : CommonToolTipActions.SortDESC],
      ];

      const headerMenuOptions = createEllipsisHeaderMenuOptions({
        actions,
        onPressMenuItem,
        preserveGroups: true,
        title: loc.cc.sort_by,
      });

      return {
        ...options,
        headerRight: hasUtxos ? headerMenuOptions.headerRight : undefined,
        ...(isIOS26OrHigher ? { unstable_headerRightItems: hasUtxos ? headerMenuOptions.unstable_headerRightItems : undefined } : {}),
      };
    },
  )(theme);

  return (
    <Stack.Navigator initialRouteName="SendDetails" screenOptions={{ headerShadowVisible: false, fullScreenGestureEnabled: false }}>
      <Stack.Screen
        name="SendDetails"
        component={SendDetailsComponent}
        options={navigationStyle(
          {
            title: loc.send.header,
            statusBarStyle: 'light',
            closeButtonPosition: CloseButtonPosition.Left,
          },
          withRouteParamHeaderOptions({ headerRight: true }),
        )(theme)}
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
        options={navigationStyle(
          { title: loc.send.confirm_header, headerRight: () => DetailsButton },
          withRouteParamHeaderOptions({ headerRight: true }),
        )(theme)}
      />
      <Stack.Screen
        name="PsbtWithHardwareWallet"
        component={PsbtWithHardwareWalletComponent}
        options={navigationStyle({ title: loc.send.header, gestureEnabled: false, fullScreenGestureEnabled: false })(theme)}
      />
      <Stack.Screen
        name="CreateTransaction"
        component={CreateTransactionComponent}
        options={navigationStyle({ title: loc.send.create_details }, withRouteParamHeaderOptions({ headerRight: true }))(theme)}
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
      <Stack.Screen name="CoinControl" component={CoinControlComponent} options={coinControlOptions} />
      <Stack.Screen
        name="PaymentCodeList"
        component={PaymentCodesListComponent}
        options={navigationStyle({ title: loc.bip47.contacts })(theme)}
      />
      <Stack.Screen
        name="ScanQRCode"
        component={ScanQRCodeComponent}
        options={navigationStyle({
          statusBarHidden: true,
          presentation: 'fullScreenModal',
          headerTransparent: true,
          headerBlurEffect: 'dark',
          headerShadowVisible: false,
        })(theme)}
      />
    </Stack.Navigator>
  );
};

export default SendDetailsStack;
