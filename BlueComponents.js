/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
import React, { forwardRef } from 'react';
import { ActivityIndicator, Dimensions, I18nManager, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from '@rneui/themed';
import { useTheme } from './components/themes';

const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

/**
 * TODO: remove this comment once this file gets properly converted to typescript.
 *
 * @type {React.FC<any>}
 */
export const BlueButtonLink = forwardRef((props, ref) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={{
        minWidth: 100,
        minHeight: 36,
        justifyContent: 'center',
      }}
      {...props}
      ref={ref}
    >
      <Text style={{ color: colors.foregroundColor, textAlign: 'center', fontSize: 16 }}>{props.title}</Text>
    </TouchableOpacity>
  );
});

export const BlueCard = props => {
  return <View {...props} style={{ padding: 20 }} />;
};

export const BlueText = props => {
  const { colors } = useTheme();
  const style = StyleSheet.compose({ color: colors.foregroundColor, writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }, props.style);
  return <Text {...props} style={style} />;
};

export const BlueTextCentered = props => {
  const { colors } = useTheme();
  return <Text {...props} style={{ color: colors.foregroundColor, textAlign: 'center' }} />;
};

export const BlueFormLabel = props => {
  const { colors } = useTheme();

  return (
    <Text
      {...props}
      style={{
        color: colors.foregroundColor,
        fontWeight: '400',
        marginHorizontal: 20,
        writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
      }}
    />
  );
};

export const BlueFormMultiInput = props => {
  const { colors } = useTheme();

  return (
    <TextInput
      multiline
      underlineColorAndroid="transparent"
      numberOfLines={4}
      style={{
        paddingHorizontal: 8,
        paddingVertical: 16,
        flex: 1,
        marginTop: 5,
        marginHorizontal: 20,
        borderColor: colors.formBorder,
        borderBottomColor: colors.formBorder,
        borderWidth: 1,
        borderBottomWidth: 0.5,
        borderRadius: 4,
        backgroundColor: colors.inputBackgroundColor,
        color: colors.foregroundColor,
        textAlignVertical: 'top',
      }}
      autoCorrect={false}
      autoCapitalize="none"
      spellCheck={false}
      {...props}
      selectTextOnFocus={false}
      keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
    />
  );
};

export const BlueSpacing = props => {
  return <View {...props} style={{ height: 60 }} />;
};

export const BlueSpacing40 = props => {
  return <View {...props} style={{ height: 50 }} />;
};

export class is {
  static ipad() {
    return isIpad;
  }
}

export const BlueSpacing20 = props => {
  const { horizontal = false } = props;
  return <View {...props} style={{ height: horizontal ? 0 : 20, width: horizontal ? 20 : 0, opacity: 0 }} />;
};

export const BlueSpacing10 = props => {
  return <View {...props} style={{ height: 10, opacity: 0 }} />;
};

export const BlueLoading = props => {
  return (
    <View style={{ flex: 1, justifyContent: 'center' }} {...props}>
      <ActivityIndicator />
    </View>
  );
};

export function BlueBigCheckmark({ style = {} }) {
  const defaultStyles = {
    backgroundColor: '#ccddf9',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 0,
  };
  const mergedStyles = { ...defaultStyles, ...style };
  return (
    <View style={mergedStyles}>
      <Icon name="check" size={50} type="font-awesome" color="#0f5cc0" />
    </View>
  );
}
