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
 * @param onDismiss {function} - if camera is closed via X button it gets triggered
 * @param useMerge {boolean} - if true, will merge the new screen with the current screen, otherwise will replace the current screen
 * @return {Promise<string>}
 */
function scanQrHelper(
  currentScreenName: string,
  showFileImportButton = true,
  onDismiss?: () => void,
  useMerge = true,
): Promise<string | null> {
  return requestCameraAuthorization().then(() => {
    return new Promise(resolve => {
      let params = {};

      if (useMerge) {
        const onBarScanned = function (data: any) {
          setTimeout(() => resolve(data.data || data), 1);
          navigationRef.navigate({ name: currentScreenName, params: {}, merge: true });
        };

        params = {
          showFileImportButton: Boolean(showFileImportButton),
          onDismiss,
          onBarScanned,
        };
      } else {
        params = { launchedBy: currentScreenName, showFileImportButton: Boolean(showFileImportButton) };
      }

      navigationRef.navigate({
        name: 'ScanQRCodeRoot',
        params: {
          screen: 'ScanQRCode',
          params,
        },
        merge: true,
      });
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
