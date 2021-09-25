import { useContext, useEffect } from 'react';
import { enabled } from 'react-native-privacy-snapshot';
import { BlueStorageContext } from './storage-context';
const Privacy = () => {
  const { isPrivacyBlurEnabled } = useContext(BlueStorageContext);

  useEffect(() => {
    Privacy.disableBlur();
  }, [isPrivacyBlurEnabled]);

  Privacy.enableBlur = () => {
    if (!isPrivacyBlurEnabled) return;
    enabled(true);
  };

  Privacy.disableBlur = () => {
    enabled(false);
  };
  return null;
};

export default Privacy;
