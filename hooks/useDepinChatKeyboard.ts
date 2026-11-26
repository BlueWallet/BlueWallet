import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation } from 'react-native';

/**
 * Keeps the embedded chat list above the edge-to-edge Android keyboard, on its
 * latest message (offset 0: the list is inverted).
 * Listens only while the chat is on screen: the listeners are app-wide, and a
 * hidden chat reacting to another screen's keyboard animates layouts under it.
 */
const useDepinChatKeyboard = (active = true) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesListRef = useRef<any>(null);

  useEffect(() => {
    if (!active) return;
    const show = Keyboard.addListener('keyboardDidShow', event => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
      setTimeout(() => messagesListRef.current?.scrollToOffset?.({ offset: 0, animated: true }), 300);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
      setKeyboardHeight(0);
    };
  }, [active]);

  return { keyboardHeight, messagesListRef };
};

export default useDepinChatKeyboard;
