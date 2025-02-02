import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const isCameraAuthorizationStatusGranted = async () => {
  const status = await check(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
  return status === RESULTS.GRANTED;
};

const isCameraAuthorizationStatusUnavailable = async () => {
  const status = await check(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
  return status === RESULTS.UNAVAILABLE;
};

const isCameraAuthorizationStatusRejected = async () => {
  const status = await check(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
  return status === RESULTS.DENIED;
}

const isCameraAuthorizationStatusDeniedByUser = async () => {
  const granted = await isCameraAuthorizationStatusGranted();
  if (granted) {
    // Camera access is granted
    return false;
  }
  const rejected = await isCameraAuthorizationStatusRejected();
  if (rejected) {
    // Camera access is denied by user
    return true;
  }
  const unavailable = await isCameraAuthorizationStatusUnavailable();
  if (unavailable) {
    // Camera access is unavailable (probably never been requested)
    return false;
  }
  return false;
};

const requestCameraAuthorization = () => {
  return request(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
};

export {
  isCameraAuthorizationStatusGranted,
  isCameraAuthorizationStatusDeniedByUser,
  isCameraAuthorizationStatusUnavailable,
  requestCameraAuthorization,
};
