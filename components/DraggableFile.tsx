import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import NativeDraggableFile from '../codegen/DraggableFileNativeComponent';

type Props = {
  children: React.ReactNode;
  fileName: string;
  mimeType: string;
  content?: string;
  isBase64?: boolean;
  captureViewAsImage?: boolean;
  dragEnabled?: boolean;
  dropEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const DraggableFile: React.FC<Props> = ({ children, ...props }) => <NativeDraggableFile {...props}>{children}</NativeDraggableFile>;

export default DraggableFile;
