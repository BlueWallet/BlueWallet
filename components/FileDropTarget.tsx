import React, { useCallback } from 'react';
import { NativeSyntheticEvent, StyleProp, ViewStyle } from 'react-native';
import NativeDraggableFile, { FileDropEvent } from '../codegen/DraggableFileNativeComponent';
import { readDroppedFileContents } from '../blue_modules/fs';

type Props = {
  children: React.ReactNode;
  onDrop: (contents: string) => void | Promise<void>;
  onError?: (error: Error) => void;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const FileDropTarget: React.FC<Props> = ({ children, onDrop, onError, enabled = true, style }) => {
  const handleFileDrop = useCallback(
    async ({ nativeEvent }: NativeSyntheticEvent<FileDropEvent>) => {
      try {
        const value = nativeEvent.uri ?? nativeEvent.text ?? '';
        // Text is data, not a platform-granted capability to read a URI.
        if (!nativeEvent.uri && /^(file|content):/i.test(value)) return;
        const contents = /^(file|content):/i.test(value)
          ? await readDroppedFileContents(value, nativeEvent.mimeType)
          : decodeURIComponent(value);
        if (contents) await onDrop(contents);
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        if (onError) onError(normalizedError);
        else console.warn('Could not process dropped file', normalizedError);
      }
    },
    [onDrop, onError],
  );

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
