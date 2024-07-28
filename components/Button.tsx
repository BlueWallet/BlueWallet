import React, { forwardRef } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from './themes';

// Define an interface for the props
interface ButtonProps {
  backgroundColor?: string;
  buttonTextColor?: string;
  disabled?: boolean;
  testID?: string;
  icon?: {
    name: string;
    type: string;
    color: string;
  };
  title?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const Button = forwardRef<TouchableOpacity, ButtonProps>((props, ref) => {
  const { colors } = useTheme();

  let backgroundColor = props.backgroundColor ?? colors.mainColor;
  let fontColor = props.buttonTextColor ?? colors.buttonTextColor;
  if (props.disabled) {
    backgroundColor = colors.buttonDisabledBackgroundColor;
    fontColor = colors.buttonDisabledTextColor;
  }

  const buttonStyle = {
    ...styles.button,
    backgroundColor,
    borderColor: props.disabled ? colors.buttonDisabledBackgroundColor : 'transparent',
  };

  const textStyle = {
    ...styles.text,
    color: fontColor,
  };

  const buttonView = (
    <>
      {props.icon && <Icon name={props.icon.name} type={props.icon.type} color={props.icon.color} />}
      {props.title && <Text style={textStyle}>{props.title}</Text>}
    </>
  );

  return props.onPress ? (
    <TouchableOpacity
      ref={ref}
      testID={props.testID}
      style={[buttonStyle, props.style, styles.content]}
      accessibilityRole="button"
      onPress={props.onPress}
      disabled={props.disabled}
    >
      {buttonView}
    </TouchableOpacity>
  ) : (
    <View style={[buttonStyle, props.style, styles.content]}>{buttonView}</View>
  );
});

const styles = StyleSheet.create({
  button: {
    borderWidth: 0.7,
    minHeight: 45,
    height: 48,
    maxHeight: 48,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Button;
