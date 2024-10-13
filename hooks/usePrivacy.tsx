import { useEffect, useCallback } from 'react';
import { disallowScreenshot } from 'react-native-screen-capture';
import { useSettings } from './context/useSettings';

export const usePrivacy = () => {
  const { isPrivacyBlurEnabled } = useSettings();

  const enableBlur = useCallback(() => {
    if (!isPrivacyBlurEnabled) return;
    disallowScreenshot(true);
  }, [isPrivacyBlurEnabled]);

  const disableBlur = useCallback(() => {
    disallowScreenshot(false);
  }, []);

  useEffect(() => {
    // Apply privacy settings when the component mounts or when the setting changes
    if (isPrivacyBlurEnabled) {
      enableBlur();
    } else {
      disableBlur();
    }

    // Cleanup: Re-enable screenshots when the component unmounts
    return () => {
      disableBlur();
    };
  }, [isPrivacyBlurEnabled, enableBlur, disableBlur]);

  return { enableBlur, disableBlur };
};

export default usePrivacy;