import { rejects } from 'assert';
import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { presentCameraNotAuthorizedAlert } from '../class/camera';
import loc from '../loc';

/**
 * Helper function that navigates to ScanQR screen, and returns promise that will resolve with the result of a scan,
 * and then navigates back. If QRCode scan was closed, promise resolves to null.
 *
 * @param navigateFunc {function}
 * @param currentScreenName {string}
 * @param showFileImportButton {boolean}
 *
 * @param onDismiss {function} - if camera is closed via X button it gets triggered
 * @return {Promise<string>}
 */
function scanQrHelper(
  navigateFunc: (screen: string | any, params?: any) => void,
  currentScreenName: string,
  showFileImportButton = true,
  onDismiss?: () => void,
): Promise<string | null> {
  return requestCameraAuthorization().then(status => {
    return new Promise((resolve, reject) => {
      if (status !== RESULTS.GRANTED) {
        presentCameraNotAuthorizedAlert(loc.send.permission_camera_message);
        reject(new Error('Camera permission not granted'));
      } else {
        const params = {
          showFileImportButton: Boolean(showFileImportButton),
          onBarScanned: (data: any) => {
            setTimeout(() => resolve(data.data || data), 1);
            navigateFunc({ name: currentScreenName, params: {}, merge: true });
          },
          onDismiss,
        };

        navigateFunc('ScanQRCodeRoot', {
          screen: 'ScanQRCode',
          params,
        });
      }
    });
  });
}

const isCameraAuthorizationStatusGranted = async (): Promise<boolean> => {
  const status = await check(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
  return status === RESULTS.GRANTED;
};

const isCameraAuthorizationStatusDenied = async (): Promise<boolean> => {
  const status = await check(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
  console.log('isCameraAuthorizationStatusDenied', status);
  return status === RESULTS.DENIED || status === RESULTS.BLOCKED;
};

const requestCameraAuthorization = () => {
  return request(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
};

export { scanQrHelper, isCameraAuthorizationStatusDenied, isCameraAuthorizationStatusGranted, requestCameraAuthorization };
