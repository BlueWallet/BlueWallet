/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ViewProps } from 'react-native';

interface BlueSpacingProps extends ViewProps {
  horizontal?: boolean; // Optional prop to determine if spacing is horizontal
}

export const BlueSpacing10: React.FC<BlueSpacingProps> = props => {
  const { style, ...otherProps } = props;
  return (
    <View
      {...otherProps}
      style={[
        {
          height: 10,
        },
        style,
      ]}
    />
  );
};

export const BlueSpacing20: React.FC<BlueSpacingProps> = props => {
  const { horizontal = false, style, ...otherProps } = props;
  return (
    <View
      {...otherProps}
      style={[
        {
          height: horizontal ? 0 : 20,
          width: horizontal ? 20 : 0,
          opacity: 0,
        },
        style,
      ]}
    />
  );
};

export const BlueSpacing40: React.FC<BlueSpacingProps> = props => {
  const { style, ...otherProps } = props;
  return (
    <View
      {...otherProps}
      style={[
        {
          height: 40,
        },
        style,
      ]}
    />
  );
};

export const BlueSpacing: React.FC<BlueSpacingProps> = props => {
  const { style, ...otherProps } = props;
  return (
    <View
      {...otherProps}
      style={[
        {
          height: 60,
        },
        style,
      ]}
    />
  );
};
