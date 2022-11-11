/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
import React, { forwardRef } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Icon } from 'react-native-elements';
import { useTheme } from '@react-navigation/native';

export const SquareButton = forwardRef((props, ref) => {
  const { colors } = useTheme();
  let backgroundColor = props.backgroundColor ? props.backgroundColor : colors.buttonBlueBackgroundColor;
  let fontColor = colors.buttonTextColor;
  if (props.disabled === true) {
    backgroundColor = colors.buttonDisabledBackgroundColor;
    fontColor = colors.buttonDisabledTextColor;
  }

  return (
    <TouchableOpacity
      style={{
        flex: 1,
        borderWidth: 0.7,
        borderColor: 'transparent',
        backgroundColor,
        minHeight: 50,
        height: 50,
        maxHeight: 50,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      {...props}
      ref={ref}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        {props.icon && <Icon name={props.icon.name} type={props.icon.type} color={props.icon.color} />}
        {props.title && <Text style={{ marginHorizontal: 8, fontSize: 16, color: fontColor }}>{props.title}</Text>}
      </View>
    </TouchableOpacity>
  );
});
