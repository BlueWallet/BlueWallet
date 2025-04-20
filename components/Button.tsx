import React, { forwardRef } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, View, ViewStyle } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { useTheme } from './themes';

interface ButtonProps extends TouchableOpacityProps {
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

// Helper function to render the appropriate icon based on type
function renderIcon(iconProps: { name: string; type: string; color: string }) {
  const { name, color } = iconProps;
  const size = 20;
  return <Icon name={name} size={size} color={color} />;
}

export const Button = forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>((props, ref) => {
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
      {props.icon && renderIcon(props.icon)}
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
      {...props}
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
