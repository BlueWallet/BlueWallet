import { RefObject, useCallback, useEffect, useRef } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, TextInput } from 'react-native';

import { scrollOffsetToRevealInput } from '../components/scrollAboveKeyboardDock';
import { useKeyboard } from './useKeyboard';

interface MeasurableInput {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
}

function currentlyFocusedInput(): MeasurableInput | null {
  const state = (TextInput as unknown as { State?: { currentlyFocusedInput?: () => MeasurableInput | null } }).State;
  return state?.currentlyFocusedInput?.() ?? null;
}

/** Scroll the focused field above the dock when the keyboard is open. `focusKey` retriggers after a field switch. */
export function useScrollAboveKeyboardDock(scrollRef: RefObject<ScrollView | null>, focusKey?: unknown) {
  const scrollYRef = useRef(0);
  const { height: keyboardHeight, isVisible } = useKeyboard();

  const scrollFocusedFieldIntoView = useCallback(() => {
    const input = currentlyFocusedInput();
    const scroll = scrollRef.current;
    if (!scroll || !input?.measureInWindow || keyboardHeight <= 0) return;

    input.measureInWindow((_x, y, _width, height) => {
      const nextY = scrollOffsetToRevealInput({
        scrollY: scrollYRef.current,
        keyboardHeight,
        windowHeight: Dimensions.get('window').height,
        inputY: y,
        inputHeight: height,
      });
      if (nextY != null) scroll.scrollTo({ y: nextY, animated: true });
    });
  }, [keyboardHeight, scrollRef]);

  useEffect(() => {
    if (isVisible) scrollFocusedFieldIntoView();
  }, [focusKey, isVisible, keyboardHeight, scrollFocusedFieldIntoView]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  return { onScroll, scrollEventThrottle: 16 as const };
}
