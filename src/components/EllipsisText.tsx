import React from 'react';
import { TextStyle, StyleProp, Text } from 'react-native';

type EllipsizeMode = 'head' | 'middle' | 'tail' | 'clip';

interface Props {
  children: React.ReactNode | string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: EllipsizeMode;
}

export const EllipsisText = ({ children, style, numberOfLines = 1, ellipsizeMode = 'tail' }: Props) => (
  <Text numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode} style={style}>
    {children}
  </Text>
);
