import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  values: string[];
  selectedIndex: Int32;
  enabled: boolean;
  backgroundColor: string;
  tintColor: string;
  textColor: string;
  momentary: boolean;
  onChange?: DirectEventHandler<Readonly<{ selectedIndex: Int32 }>>;
}

export default codegenNativeComponent<NativeProps>('CustomSegmentedControl');
