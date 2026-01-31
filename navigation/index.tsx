import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { lazy } from 'react';
import UnlockWith from '../screen/UnlockWith';
import { withLazySuspense } from './LazyLoadingIndicator';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import loc from '../loc';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import WalletXpub from '../screen/wallets/xpub';
import WalletExport from '../screen/wallets/WalletExport';

// Lazy load all components except UnlockWith
const DrawerRoot = lazy(() => import('./DrawerRoot'));
const AddWalletStack = lazy(() => import('./AddWalletStack'));
const SendDetailsStack = lazy(() => import('./SendDetailsStack'));
const LNDCreateInvoiceRoot = lazy(() => import('./LNDCreateInvoiceStack'));
const ScanLNDInvoiceRoot = lazy(() => import('./ScanLNDInvoiceStack'));
const AztecoRedeemStackRoot = lazy(() => import('./AztecoRedeemStack'));
const ExportMultisigCoordinationSetupStack = lazy(() => import('./ExportMultisigCoordinationSetupStack'));
const SignVerifyStackRoot = lazy(() => import('./SignVerifyStack'));
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

const LazyDrawerRoot = withLazySuspense(DrawerRoot);
const LazyAddWalletStack = withLazySuspense(AddWalletStack);
const LazySendDetailsStack = withLazySuspense(SendDetailsStack);
const LazyLNDCreateInvoiceRoot = withLazySuspense(LNDCreateInvoiceRoot);
const LazyScanLNDInvoiceRoot = withLazySuspense(ScanLNDInvoiceRoot);
const LazyAztecoRedeemStackRoot = withLazySuspense(AztecoRedeemStackRoot);
const LazyExportMultisigCoordinationSetupStack = withLazySuspense(ExportMultisigCoordinationSetupStack);
const LazyViewEditMultisigCosigners = withLazySuspense(ViewEditMultisigCosigners);
const LazySignVerifyStackRoot = withLazySuspense(SignVerifyStackRoot);
const LazyScanQRCodeComponent = withLazySuspense(ScanQRCode);

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
            name="WalletExport"
            component={WalletExport}
            options={navigationStyle({
              headerBackVisible: false,
              title: loc.wallets.export_title,
              presentation: 'modal',
              headerShown: true,
              closeButtonPosition: CloseButtonPosition.Right,
            })(theme)}
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
            name="WalletXpub"
            component={WalletXpub}
            options={navigationStyle({
              title: loc.wallets.xpub_title,
              presentation: 'modal',
              headerShown: true,
              closeButtonPosition: CloseButtonPosition.Right,
            })(theme)}
          />
          <DetailViewStack.Screen
            name="SignVerifyRoot"
            component={LazySignVerifyStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />

          <DetailViewStack.Screen
            name="ScanQRCode"
            component={LazyScanQRCodeComponent}
            options={{
              headerShown: false,
              statusBarHidden: true,
              orientation: 'portrait',
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
