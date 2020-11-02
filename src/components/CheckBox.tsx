import React, { ReactElement } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, TextStyle } from 'react-native';
import { CheckBox as CheckBoxNative } from 'react-native-elements';

import { icons } from 'app/assets';
import { palette } from 'app/styles';

import { Image } from './Image';

interface Props {
  checked: boolean;
  onPress: () => void;
  right?: boolean;
  left?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  title?: ReactElement | string;
}

export const CheckBox = ({ ...props }: Props) => (
  <CheckBoxNative
    checkedIcon={
      <View style={styles.checked}>
        <Image source={icons.tick} style={styles.icon} resizeMode="contain" />
      </View>
    }
    uncheckedIcon={<View style={styles.unchecked} />}
    {...props}
  />
);

const styles = StyleSheet.create({
  unchecked: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 2,
    borderColor: palette.border,
  },
  checked: {
    width: 20,
    height: 20,
    borderRadius: 2,
    backgroundColor: palette.textSecondary,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 12,
    height: 8,
  },
});

export default CheckBox;
