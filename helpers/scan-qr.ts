import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { navigationRef } from '../NavigationService.ts';

let lastScanWasBBQR = false;

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
          lastScanWasBBQR = useBBQR;
          resolve(data);
        },
      });
    }
  });
};

const getLastScanWasBBQR = () => lastScanWasBBQR;
const resetLastScanWasBBQR = () => {
  lastScanWasBBQR = false;
};

export { isCameraAuthorizationStatusGranted, requestCameraAuthorization, scanQrHelper, getLastScanWasBBQR, resetLastScanWasBBQR };
