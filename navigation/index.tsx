import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { lazy } from 'react';
import { Platform } from 'react-native';
import UnlockWith from '../screen/UnlockWith';
import { withLazySuspense } from './LazyLoadingIndicator';
import { RootStackParamList } from './RootStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import loc from '../loc';
import navigationStyle, { CloseButtonPosition, withRouteParamHeaderOptions } from '../components/navigationStyle';
import { useTheme } from '../components/themes';
import WalletXpub from '../screen/wallets/xpub';
import WalletExport from '../screen/wallets/WalletExport';
import ViewEditMultisigCosignerViewSheet from '../screen/wallets/ViewEditMultisigCosignerViewSheet';
import ViewEditMultisigProvideMnemonicsSheet from '../screen/wallets/ViewEditMultisigProvideMnemonicsSheet';
import ViewEditMultisigShareCosignerSheet from '../screen/wallets/ViewEditMultisigShareCosignerSheet';
import { navigationGuardRouter } from './navigationGuard';

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
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
};

export const NavigationFormNoSwipeDefaultOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'modal',
  headerShadowVisible: false,
  fullScreenGestureEnabled: false,
};
export const StatusBarLightOptions: NativeStackNavigationOptions = { statusBarStyle: 'light' };

const RootStack = createNativeStackNavigator<RootStackParamList>();

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
const multisigSheetAllowedDetents = Platform.OS === 'ios' ? 'fitToContents' : [0.9];

const MainRoot = () => {
  const { walletsInitialized } = useStorage();
  const theme = useTheme();

  return (
    <RootStack.Navigator UNSTABLE_router={navigationGuardRouter} screenOptions={{ headerShown: false }}>
      {!walletsInitialized ? (
        <RootStack.Screen name="UnlockWithScreen" component={UnlockWith} />
      ) : (
        <>
          <RootStack.Screen name="DrawerRoot" component={LazyDrawerRoot} />

          {/* Modal stacks */}
          <RootStack.Screen name="AddWalletRoot" component={LazyAddWalletStack} options={NavigationDefaultOptions} />
          <RootStack.Screen name="SendDetailsRoot" component={LazySendDetailsStack} options={NavigationFormNoSwipeDefaultOptions} />
          <RootStack.Screen name="LNDCreateInvoiceRoot" component={LazyLNDCreateInvoiceRoot} options={NavigationDefaultOptions} />
          <RootStack.Screen name="ScanLNDInvoiceRoot" component={LazyScanLNDInvoiceRoot} options={NavigationDefaultOptions} />
          <RootStack.Screen name="AztecoRedeemRoot" component={LazyAztecoRedeemStackRoot} options={NavigationDefaultOptions} />

          <RootStack.Screen
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
          <RootStack.Screen
            name="ExportMultisigCoordinationSetupRoot"
            component={LazyExportMultisigCoordinationSetupStack}
            options={NavigationDefaultOptions}
          />
          <RootStack.Screen
            name="ViewEditMultisigCosigners"
            component={LazyViewEditMultisigCosigners}
            options={navigationStyle(
              {
                title: loc.multisig.view_edit_cosigners,
                presentation: 'modal',
                headerShown: true,
                gestureEnabled: false,
                closeButtonPosition: CloseButtonPosition.Right,
              },
              withRouteParamHeaderOptions({ headerRight: true }),
            )(theme)}
          />
          <RootStack.Screen
            name="ViewEditMultisigCosignerViewSheet"
            component={ViewEditMultisigCosignerViewSheet}
            options={navigationStyle({
              presentation: 'formSheet',
              sheetAllowedDetents: multisigSheetAllowedDetents,
              sheetGrabberVisible: true,
              closeButtonPosition: CloseButtonPosition.Right,
              headerShown: true,
              headerTitle: '',
            })(theme)}
          />
          <RootStack.Screen
            name="ViewEditMultisigProvideMnemonicsSheet"
            component={ViewEditMultisigProvideMnemonicsSheet}
            options={navigationStyle({
              presentation: 'formSheet',
              sheetAllowedDetents: multisigSheetAllowedDetents,
              sheetGrabberVisible: true,
              closeButtonPosition: CloseButtonPosition.Right,
              headerShown: true,
              headerTitle: '',
            })(theme)}
          />
          <RootStack.Screen
            name="ViewEditMultisigShareCosignerSheet"
            component={ViewEditMultisigShareCosignerSheet}
            options={navigationStyle({
              presentation: 'formSheet',
              sheetAllowedDetents: multisigSheetAllowedDetents,
              sheetGrabberVisible: true,
              closeButtonPosition: CloseButtonPosition.Right,
              headerShown: true,
              headerTitle: '',
            })(theme)}
          />
          <RootStack.Screen
            name="WalletXpub"
            component={WalletXpub}
            options={navigationStyle({
              title: loc.wallets.xpub_title,
              presentation: 'modal',
              headerShown: true,
              closeButtonPosition: CloseButtonPosition.Right,
            })(theme)}
          />
          <RootStack.Screen
            name="SignVerifyRoot"
            component={LazySignVerifyStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />

          <RootStack.Screen
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
    </RootStack.Navigator>
  );
};

export default MainRoot;
export { RootStack };
