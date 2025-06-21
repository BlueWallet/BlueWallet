import React, { forwardRef } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, Pressable, PressableProps, View, ViewStyle, Platform } from 'react-native';
import { Icon } from '@rneui/themed';

import { useTheme } from './themes';

interface ButtonProps extends PressableProps {
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
  showActivityIndicator?: boolean;
}

export const Button = forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>((props, ref) => {
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

  const buttonView = props.showActivityIndicator ? (
    <ActivityIndicator size="small" color={textStyle.color} />
  ) : (
    <>
      {props.icon && <Icon name={props.icon.name} type={props.icon.type} color={props.icon.color} />}
      {props.title && <Text style={textStyle}>{props.title}</Text>}
    </>
  );

  return props.onPress ? (
    <View style={styles.pressableWrapper}>
      <Pressable
        ref={ref}
        testID={props.testID}
        android_ripple={{ color: colors.androidRippleColor }}
        style={({ pressed }) => [Platform.OS === 'ios' && pressed ? styles.pressed : null, buttonStyle, props.style, styles.content]}
        accessibilityRole="button"
        onPress={props.onPress}
        disabled={props.disabled}
        {...props}
      >
        {buttonView}
      </Pressable>
    </View>
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
  pressableWrapper: {
    overflow: 'hidden',
    borderRadius: 25,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default Button;
