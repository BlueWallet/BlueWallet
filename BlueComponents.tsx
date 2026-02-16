import { useLocale } from '@react-navigation/native';
import React, { forwardRef } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import Icon from './components/Icon';
import { useTheme } from './components/themes';

const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
const isIpad = aspectRatio <= 1.6;

interface BlueButtonLinkProps extends PressableProps {
  title: string;
}

export const BlueButtonLink = forwardRef<React.ElementRef<typeof Pressable>, BlueButtonLinkProps>((props, ref) => {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.blueButtonLink, pressed && styles.pressed]} {...props} ref={ref}>
      <Text style={[styles.blueButtonLinkText, { color: colors.foregroundColor }]}>{props.title}</Text>
    </Pressable>
  );
});

export const BlueCard: React.FC<ViewProps> = props => {
  return <View {...props} style={styles.blueCard} />;
};

interface BlueTextProps extends TextProps {
  bold?: boolean;
  h1?: boolean;
  h2?: boolean;
  h3?: boolean;
  h4?: boolean;
}

export const BlueText: React.FC<BlueTextProps> = ({ bold = false, h1, h2, h3, h4, ...props }) => {
  const { colors } = useTheme();
  const { direction } = useLocale();

  let headingStyle = {};
  if (h1) {
    headingStyle = styles.h1;
  } else if (h2) {
    headingStyle = styles.h2;
  } else if (h3) {
    headingStyle = styles.h3;
  } else if (h4) {
    headingStyle = styles.h4;
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
  return <Text style={style} {...props} />;
};

export const BlueTextCentered: React.FC<TextProps> = props => {
  const { colors } = useTheme();
  return <Text {...props} style={[styles.blueTextCentered, { color: colors.foregroundColor }]} />;
};

export const BlueFormLabel: React.FC<TextProps> = props => {
  const { colors } = useTheme();
  const { direction } = useLocale();

  return <Text {...props} style={[styles.blueFormLabel, { color: colors.foregroundColor, writingDirection: direction }]} />;
};

export const BlueFormMultiInput: React.FC<TextInputProps> = props => {
  const { colors } = useTheme();

  return (
    <TextInput
      multiline
      underlineColorAndroid="transparent"
      numberOfLines={4}
      editable={!props.editable}
      style={[
        styles.blueFormMultiInput,
        {
          borderColor: colors.formBorder,
          borderBottomColor: colors.formBorder,
          backgroundColor: colors.inputBackgroundColor,
          color: colors.foregroundColor,
        },
      ]}
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

interface BlueBigCheckmarkProps {
  style?: StyleProp<ViewStyle>;
}

export function BlueBigCheckmark({ style }: BlueBigCheckmarkProps) {
  const mergedStyles = [styles.checkmarkContainer, style];
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
  blueButtonLinkText: {
    textAlign: 'center',
    fontSize: 16,
  },
  blueCard: {
    padding: 20,
  },
  h1: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 34,
    fontWeight: 'bold',
  },
  h3: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  h4: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  blueTextCentered: {
    textAlign: 'center',
  },
  blueFormLabel: {
    fontWeight: '400',
    marginHorizontal: 20,
  },
  blueFormMultiInput: {
    paddingHorizontal: 8,
    paddingVertical: 16,
    flex: 1,
    marginTop: 5,
    marginHorizontal: 20,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    borderRadius: 4,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.6,
  },
  checkmarkContainer: {
    backgroundColor: '#ccddf9',
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
