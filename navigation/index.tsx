import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { lazy, Suspense } from 'react';
import UnlockWith from '../screen/UnlockWith';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import loc from '../loc';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';

// Lazy load all components except UnlockWith
const DrawerRoot = lazy(() => import('./DrawerRoot'));
const AddWalletStack = lazy(() => import('./AddWalletStack'));
const SendDetailsStack = lazy(() => import('./SendDetailsStack'));
const LNDCreateInvoiceRoot = lazy(() => import('./LNDCreateInvoiceStack'));
const ScanLNDInvoiceRoot = lazy(() => import('./ScanLNDInvoiceStack'));
const AztecoRedeemStackRoot = lazy(() => import('./AztecoRedeemStack'));
const WalletExportStack = lazy(() => import('./WalletExportStack'));
const ExportMultisigCoordinationSetupStack = lazy(() => import('./ExportMultisigCoordinationSetupStack'));
const WalletXpubStackRoot = lazy(() => import('./WalletXpubStack'));
const SignVerifyStackRoot = lazy(() => import('./SignVerifyStack'));
const ReceiveDetailsStackRoot = lazy(() => import('./ReceiveDetailsStack'));
const ManageWallets = lazy(() => import('../screen/wallets/ManageWallets'));
const ScanQRCode = lazy(() => import('../screen/send/ScanQRCode'));
const ViewEditMultisigCosigners = lazy(() => import('../screen/wallets/ViewEditMultisigCosigners'));

export const NavigationDefaultOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'modal',
  headerShadowVisible: false,
};
export const NavigationFormModalOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'formSheet',
};

export const NavigationFormNoSwipeDefaultOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'modal',
  headerShadowVisible: false,
  fullScreenGestureEnabled: false,
};
export const StatusBarLightOptions: NativeStackNavigationOptions = { statusBarStyle: 'light' };

const DetailViewStack = createNativeStackNavigator<DetailViewStackParamList>();

// Lazy loading wrapper components
const LazyDrawerRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <DrawerRoot />
  </Suspense>
);

const LazyAddWalletStack = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <AddWalletStack />
  </Suspense>
);

const LazySendDetailsStack = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SendDetailsStack />
  </Suspense>
);

const LazyLNDCreateInvoiceRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <LNDCreateInvoiceRoot />
  </Suspense>
);

const LazyScanLNDInvoiceRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ScanLNDInvoiceRoot />
  </Suspense>
);

const LazyAztecoRedeemStackRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <AztecoRedeemStackRoot />
  </Suspense>
);

const LazyWalletExportStack = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletExportStack />
  </Suspense>
);

const LazyExportMultisigCoordinationSetupStack = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ExportMultisigCoordinationSetupStack />
  </Suspense>
);

const LazyViewEditMultisigCosigners = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ViewEditMultisigCosigners />
  </Suspense>
);

const LazyWalletXpubStackRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletXpubStackRoot />
  </Suspense>
);

const LazySignVerifyStackRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SignVerifyStackRoot />
  </Suspense>
);

const LazyReceiveDetailsStackRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ReceiveDetailsStackRoot />
  </Suspense>
);

const LazyManageWallets = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ManageWallets />
  </Suspense>
);

const LazyScanQRCodeComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ScanQRCode />
  </Suspense>
);

const MainRoot = () => {
  const { walletsInitialized } = useStorage();
  const theme = useTheme();

  return (
    <DetailViewStack.Navigator screenOptions={{ headerShown: false }}>
      {!walletsInitialized ? (
        <DetailViewStack.Screen name="UnlockWithScreen" component={UnlockWith} />
      ) : (
        <>
          <DetailViewStack.Screen name="DrawerRoot" component={LazyDrawerRoot} />

          {/* Modal stacks */}
          <DetailViewStack.Screen name="AddWalletRoot" component={LazyAddWalletStack} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen name="SendDetailsRoot" component={LazySendDetailsStack} options={NavigationFormNoSwipeDefaultOptions} />
          <DetailViewStack.Screen name="LNDCreateInvoiceRoot" component={LazyLNDCreateInvoiceRoot} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen name="ScanLNDInvoiceRoot" component={LazyScanLNDInvoiceRoot} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen name="AztecoRedeemRoot" component={LazyAztecoRedeemStackRoot} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen
            name="WalletExportRoot"
            component={LazyWalletExportStack}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewStack.Screen
            name="ExportMultisigCoordinationSetupRoot"
            component={LazyExportMultisigCoordinationSetupStack}
            options={NavigationDefaultOptions}
          />
          <DetailViewStack.Screen
            name="ViewEditMultisigCosigners"
            component={LazyViewEditMultisigCosigners}
            options={navigationStyle({
              title: loc.multisig.view_edit_cosigners,
              presentation: 'modal',
              headerShown: true,
              gestureEnabled: false,
              closeButtonPosition: CloseButtonPosition.Right,
            })(theme)}
          />
          <DetailViewStack.Screen
            name="WalletXpubRoot"
            component={LazyWalletXpubStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewStack.Screen
            name="SignVerifyRoot"
            component={LazySignVerifyStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewStack.Screen name="ReceiveDetailsRoot" component={LazyReceiveDetailsStackRoot} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen
            name="ManageWallets"
            component={LazyManageWallets}
            options={{
              presentation: 'fullScreenModal',
              title: loc.wallets.manage_title,
              statusBarStyle: 'auto',
              headerShown: true,
            }}
          />
          <DetailViewStack.Screen
            name="ScanQRCode"
            component={LazyScanQRCodeComponent}
            options={{
              headerShown: false,
              statusBarHidden: true,
              presentation: 'fullScreenModal',
            }}
          />
        </>
      )}
    </DetailViewStack.Navigator>
  );
};

export default MainRoot;
export { DetailViewStack };
