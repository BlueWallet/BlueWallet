import React, { useCallback } from 'react';
import { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import NativeDraggableFile, { FileDropEvent } from '../codegen/DraggableFileNativeComponent';
import { useDropProcessor } from '../hooks/useDropProcessor';

type Props = {
  children: React.ReactNode;
  onDrop: (contents: string) => void | Promise<void>;
  onError?: (error: Error) => void;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const FileDropTarget: React.FC<Props> = ({ children, onDrop, onError, enabled = true, style }) => {
  const processDrop = useDropProcessor(onDrop, onError, 'native-target');
  const handleFileDrop = useCallback(({ nativeEvent }: NativeSyntheticEvent<FileDropEvent>) => processDrop(nativeEvent), [processDrop]);

  return (
    <NativeDraggableFile
      fileName=""
      mimeType="application/octet-stream"
      dragEnabled={false}
      dropEnabled={enabled}
      onFileDrop={handleFileDrop}
      style={style}
    >
      {children}
    </NativeDraggableFile>
  );
};

export default FileDropTarget;
