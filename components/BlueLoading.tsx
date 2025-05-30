/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { ActivityIndicator, View, ViewProps, ActivityIndicatorProps } from 'react-native';
import { useTheme } from './themes';

// Extend both ViewProps and full ActivityIndicatorProps
interface BlueLoadingProps extends ViewProps, Pick<ActivityIndicatorProps, 'size' | 'color'> {}

export const BlueLoading: React.FC<BlueLoadingProps> = props => {
  const { color, size, ...otherProps } = props;
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center' }} {...otherProps}>
      <ActivityIndicator size={size} color={color || colors.buttonTextColor} />
    </View>
  );
};
