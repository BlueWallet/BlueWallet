import { useRef } from 'react';
import Animated from 'react-native-reanimated';

export function useNode<T>(node: Animated.Node<T>) {
  const ref = useRef<Animated.Node<T> | null>(null);
  if (ref.current === null) {
    ref.current = node;
  }
  return ref.current;
}
