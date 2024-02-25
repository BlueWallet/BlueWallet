import { useContext, useEffect, useCallback } from 'react';
// @ts-ignore: react-native-obscure is not in the type definition
import Obscure from 'react-native-obscure';
import { BlueStorageContext } from '../blue_modules/storage-context';

export const usePrivacy = () => {
  const { isPrivacyBlurEnabled } = useContext(BlueStorageContext);

  const enableBlur = useCallback(() => {
    if (!isPrivacyBlurEnabled) return;
    Obscure.activateObscure();
  }, [isPrivacyBlurEnabled]);

  const disableBlur = useCallback(() => {
    Obscure.deactivateObscure();
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
