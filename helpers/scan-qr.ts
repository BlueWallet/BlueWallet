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
 * @param options {object} - additional options to pass to navigate
 * @return {Promise<string | null>}
 */
function scanQrHelper(
  currentScreenName: string,
  showFileImportButton = true,
  onDismiss?: () => void,
  options: { merge: boolean } = { merge: true },
): Promise<string | null> {
  return requestCameraAuthorization().then(() => {
    return new Promise(resolve => {
      const params: any = {
        showFileImportButton: Boolean(showFileImportButton),
      };

      if (options?.merge) {
        if (onDismiss) {
          params.onDismiss = onDismiss;
        }
        params.onBarScanned = function (data: any) {
          setTimeout(() => resolve(data.data || data), 1);
          navigationRef.navigate({
            name: currentScreenName,
            params: {},
            merge: options?.merge,
          });
        };

        navigationRef.navigate({
          name: 'ScanQRCodeRoot',
          params: {
            screen: 'ScanQRCode',
            params,
          },
          merge: true,
        });
      } else {
        navigationRef.navigate({
          name: 'ScanQRCodeRoot',
          params: {
            screen: 'ScanQRCode',
            params: {
              showFileImportButton: Boolean(showFileImportButton),
            },
          },
        });
      }
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
