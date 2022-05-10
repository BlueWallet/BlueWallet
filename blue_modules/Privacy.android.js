import { useContext, useEffect } from 'react';
import Obscure from 'react-native-obscure';
import { BlueStorageContext } from './storage-context';
const Privacy = () => {
  const { isPrivacyBlurEnabled } = useContext(BlueStorageContext);

  useEffect(() => {
    Privacy.disableBlur();
  }, [isPrivacyBlurEnabled]);

  Privacy.enableBlur = () => {
    if (!isPrivacyBlurEnabled) return;
    Obscure.activateObscure();
  };

  Privacy.disableBlur = () => {
    Obscure.deactivateObscure();
  };
  return null;
};
export default Privacy;
