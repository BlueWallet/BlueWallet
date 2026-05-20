import { useLocale } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { useTheme } from './themes';

interface BlueTextProps extends TextProps {
  bold?: boolean;
  h1?: boolean;
  h2?: boolean;
  h3?: boolean;
  h4?: boolean;
}

const BlueText: React.FC<BlueTextProps> = ({ bold = false, h1, h2, h3, h4, style: passedStyle, ...props }) => {
  const { colors } = useTheme();
  const { direction } = useLocale();

  let headingStyle = {};
  if (h1) {
    headingStyle = styles.h1;
  } else if (h2) {
    headingStyle = styles.h2;
  } else if (h3) {
    headingStyle = styles.h3;
  } else if (h4) {
    headingStyle = styles.h4;
  }

  const hasHeading = h1 || h2 || h3 || h4;
  const style = StyleSheet.compose(
    {
      color: colors.foregroundColor,
      writingDirection: direction,
      fontWeight: hasHeading ? undefined : bold ? 'bold' : 'normal',
      ...headingStyle,
    },
    passedStyle,
  );
  return <Text style={style} {...props} />;
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  h3: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  h4: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});

export default BlueText;
