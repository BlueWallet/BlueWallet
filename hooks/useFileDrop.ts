import { useFocusEffect } from '@react-navigation/native';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { useCallback } from 'react';
import { readDroppedFileContents } from '../blue_modules/fs';

const dragAndDropModule = NativeModules.DragAndDropModule;
const dropEmitter = dragAndDropModule ? new NativeEventEmitter(dragAndDropModule) : undefined;

type DropEvent = string | { uri?: string; text?: string; mimeType?: string };

export const useFileDrop = (
  onDrop: (contents: string) => void | Promise<void>,
  options: { enabled?: boolean; onError?: (error: Error) => void } = {},
) => {
  const { enabled = true, onError } = options;
  useFocusEffect(
    useCallback(() => {
      if (!enabled || !dragAndDropModule || !dropEmitter) return;
      const subscription = dropEmitter.addListener('onFileDrop', async (event: DropEvent) => {
        try {
          const value = typeof event === 'string' ? event : (event.uri ?? event.text ?? '');
          const contents = /^(file|content):/i.test(value)
            ? await readDroppedFileContents(value, typeof event === 'string' ? undefined : event.mimeType)
            : decodeURIComponent(value);
          if (contents) await onDrop(contents);
        } catch (error) {
          const normalizedError = error instanceof Error ? error : new Error(String(error));
          if (onError) onError(normalizedError);
          else console.warn('Could not process dropped file', normalizedError);
        }
      });
      dragAndDropModule.setFocusedDropConsumer(true);
      return () => {
        subscription.remove();
        dragAndDropModule.setFocusedDropConsumer(false);
      };
    }, [enabled, onDrop, onError]),
  );
};
