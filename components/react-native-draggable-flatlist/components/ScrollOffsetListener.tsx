import Animated, { call, onChange, useCode } from 'react-native-reanimated';
import { typedMemo } from '../utils';

type Props = {
  scrollOffset: Animated.Value<number>;
  onScrollOffsetChange: (offset: readonly number[]) => void;
};

const ScrollOffsetListener = ({ scrollOffset, onScrollOffsetChange }: Props) => {
  useCode(() => onChange(scrollOffset, call([scrollOffset], onScrollOffsetChange)), []);
  return null;
};

export default typedMemo(ScrollOffsetListener);
