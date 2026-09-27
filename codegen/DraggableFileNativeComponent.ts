import type { HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';
import type { WithDefault } from 'react-native/Libraries/Types/CodegenTypes';

export interface NativeProps extends ViewProps {
  fileName: string;
  mimeType: string;
  content?: string;
  isBase64?: WithDefault<boolean, false>;
  captureViewAsImage?: WithDefault<boolean, false>;
}

export default codegenNativeComponent<NativeProps>('DraggableFile') as HostComponent<NativeProps>;
