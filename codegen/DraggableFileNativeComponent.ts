import type { HostComponent, ViewProps } from 'react-native';
import { codegenNativeCommands, codegenNativeComponent } from 'react-native';
import type { DirectEventHandler, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';

export type FileDropEvent = Readonly<{
  uri?: string;
  text?: string;
  mimeType?: string;
}>;

export type DragExportRequestEvent = Readonly<{
  requested: boolean;
}>;

export interface NativeProps extends ViewProps {
  fileName: string;
  mimeType: string;
  content?: string;
  isBase64?: WithDefault<boolean, false>;
  captureViewAsImage?: WithDefault<boolean, false>;
  dragEnabled?: WithDefault<boolean, true>;
  dropEnabled?: WithDefault<boolean, false>;
  exportOnDrag?: WithDefault<boolean, false>;
  secureContentExport?: WithDefault<boolean, false>;
  biometricEnabled?: WithDefault<boolean, false>;
  authenticationPrompt?: string;
  onFileDrop?: DirectEventHandler<FileDropEvent>;
  onExportRequested?: DirectEventHandler<DragExportRequestEvent>;
}

type NativeComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  startAuthorizedDrag: (viewRef: React.ElementRef<NativeComponentType>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({ supportedCommands: ['startAuthorizedDrag'] });

export default codegenNativeComponent<NativeProps>('DraggableFile') as NativeComponentType;
