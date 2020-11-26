import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { CheckBox as CheckBoxNative, Text } from 'react-native-elements';

import { icons } from 'app/assets';
import { palette, typography } from 'app/styles';

interface Props<T> {
  title: string;
  subtitle: string;
  value: T;
  checked: boolean;
  onPress?: (value: T) => void;
  testID?: string;
}

const RadioButtonCheckedIcon = () => (
  <View>
    <Image source={icons.radioButtonChecked} style={styles.radioButtonIcon} resizeMode="contain" />
  </View>
);

const RadioButtonUncheckedIcon = () => (
  <View>
    <Image source={icons.radioButtonUnchecked} style={styles.radioButtonIcon} resizeMode="contain" />
  </View>
);

export const RadioButton = <T extends unknown>(props: Props<T>) => {
  const onPressHandler = () => {
    props.onPress && props.onPress(props.value);
  };

  const renderTitle = (title: string, subtitle: string) => (
    <View style={styles.radioButtonContent}>
      <Text style={styles.radioButtonTitle}>{title}</Text>
      <Text style={styles.radioButtonSubtitle}>{subtitle}</Text>
    </View>
  );

  return (
    <CheckBoxNative
      title={renderTitle(props.title, props.subtitle)}
      checked={props.checked}
      containerStyle={styles.containerStyle}
      wrapperStyle={styles.wrapperStyle}
      checkedIcon={RadioButtonCheckedIcon()}
      uncheckedIcon={RadioButtonUncheckedIcon()}
      onPress={onPressHandler}
      // @ts-ignore - It works but testID is missing in type definitions of CheckBoxNative component
      testID={props.testID}
    />
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    backgroundColor: palette.white,
    borderWidth: 0,
    alignContent: 'center',
    marginLeft: 0,
    paddingTop: 0,
    paddingLeft: 0,
    paddingBottom: 0,
  },
  wrapperStyle: {
    alignItems: 'flex-start',
  },
  radioButtonContent: {
    paddingStart: 10,
  },
  radioButtonTitle: {
    ...typography.caption,
    marginBottom: 2,
  },
  radioButtonSubtitle: {
    ...typography.overline,
    color: palette.textGrey,
    fontSize: 13,
  },
  radioButtonIcon: {
    width: 20,
    height: 20,
  },
});

export default RadioButton;
