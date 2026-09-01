import React, { forwardRef } from 'react';
import { Pressable, PressableProps, StyleSheet, Text } from 'react-native';

import { useTheme } from './themes';

interface BlueButtonLinkProps extends PressableProps {
  title: string;
}

const BlueButtonLink = forwardRef<React.ElementRef<typeof Pressable>, BlueButtonLinkProps>((props, ref) => {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.blueButtonLink, pressed && styles.pressed]} {...props} ref={ref}>
      <Text style={[styles.blueButtonLinkText, { color: colors.foregroundColor }]}>{props.title}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  blueButtonLink: {
    minWidth: 100,
    minHeight: 36,
    justifyContent: 'center',
  },
  blueButtonLinkText: {
    textAlign: 'center',
    fontSize: 16,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default BlueButtonLink;
