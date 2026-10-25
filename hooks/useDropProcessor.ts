import { useCallback } from 'react';
import { readDroppedFileContents } from '../blue_modules/fs';

export type DropPayload = string | { uri?: string; text?: string; mimeType?: string };

const describeDrop = (payload: DropPayload) => {
  if (typeof payload === 'string') return { kind: 'legacy', mimeType: undefined };
  return { kind: payload.uri ? 'file' : 'text', mimeType: payload.mimeType };
};

export const resolveDroppedContent = async (payload: DropPayload): Promise<string> => {
  const value = typeof payload === 'string' ? payload : (payload.uri ?? payload.text ?? '');
  const hasGrantedURI = typeof payload !== 'string' && Boolean(payload.uri);

  // Plain text never grants the app authority to read a URI named by that text.
  if (!hasGrantedURI && /^(file|content):/i.test(value)) return '';

  return /^(file|content):/i.test(value)
    ? readDroppedFileContents(value, typeof payload === 'string' ? undefined : payload.mimeType)
    : decodeURIComponent(value);
};

export const useDropProcessor = (
  onDrop: (contents: string) => void | Promise<void>,
  onError?: (error: Error) => void,
  source = 'unknown',
) =>
  useCallback(
    async (payload: DropPayload) => {
      try {
        if (__DEV__) console.debug('[DragAndDrop] Processing inbound item', { source, ...describeDrop(payload) });
        const contents = await resolveDroppedContent(payload);
        if (!contents) {
          if (__DEV__) console.debug('[DragAndDrop] Ignored empty or unauthorized inbound item', { source });
          return;
        }
        await onDrop(contents);
        if (__DEV__) console.debug('[DragAndDrop] Inbound item processed', { source });
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        console.warn('[DragAndDrop] Could not process inbound item', { source, message: normalizedError.message });
        onError?.(normalizedError);
      }
    },
    [onDrop, onError, source],
  );
