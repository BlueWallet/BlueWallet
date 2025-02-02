import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const isCameraAuthorizationStatusGranted = async () => {
  const status = await check(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
  return status === RESULTS.GRANTED;
};

const requestCameraAuthorization = () => {
  return request(Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA);
};

export { isCameraAuthorizationStatusGranted, requestCameraAuthorization };
