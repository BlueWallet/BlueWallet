import { createContext, useContext } from 'react';
import { Platform } from 'react-native';

import { isIOS26OrHigher } from '../blue_modules/environment';

/** True while KeyboardAccessoryDock is pinning a bar above the IME. */
export const KeyboardDockActiveContext = createContext(false);

export const useKeyboardDockActive = (): boolean => useContext(KeyboardDockActiveContext);

/** Shared height for keyboard accessory bars docked above the IME. */
export const KEYBOARD_ACCESSORY_BAR_HEIGHT = 44;

/** Horizontal inset for the iOS capsule chrome. */
export const KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_H = 8;

/** Gap between the capsule and the keyboard. */
export const KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_BOTTOM = 4;

/** Corner radius for the iOS capsule chrome. */
export const KEYBOARD_ACCESSORY_IOS_CAPSULE_RADIUS = 20;

/** Whether the dock should render floating capsule chrome (iOS 26+). */
export const useKeyboardAccessoryCapsuleChrome = isIOS26OrHigher;

/**
 * Extra height the dock reserves below the bar (capsule bottom margin on iOS 26+).
 * Used so screen content padding matches the visible chrome.
 */
export const getKeyboardAccessoryChromeExtraHeight = (): number =>
  useKeyboardAccessoryCapsuleChrome ? KEYBOARD_ACCESSORY_IOS_CAPSULE_MARGIN_BOTTOM : 0;

/** Default padding height for KeyboardAccessoryDock (bar + platform chrome). */
export const getKeyboardAccessoryDockPaddingHeight = (): number => KEYBOARD_ACCESSORY_BAR_HEIGHT + getKeyboardAccessoryChromeExtraHeight();

/** Android full-bleed bars get a hairline separator; iOS capsule does not. */
export const useKeyboardAccessoryAndroidSeparator = Platform.OS === 'android';
