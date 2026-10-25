// ActionSheet.common.ts
import { findNodeHandle, type GestureResponderEvent } from 'react-native';

export interface ActionSheetOptions {
  title?: string;
  message?: string;
  options: string[]; // Array of button labels.
  destructiveButtonIndex?: number;
  cancelButtonIndex?: number;
  confirmButtonIndex?: number;
  anchor?: number;
}

export type CompletionCallback = (buttonIndex: number) => void;

export const createAlertConfig = (options: ActionSheetOptions, completion: CompletionCallback) => {
  let didComplete = false;
  const complete = (index: number) => {
    if (didComplete) return;
    didComplete = true;
    completion(index);
  };
  const buttons = options.options.map((option, index) => {
    let style: 'default' | 'cancel' | 'destructive' = 'default';
    if (index === options.destructiveButtonIndex) {
      style = 'destructive';
    } else if (index === options.cancelButtonIndex) {
      style = 'cancel';
    }

    return { text: option, onPress: () => complete(index), style };
  });
  const cancelable = options.cancelButtonIndex !== undefined;

  return {
    buttons,
    alertOptions: {
      cancelable,
      onDismiss: cancelable ? () => complete(options.cancelButtonIndex!) : undefined,
    },
  };
};

type NodeHandleResolver = (target: GestureResponderEvent['currentTarget']) => number | null | undefined;

const resolveNodeHandle: NodeHandleResolver = target => {
  try {
    return findNodeHandle(target as never);
  } catch (_) {
    return undefined;
  }
};

export const getActionSheetAnchor = (
  event: GestureResponderEvent,
  resolver: NodeHandleResolver = resolveNodeHandle,
): number | undefined => {
  const currentTarget = event.currentTarget;
  if (typeof currentTarget === 'number') return currentTarget;

  const handle = resolver(currentTarget);
  if (typeof handle === 'number') return handle;

  const nativeTarget = event.nativeEvent.target;
  return typeof nativeTarget === 'number' ? nativeTarget : undefined;
};
