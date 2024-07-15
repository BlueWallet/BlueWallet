import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { navigationRef } from '../NavigationService';
import { NavigationProp } from '@react-navigation/native';
/**
 * Helper function that navigates to ScanQR screen, and returns promise that will resolve with the result of a scan,
 * and then navigates back. If QRCode scan was closed, promise resolves to null.
 *
 * @param currentScreenName {string}
 * @param showFileImportButton {boolean}
 *
 * @param onDismiss {function} - if camera is closed via X button it gets triggered
 * @return {Promise<string>}
 */
function scanQrHelper(
  currentScreenName: string,
  showFileImportButton = true,
  onDismiss?: () => void,
  navigate?: NavigationProp<any>['navigate'], // pass navigate when calling from inside BottomModal
): Promise<string | null> {
  return requestCameraAuthorization().then(() => {
    return new Promise(resolve => {
      const params = {
        showFileImportButton: Boolean(showFileImportButton),
        onBarScanned: (data: any) => {},
        onDismiss,
      };

      params.onBarScanned = function (data: any) {
        setTimeout(() => resolve(data.data || data), 1);
        (navigate || navigationRef.navigate)({
          name: currentScreenName,
          params: {},
          merge: true,
        });
      };
      (navigate || navigationRef.navigate)({
        name: 'ScanQRCodeRoot',
        params: {
          screen: 'ScanQRCode',
          params,
        },
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
