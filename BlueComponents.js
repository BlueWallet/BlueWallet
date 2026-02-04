/* eslint react/prop-types: "off", react-native/no-inline-styles: "off" */
import React, { forwardRef } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from './components/Icon';
import { useTheme } from './components/themes';
import { useLocale } from '@react-navigation/native';

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
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.blueButtonLink, pressed && styles.pressed]} {...props} ref={ref}>
      <Text style={{ color: colors.foregroundColor, textAlign: 'center', fontSize: 16 }}>{props.title}</Text>
    </Pressable>
  );
});

export const BlueCard = props => {
  return <View {...props} style={{ padding: 20 }} />;
};

export const BlueText = ({ bold = false, h1, h2, h3, h4, ...props }) => {
  const { colors } = useTheme();
  const { direction } = useLocale();

  // Determine heading styles based on h* props
  let headingStyle = {};
  if (h1) {
    headingStyle = { fontSize: 40, fontWeight: 'bold' };
  } else if (h2) {
    headingStyle = { fontSize: 34, fontWeight: 'bold' };
  } else if (h3) {
    headingStyle = { fontSize: 28, fontWeight: 'bold' };
  } else if (h4) {
    headingStyle = { fontSize: 22, fontWeight: 'bold' };
  }

  const hasHeading = h1 || h2 || h3 || h4;
  const style = StyleSheet.compose(
    {
      color: colors.foregroundColor,
      writingDirection: direction,
      fontWeight: hasHeading ? undefined : bold ? 'bold' : 'normal',
      ...headingStyle,
    },
    props.style,
  );
  return <Text {...props} style={style} />;
};

export const BlueTextCentered = props => {
  const { colors } = useTheme();
  return <Text {...props} style={{ color: colors.foregroundColor, textAlign: 'center' }} />;
};

export const BlueFormLabel = props => {
  const { colors } = useTheme();
  const { direction } = useLocale();

  return (
    <Text
      {...props}
      style={{
        color: colors.foregroundColor,
        fontWeight: '400',
        marginHorizontal: 20,
        writingDirection: direction,
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
      editable={!props.editable}
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

export class is {
  static ipad() {
    return isIpad;
  }
}

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

const styles = StyleSheet.create({
  blueButtonLink: {
    minWidth: 100,
    minHeight: 36,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
