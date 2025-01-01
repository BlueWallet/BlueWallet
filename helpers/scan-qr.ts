import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { navigationRef } from '../NavigationService';

/**
 * Helper function that navigates to ScanQR screen, and returns promise that will resolve with the result of a scan,
 * and then navigates back. If QRCode scan was closed, promise resolves to null.
 *
 * @param currentScreenName {string}
 * @param showFileImportButton {boolean}
 *
 * @param useMerge {boolean} - if true, will merge the new screen with the current screen, otherwise will replace the current screen
 * @return {Promise<string>}
 */
function scanQrHelper(currentScreenName: string, showFileImportButton = true, useMerge = true): void {
  requestCameraAuthorization().then(() => {
    const params = { launchedBy: currentScreenName, showFileImportButton: Boolean(showFileImportButton) };
    navigationRef.navigate({
      name: 'ScanQRCode',
      params,
      merge: useMerge,
    });
  });
}

const isCameraAuthorizationStatusGranted = async () => {
  const status = await check(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
  return status === RESULTS.GRANTED;
};

const requestCameraAuthorization = () => {
  return request(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
};

export { scanQrHelper, isCameraAuthorizationStatusGranted, requestCameraAuthorization };
