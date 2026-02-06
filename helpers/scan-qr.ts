import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { navigationRef } from '../NavigationService.ts';

let scanWasBBQR = false;

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
      navigationRef.navigate('ScanQRCode', {
        showFileImportButton: true,
        onBarScanned: (data: string, useBBQR: true) => {
          // this is not a flag of most recent BBQR format, its a flag if in a lifetime or app there was a BBQR scan
          scanWasBBQR = scanWasBBQR || useBBQR;
          resolve(data);
        },
      });
    }
  });
};

const getScanWasBBQR = () => scanWasBBQR;
const resetScanWasBBQR = () => {
  scanWasBBQR = false;
};

export { isCameraAuthorizationStatusGranted, requestCameraAuthorization, scanQrHelper, getScanWasBBQR, resetScanWasBBQR };
