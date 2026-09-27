import { useFocusEffect } from '@react-navigation/native';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { useCallback } from 'react';
import { readDroppedFileContents } from '../blue_modules/fs';

const dragAndDropModule = NativeModules.DragAndDropModule;
const dropEmitter = dragAndDropModule ? new NativeEventEmitter(dragAndDropModule) : undefined;

type DropEvent = string | { uri?: string; text?: string; mimeType?: string };

export const useFileDrop = (
  onDrop: (contents: string) => void | Promise<void>,
  options: { enabled?: boolean } = {},
) => {
  const { enabled = true } = options;
  useFocusEffect(
    useCallback(() => {
      if (!enabled || !dragAndDropModule || !dropEmitter) return;
      const subscription = dropEmitter.addListener('onFileDrop', async (event: DropEvent) => {
        const value = typeof event === 'string' ? event : event.uri ?? event.text ?? '';
        const contents = /^(file|content):/i.test(value)
          ? await readDroppedFileContents(value, typeof event === 'string' ? undefined : event.mimeType)
          : decodeURIComponent(value);
        if (contents) await onDrop(contents);
      });
      dragAndDropModule.setFocusedDropConsumer(true);
      return () => {
        subscription.remove();
        dragAndDropModule.setFocusedDropConsumer(false);
      };
    }, [enabled, onDrop]),
  );
};
