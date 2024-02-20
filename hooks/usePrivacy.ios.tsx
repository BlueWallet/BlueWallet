import { useContext, useEffect, useCallback } from 'react';
// @ts-ignore: react-native-obscure is not in the type definition
import { enabled } from 'react-native-privacy-snapshot';
import { BlueStorageContext } from '../blue_modules/storage-context';

export const usePrivacy = () => {
  const { isPrivacyBlurEnabled } = useContext(BlueStorageContext);

  const enableBlur = useCallback(() => {
    if (!isPrivacyBlurEnabled) return;
    enabled(true);
  }, [isPrivacyBlurEnabled]);

  const disableBlur = useCallback(() => {
    enabled(false);
  }, []); // This doesn't depend on the isPrivacyBlurEnabled value

  useEffect(() => {
    // Automatically activate or deactivate on mount and when isPrivacyBlurEnabled changes
    if (isPrivacyBlurEnabled) {
      enableBlur();
    } else {
      disableBlur();
    }

    // Cleanup function to deactivate obscure when the component unmounts
    return () => {
      disableBlur();
    };
  }, [isPrivacyBlurEnabled, enableBlur, disableBlur]);

  return { enableBlur, disableBlur };
};

export default usePrivacy;
