import { useContext, useEffect } from 'react';
// @ts-ignore: react-native-obscure is not in the type definition
import Obscure from 'react-native-obscure';
import { BlueStorageContext } from './storage-context';
interface PrivacyComponent extends React.FC {
  enableBlur: (isPrivacyBlurEnabled: boolean) => void;
  disableBlur: () => void;
}

const Privacy: PrivacyComponent = () => {
  const { isPrivacyBlurEnabled } = useContext(BlueStorageContext);

  useEffect(() => {
    Obscure.deactivateObscure();
  }, [isPrivacyBlurEnabled]);

  return null;
};

Privacy.enableBlur = (isPrivacyBlurEnabled: boolean) => {
  if (!isPrivacyBlurEnabled) return;
  Obscure.activateObscure();
};

Privacy.disableBlur = () => {
  Obscure.deactivateObscure();
};

export default Privacy;
