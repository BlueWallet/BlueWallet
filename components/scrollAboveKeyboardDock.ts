import { getKeyboardAccessoryDockPaddingHeight } from './keyboardAccessory';

export interface ScrollAboveKeyboardDockInput {
  scrollY: number;
  keyboardHeight: number;
  windowHeight: number;
  inputY: number;
  inputHeight: number;
  barHeight?: number;
  margin?: number;
}

/**
 * Next content offset that puts a focused field above the keyboard and the dock bar.
 * Returns null when the field is already in view. A field taller than the visible area is left
 * alone unless its top is below the keyboard, so a large editor is not jumped to its bottom.
 */
export function scrollOffsetToRevealInput({
  scrollY,
  keyboardHeight,
  windowHeight,
  inputY,
  inputHeight,
  barHeight = getKeyboardAccessoryDockPaddingHeight(),
  margin = 8,
}: ScrollAboveKeyboardDockInput): number | null {
  if (keyboardHeight <= 0) return null;

  const visibleBottom = windowHeight - keyboardHeight - barHeight;
  const inputBottom = inputY + inputHeight;

  if (inputHeight > visibleBottom * 0.75) {
    if (inputY <= visibleBottom) return null;
    return Math.max(0, scrollY + inputY - margin);
  }

  if (inputBottom > visibleBottom) {
    return scrollY + (inputBottom - visibleBottom) + margin;
  }

  if (inputY < margin) {
    return Math.max(0, scrollY + inputY - margin);
  }

  return null;
}
