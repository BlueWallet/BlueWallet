import type { HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';
import type { DirectEventHandler, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';

export type FileDropEvent = Readonly<{
  uri?: string;
  text?: string;
  mimeType?: string;
}>;

export interface NativeProps extends ViewProps {
  fileName: string;
  mimeType: string;
  content?: string;
  isBase64?: WithDefault<boolean, false>;
  captureViewAsImage?: WithDefault<boolean, false>;
  dragEnabled?: WithDefault<boolean, true>;
  dropEnabled?: WithDefault<boolean, false>;
  onFileDrop?: DirectEventHandler<FileDropEvent>;
}

export default codegenNativeComponent<NativeProps>('DraggableFile') as HostComponent<NativeProps>;
