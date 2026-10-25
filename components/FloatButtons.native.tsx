import { useIsFocused } from '@react-navigation/native';
import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import NativeCatalystToolbar, { CatalystToolbarAction } from '../codegen/NativeCatalystToolbar';
import { isDesktop } from '../blue_modules/environment';
import {
  FButton as FloatingButton,
  FContainer as FloatingContainer,
  FloatButtonsBottomFade as FloatingButtonsBottomFade,
  getFloatingButtonReservedHeight as getFloatingReservedHeight,
  type FButtonProps,
  type FContainerProps,
} from './FloatButtons.tsx';

const isMacCatalyst = Platform.OS === 'ios' && isDesktop && NativeCatalystToolbar !== null;
let nextToolbarOwner = 0;

type ToolbarButton = {
  id: string;
  title: string;
  systemImageName: string;
  disabled: boolean;
  hasSecondaryAction: boolean;
};

type ToolbarCallbacks = {
  onPress: () => void;
  onLongPress?: () => void;
};

const anchorStyles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    right: 0,
    top: 0,
    opacity: 0,
  },
});

const CatalystContainer = forwardRef<View, FContainerProps>(({ children }, ref) => {
  const isFocused = useIsFocused();
  const ownerId = useRef(`float-toolbar-${++nextToolbarOwner}`).current;
  const callbacks = useRef(new Map<string, ToolbarCallbacks>());

  const items = useMemo(() => {
    const nextCallbacks = new Map<string, ToolbarCallbacks>();
    const nextItems = React.Children.toArray(children).flatMap((child, index): ToolbarButton[] => {
      if (!React.isValidElement<FButtonProps>(child)) return [];

      const { disabled = false, onLongPress, onPress, systemImageName = 'circle', testID, text } = child.props;
      const id = testID ?? `item-${index}`;
      nextCallbacks.set(id, { onPress, onLongPress });

      return [{ id, title: text, systemImageName, disabled, hasSecondaryAction: onLongPress !== undefined }];
    });
    callbacks.current = nextCallbacks;
    return nextItems;
  }, [children]);

  useEffect(() => {
    const subscription = NativeCatalystToolbar?.onPress((event: CatalystToolbarAction) => {
      if (event.ownerId !== ownerId) return;
      const callback = callbacks.current.get(event.itemId);
      if (event.kind === 'longPress') {
        callback?.onLongPress?.();
      } else {
        callback?.onPress();
      }
    });
    return () => subscription?.remove();
  }, [ownerId]);

  const itemsJson = useMemo(() => JSON.stringify(items), [items]);
  useEffect(() => {
    if (!isFocused || items.length === 0) {
      NativeCatalystToolbar?.clearItems(ownerId);
      return;
    }

    NativeCatalystToolbar?.setItems(ownerId, itemsJson);
    return () => NativeCatalystToolbar?.clearItems(ownerId);
  }, [isFocused, items.length, itemsJson, ownerId]);

  // Retain a native anchor for the existing action-sheet callbacks.
  return <View ref={ref} collapsable={false} pointerEvents="none" style={anchorStyles.hidden} />;
});

CatalystContainer.displayName = 'CatalystFloatButtonContainer';

export const FContainer = forwardRef<View, FContainerProps>((props, ref) =>
  isMacCatalyst ? <CatalystContainer {...props} ref={ref} /> : <FloatingContainer {...props} ref={ref} />,
);

FContainer.displayName = 'FContainer';

export const FButton = (props: FButtonProps) => (isMacCatalyst ? null : <FloatingButton {...props} />);

export const FloatButtonsBottomFade = React.memo(() => (isMacCatalyst ? null : <FloatingButtonsBottomFade />));

export const getFloatingButtonReservedHeight = (fontScale = 1, bottomInset = 0): number =>
  isMacCatalyst ? 0 : getFloatingReservedHeight(fontScale, bottomInset);
