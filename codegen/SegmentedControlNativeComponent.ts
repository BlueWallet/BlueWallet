import type { HostComponent } from 'react-native';
import type { ViewProps } from 'react-native';
import type { BubblingEventHandler, Int32, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
import { codegenNativeComponent } from 'react-native';


type SegmentedControlChangeEvent = Readonly<{
  selectedIndex: Int32;
  target: Int32;
}>;

export interface NativeProps extends ViewProps {
  values?: ReadonlyArray<string>;
  selectedIndex?: WithDefault<Int32, 0>;
  enabled?: WithDefault<boolean, true>;
  backgroundColor?: string | null;
  tintColor?: string | null;
  textColor?: string | null;
  momentary?: WithDefault<boolean, false>;
  onChange?: BubblingEventHandler<SegmentedControlChangeEvent> | null;
}

export default codegenNativeComponent<NativeProps>('SegmentedControl') as HostComponent<NativeProps>;
