import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/**
 * Opt-in keyboard insets for the focused screen.
 * RN drops keyboard frame changes once the prop is false, including the hide that
 * clears an inset already applied. After blur, keep it on until that hide arrives.
 */
export function useKeyboardInsetsEnabled(requested: boolean | undefined): boolean {
  const isFocused = useIsFocused();
  const enabled = Boolean(requested);
  const [holdForHide, setHoldForHide] = useState(false);

  useEffect(() => {
    if (!enabled || isFocused) {
      setHoldForHide(false);
      return;
    }

    const metrics = Keyboard.metrics();
    if (!metrics || metrics.height <= 0) {
      setHoldForHide(false);
      return;
    }

    setHoldForHide(true);
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      setHoldForHide(false);
    });
    return () => subscription.remove();
  }, [enabled, isFocused]);

  return enabled && (isFocused || holdForHide);
}
