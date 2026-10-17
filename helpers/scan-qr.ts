import { Platform } from 'react-native';
import { CommonActions, NavigationState, PartialState } from '@react-navigation/native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { navigationRef } from '../NavigationService.ts';

let scanWasBBQR = false;

type AnyNavigationState = NavigationState | PartialState<NavigationState>;

/**
 * Key of the deepest focused navigator that registers the ScanQRCode route.
 *
 * Several nested stacks (SendDetails, AddWallet, LNDCreateInvoice) register their own
 * ScanQRCode screen. Navigating from the root would always pick the root's screen and
 * present it over the modal stack that is currently shown; UIKit reports that as presenting
 * from a detached view controller, and on Mac Catalyst the scanner then ends up rehosted in
 * the modal's window without keyboard focus or working Edit-menu actions. Pushing the
 * scanner inside the focused stack keeps the presentation chain intact on every platform
 * (nested stacks additionally present it as a regular modal on desktop, see navigationStyle.tsx).
 */
export const findScannerNavigatorKey = (state: AnyNavigationState | undefined): string | undefined => {
  let key: string | undefined;
  let current: AnyNavigationState | undefined = state;
  while (current) {
    if (current.key && current.routeNames?.includes('ScanQRCode')) key = current.key;
    const index = current.index ?? current.routes.length - 1;
    current = current.routes[index]?.state;
  }
  return key;
};

const isCameraAuthorizationStatusGranted = async () => {
  const status = await check(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
  return status === RESULTS.GRANTED;
};

const requestCameraAuthorization = () => {
  return request(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
};

const scanQrHelper = async (): Promise<string> => {
  await requestCameraAuthorization();
  return new Promise(resolve => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch({
        ...CommonActions.navigate({
          name: 'ScanQRCode',
          params: {
            showFileImportButton: true,
            onBarScanned: (data: string, useBBQR: true) => {
              // this is not a flag of most recent BBQR format, its a flag if in a lifetime or app there was a BBQR scan
              scanWasBBQR = scanWasBBQR || useBBQR;
              resolve(data);
            },
          },
        }),
        target: findScannerNavigatorKey(navigationRef.getRootState()),
      });
    }
  });
};

const getScanWasBBQR = () => scanWasBBQR;
const resetScanWasBBQR = () => {
  scanWasBBQR = false;
};

export { isCameraAuthorizationStatusGranted, requestCameraAuthorization, scanQrHelper, getScanWasBBQR, resetScanWasBBQR };
