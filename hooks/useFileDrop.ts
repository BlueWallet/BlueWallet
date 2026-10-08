import { useFocusEffect } from '@react-navigation/native';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { useCallback } from 'react';
import { DropPayload, useDropProcessor } from './useDropProcessor';

const dragAndDropModule = NativeModules.DragAndDropModule;
const dropEmitter = dragAndDropModule ? new NativeEventEmitter(dragAndDropModule) : undefined;

export const useFileDrop = (
  onDrop: (contents: string) => void | Promise<void>,
  options: { enabled?: boolean; onError?: (error: Error) => void } = {},
) => {
  const { enabled = true, onError } = options;
  const processDrop = useDropProcessor(onDrop, onError, 'focused-screen');
  useFocusEffect(
    useCallback(() => {
      if (!enabled || !dragAndDropModule || !dropEmitter) return;
      const subscription = dropEmitter.addListener('onFileDrop', (event: DropPayload) => processDrop(event));
      if (__DEV__) console.debug('[DragAndDrop] Focused screen consumer enabled');
      dragAndDropModule.setFocusedDropConsumer(true);
      return () => {
        subscription.remove();
        dragAndDropModule.setFocusedDropConsumer(false);
        if (__DEV__) console.debug('[DragAndDrop] Focused screen consumer disabled');
      };
    }, [enabled, processDrop]),
  );
};
