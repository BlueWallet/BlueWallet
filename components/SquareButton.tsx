import React, { forwardRef } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { useTheme } from './themes';

interface SquareButtonProps {
  title: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SquareButton = forwardRef<React.ElementRef<typeof TouchableOpacity>, SquareButtonProps>((props, ref) => {
  const { title, onPress, style, testID } = props;
  const { colors } = useTheme();

  const hookStyles = StyleSheet.create({
    text: {
      color: colors.buttonTextColor,
    },
  });

  const buttonView = (
    <View style={styles.contentContainer}>
      <Text style={[styles.text, hookStyles.text]}>{title}</Text>
    </View>
  );

  return onPress ? (
    <TouchableOpacity ref={ref} style={style} onPress={onPress} testID={testID} accessibilityRole="button">
      {buttonView}
    </TouchableOpacity>
  ) : (
    <View style={style}>{buttonView}</View>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginHorizontal: 8,
    fontSize: 16,
  },
});
