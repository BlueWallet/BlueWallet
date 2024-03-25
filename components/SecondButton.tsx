import React, { forwardRef } from 'react';
import { useTheme } from './themes';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';

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
};

export const SecondButton = forwardRef<TouchableOpacity, SecondButtonProps>((props, ref) => {
  const { colors } = useTheme();
  let backgroundColor = props.backgroundColor ? props.backgroundColor : colors.buttonGrayBackgroundColor;
  let fontColor = colors.secondButtonTextColor;
  if (props.disabled === true) {
    backgroundColor = colors.buttonDisabledBackgroundColor;
    fontColor = colors.buttonDisabledTextColor;
  }

  return (
    <TouchableOpacity accessibilityRole="button" style={[styles.button, { backgroundColor }]} {...props} ref={ref}>
      <View style={styles.view}>
        {props.icon && <Icon name={props.icon.name} type={props.icon.type} color={props.icon.color} />}
        {props.title && <Text style={[styles.text, { color: fontColor }]}>{props.title}</Text>}
      </View>
    </TouchableOpacity>
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
