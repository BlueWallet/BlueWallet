import { useContext, useEffect } from 'react';
// @ts-ignore: Package is not in the type definition
import { enableSecureView, disableSecureView, forbidAndroidShare, allowAndroidShare } from 'react-native-prevent-screenshot-ios-android';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { Platform } from 'react-native';

export const usePrivacy = () => {
  const { isPrivacyBlurEnabled } = useContext(BlueStorageContext);

  const enableBlur = () => {
    if (!isPrivacyBlurEnabled) return;
    if (Platform.OS === 'android') {
      forbidAndroidShare();
    } else if (Platform.OS === 'ios') {
      enableSecureView();
    }
  };

  const disableBlur = () => {
    if (Platform.OS === 'android') {
      allowAndroidShare();
    } else if (Platform.OS === 'ios') {
      disableSecureView();
    }
  };

  useEffect(() => {
    // Automatically activate or deactivate on mount and when isPrivacyBlurEnabled changes
    if (isPrivacyBlurEnabled) {
      enableBlur();
    } else {
      disableBlur();
    }

    return () => {
      disableBlur();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { enableBlur, disableBlur };
};

export default usePrivacy;
