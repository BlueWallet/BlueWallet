import React, { forwardRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';

import { useTheme } from './themes';

type IconProps = {
  name: string;
  type: string;
  color: string;
};

type SecondButtonProps = {
  backgroundColor?: string;
  disabled?: boolean;
  icon?: IconProps;
  title?: string;
  onPress?: () => void;
};

export const SecondButton = forwardRef<TouchableOpacity, SecondButtonProps>((props, ref) => {
  const { colors } = useTheme();
  let backgroundColor = props.backgroundColor ? props.backgroundColor : colors.buttonGrayBackgroundColor;
  let fontColor = colors.secondButtonTextColor;
  if (props.disabled === true) {
    backgroundColor = colors.buttonDisabledBackgroundColor;
    fontColor = colors.buttonDisabledTextColor;
  }

  const buttonView = (
    <View style={styles.view}>
      {props.icon && <Icon name={props.icon.name} type={props.icon.type} color={props.icon.color} />}
      {props.title && <Text style={[styles.text, { color: fontColor }]}>{props.title}</Text>}
    </View>
  );

  return props.onPress ? (
    <TouchableOpacity
      disabled={props.disabled}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor }]}
      {...props}
      ref={ref}
    >
      {buttonView}
    </TouchableOpacity>
  ) : (
    <View style={[styles.button, { backgroundColor }]}>{buttonView}</View>
  );
});

const styles = StyleSheet.create({
  button: {
    minHeight: 45,
    height: 48,
    maxHeight: 48,
    borderRadius: 7,
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
  view: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
