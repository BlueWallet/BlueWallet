import React, { useCallback, useMemo } from 'react';
import { NativeSyntheticEvent, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import ContextMenu, { ContextMenuOnPressNativeEvent } from 'react-native-context-menu-view';
import { ToolTipMenuProps } from './types';
import { useSettings } from '../hooks/context/useSettings';
import { buildMenu, lookupId } from './TooltipMenu.helpers';

const ToolTipMenu = (props: ToolTipMenuProps) => {
  const {
    title = '',
    shouldOpenOnLongPress = true,
    disabled = false,
    onPress,
    isButton = false,
    buttonStyle,
    onPressMenuItem,
    children,
    actions,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    accessibilityState,
    testID,
    style,
    enableAndroidRipple = true,
  } = props;

  const { language } = useSettings();

  const { items, ids } = useMemo(() => buildMenu(actions, Platform.OS as 'ios' | 'android'), [actions]);

  const handlePressMenuItem = useCallback(
    (e: NativeSyntheticEvent<ContextMenuOnPressNativeEvent>) => {
      const { name, indexPath, index } = e.nativeEvent;
      const path = indexPath?.length ? indexPath : typeof index === 'number' ? [index] : [];
      const id = lookupId(ids, path);
      if (id !== undefined) onPressMenuItem(id);
      else if (name) onPressMenuItem(name); // last-resort fallback
    },
    [ids, onPressMenuItem],
  );

  if (disabled || actions.length === 0) return null;

  // The native ContextMenu is the single source of truth for opening the menu:
  // - Android: ContextMenuView's GestureDetector handles tap (dropdown mode)
  //   and long-press, then opens the popup itself.
  // - iOS: UIContextMenuInteraction is attached to the first React child, with
  //   `showsMenuAsPrimaryAction` for tap-to-open in dropdown mode.
  //
  // We wrap in a Pressable ONLY when the caller wants a separate `onPress`
  // (a short-tap action that does something OTHER than open the menu). Adding
  // any extra Pressable handler is unnecessary and on Android races with the
  // native gesture detector — usePressability always returns true from
  // onStartShouldSetResponder, so the JS responder system claims the touch
  // and dispatches ACTION_CANCEL to the child native view, leaving the menu
  // unopened. There is no escape hatch for that — Pressable cannot be
  // configured to skip responder claiming.
  //
  // Trade-off: dropdown buttons without onPress (HeaderMenuButton et al.)
  // get no Android ripple. The menu opening (≈100ms) is the feedback. We
  // accept this rather than reintroduce the gesture-cancel race.
  const wrapInPressable = Boolean(onPress);

  const buttonShellStyle: StyleProp<ViewStyle> = isButton ? styles.button : undefined;
  const visibleStyle = StyleSheet.flatten([buttonShellStyle, style, buttonStyle]);

  const menu = (
    <ContextMenu
      title={title}
      previewBackgroundColor="transparent"
      onPress={handlePressMenuItem}
      actions={items}
      dropdownMenuMode={!shouldOpenOnLongPress}
      style={wrapInPressable ? styles.menuFlex : visibleStyle}
    >
      {children}
    </ContextMenu>
  );

  if (!wrapInPressable) {
    // Wrap the native ContextMenu in a plain View that carries `testID` and the
    // accessibility props. On iOS, react-native-context-menu-view propagates
    // the accessibility identifier across multiple descendants of its native
    // host, so attaching `testID` directly to ContextMenu makes Detox match
    // multiple views (`Multiple elements found for "MATCHER(id == ...)"`).
    // A plain View gives Detox a single, deterministic match and—unlike
    // Pressable—never claims the JS responder, so it does not reintroduce the
    // Android gesture-cancel race documented above.
    return (
      <View
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
      >
        {menu}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      android_ripple={enableAndroidRipple ? { color: '#d9d9d9', foreground: true } : undefined}
      style={({ pressed }) =>
        StyleSheet.flatten([visibleStyle, pressed && enableAndroidRipple && Platform.OS === 'android' ? styles.pressed : null])
      }
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLanguage={language}
      testID={testID}
      hitSlop={8}
    >
      {menu}
    </Pressable>
  );
};

export default ToolTipMenu;

const styles = StyleSheet.create({
  button: { alignSelf: 'center' },
  menuFlex: { flex: 1 },
  pressed: { opacity: 0.6 },
});
