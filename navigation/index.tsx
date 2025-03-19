import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { lazy, Suspense } from 'react';
import UnlockWith from '../screen/UnlockWith';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';
import AddWalletStack from './AddWalletStack';
import SendDetailsStack from './SendDetailsStack';
import LNDCreateInvoiceRoot from './LNDCreateInvoiceStack';
import ScanLNDInvoiceRoot from './ScanLNDInvoiceStack';
import AztecoRedeemStackRoot from './AztecoRedeemStack';
import WalletExportStack from './WalletExportStack';
import ExportMultisigCoordinationSetupStack from './ExportMultisigCoordinationSetupStack';
import WalletXpubStackRoot from './WalletXpubStack';
import SignVerifyStackRoot from './SignVerifyStack';
import ReceiveDetailsStackRoot from './ReceiveDetailsStack';
import ManageWallets from '../screen/wallets/ManageWallets';
import { ScanQRCodeComponent } from './LazyLoadScanQRCodeStack';
import loc from '../loc';
import { ViewEditMultisigCosignersComponent } from './LazyLoadViewEditMultisigCosignersStack';
import navigationStyle, { CloseButtonPosition } from '../components/navigationStyle';
import { useTheme } from '../components/themes';

const DrawerRoot = lazy(() => import('./DrawerRoot'));

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

const LazyDrawerRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <DrawerRoot />
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
          <DetailViewStack.Screen name="AddWalletRoot" component={AddWalletStack} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen name="SendDetailsRoot" component={SendDetailsStack} options={NavigationFormNoSwipeDefaultOptions} />
          <DetailViewStack.Screen name="LNDCreateInvoiceRoot" component={LNDCreateInvoiceRoot} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen name="ScanLNDInvoiceRoot" component={ScanLNDInvoiceRoot} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen name="AztecoRedeemRoot" component={AztecoRedeemStackRoot} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen
            name="WalletExportRoot"
            component={WalletExportStack}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewStack.Screen
            name="ExportMultisigCoordinationSetupRoot"
            component={ExportMultisigCoordinationSetupStack}
            options={NavigationDefaultOptions}
          />
          <DetailViewStack.Screen
            name="ViewEditMultisigCosigners"
            component={ViewEditMultisigCosignersComponent}
            options={navigationStyle({
              title: loc.multisig.view_edit_cosigners,
              presentation: 'modal',
              headerShown: true,
              closeButtonPosition: CloseButtonPosition.Right,
            })(theme)}
          />
          <DetailViewStack.Screen
            name="WalletXpubRoot"
            component={WalletXpubStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewStack.Screen
            name="SignVerifyRoot"
            component={SignVerifyStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewStack.Screen name="ReceiveDetailsRoot" component={ReceiveDetailsStackRoot} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen
            name="ManageWallets"
            component={ManageWallets}
            options={{
              presentation: 'fullScreenModal',
              title: loc.wallets.manage_title,
              statusBarStyle: 'auto',
            }}
          />
          <DetailViewStack.Screen
            name="ScanQRCode"
            component={ScanQRCodeComponent}
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
