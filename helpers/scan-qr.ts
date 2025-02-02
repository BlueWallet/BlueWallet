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
  
  const rejected = await isCameraAuthorizationStatusRejected();
  const unavailable = await isCameraAuthorizationStatusUnavailable();
  return !granted && !rejected && !unavailable;
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
