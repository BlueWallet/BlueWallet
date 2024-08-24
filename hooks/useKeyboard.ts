import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

interface KeyboardInfo {
  isVisible: boolean;
  height: number;
}

interface UseKeyboardProps {
  onKeyboardDidShow?: () => void;
  onKeyboardDidHide?: () => void;
}

export const useKeyboard = ({ onKeyboardDidShow, onKeyboardDidHide }: UseKeyboardProps = {}): KeyboardInfo => {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    const handleKeyboardDidShow = (event: KeyboardEvent) => {
      setKeyboardInfo({
        isVisible: true,
        height: event.endCoordinates.height,
      });
      if (onKeyboardDidShow) {
        onKeyboardDidShow();
      }
    };

    const handleKeyboardDidHide = () => {
      setKeyboardInfo({
        isVisible: false,
        height: 0,
      });
      if (onKeyboardDidHide) {
        onKeyboardDidHide();
      }
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardDidShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardDidHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [onKeyboardDidShow, onKeyboardDidHide]);

  return keyboardInfo;
};
