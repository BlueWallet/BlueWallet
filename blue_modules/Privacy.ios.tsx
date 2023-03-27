import { useContext, useEffect } from 'react';
// @ts-ignore: react-native-obscure is not in the type definition
import { enabled } from 'react-native-privacy-snapshot';
import { BlueStorageContext } from './storage-context';

interface PrivacyComponent extends React.FC {
  enableBlur: (isPrivacyBlurEnabled: boolean) => void;
  disableBlur: () => void;
}

const Privacy: PrivacyComponent = () => {
  const { isPrivacyBlurEnabled } = useContext(BlueStorageContext);

  useEffect(() => {
    Privacy.disableBlur();
  }, [isPrivacyBlurEnabled]);

  return null;
};

Privacy.enableBlur = (isPrivacyBlurEnabled: boolean) => {
  if (!isPrivacyBlurEnabled) return;
  enabled(true);
};

Privacy.disableBlur = () => {
  enabled(false);
};

export default Privacy;
