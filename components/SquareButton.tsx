import React, { forwardRef } from 'react';
import { TouchableOpacity, View, Text, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from './themes';

interface SquareButtonProps {
  title: string;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
  testID?: string;
}

export const SquareButton = forwardRef<TouchableOpacity, SquareButtonProps>((props, ref) => {
  const { title, onPress, style, testID } = props;
  const { colors } = useTheme();

  const hookStyles = StyleSheet.create({
    text: {
      color: colors.buttonTextColor,
    },
  });

  return (
    <TouchableOpacity ref={ref} style={style} onPress={onPress} testID={testID} accessibilityRole="button">
      <View style={styles.contentContainer}>
        <Text style={[styles.text, hookStyles.text]}>{title}</Text>
      </View>
    </TouchableOpacity>
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
