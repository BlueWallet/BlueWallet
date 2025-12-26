import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type OnChangeEvent = {
  selectedIndex: Int32;
};

type NativeProps = ViewProps & {
  values: ReadonlyArray<string>;
  selectedIndex?: Int32;
  onChangeEvent?: DirectEventHandler<OnChangeEvent>;
};

export default codegenNativeComponent<NativeProps>('CustomSegmentedControl');
export type {NativeProps as CustomSegmentedControlNativeProps};
