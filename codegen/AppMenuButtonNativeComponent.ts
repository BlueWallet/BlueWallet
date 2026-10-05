import type { ColorValue, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

interface NativeProps extends ViewProps {
  textColor?: ColorValue;
  buttonTintColor?: ColorValue;
}

export default codegenNativeComponent<NativeProps>('AppMenuButton', { excludedPlatforms: ['iOS'] });
