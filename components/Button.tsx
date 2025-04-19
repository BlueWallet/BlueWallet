import React, { forwardRef } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, View, ViewStyle } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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

  // Helper function to render the appropriate icon based on type
  function renderIcon(iconProps: { name: string; type: string; color: string }) {
    const { name, type, color } = iconProps;
    const size = 20;

    switch (type) {
      case 'font-awesome':
        return <FontAwesome name={name} size={size} color={color} />;
      case 'font-awesome-5':
        return <FontAwesome5 name={name} size={size} color={color} />;
      case 'ionicon':
      case 'ionicons':
        return <Ionicons name={name} size={size} color={color} />;
      case 'material':
        return <MaterialIcons name={name} size={size} color={color} />;
      case 'material-community':
        return <MaterialCommunityIcons name={name} size={size} color={color} />;
      default:
        return <FontAwesome name={name} size={size} color={color} />;
    }
  }

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
