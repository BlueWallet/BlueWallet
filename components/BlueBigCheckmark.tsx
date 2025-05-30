import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { Icon } from '@rneui/themed';
import { useTheme } from './themes';

interface BlueBigCheckmarkProps extends ViewProps {
  style?: ViewStyle;
}

export function BlueBigCheckmark({ style = {} }: BlueBigCheckmarkProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]}>
      <Icon name="check" size={50} type="font-awesome" color={colors.successCheck} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ccddf9',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
});
