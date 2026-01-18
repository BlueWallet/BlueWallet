import { codegenNativeComponent, type ViewProps, type CodegenTypes } from 'react-native';

export interface NativeProps extends ViewProps {
  values: string[];
  selectedIndex: CodegenTypes.Int32;
  enabled: boolean;
  backgroundColor: string;
  tintColor: string;
  textColor: string;
  momentary: boolean;
  onChange?: CodegenTypes.BubblingEventHandler<Readonly<{ selectedIndex: CodegenTypes.Int32 }>>;
}

export default codegenNativeComponent<NativeProps>('CustomSegmentedControl');
