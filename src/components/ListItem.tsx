import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';

import { palette, typography } from 'app/styles';

import { Image, FastImageSource } from './Image';
import { StyledSwitch } from './StyledSwitch';

interface Props {
  title: string;
  source: FastImageSource;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  iconWidth?: number;
  iconHeight?: number;
}

export const ListItem = ({ title, source, onSwitchValueChange, switchValue, iconWidth, iconHeight }: Props) => (
  <View style={styles.container}>
    <View style={styles.imageContainer}>
      <Image
        source={source}
        style={[
          styles.image,
          typeof iconWidth === 'number' && { width: iconWidth },
          typeof iconHeight === 'number' && { height: iconHeight },
        ]}
      />
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.title}>{title}</Text>
    </View>
    {typeof switchValue === 'boolean' && (
      <View style={styles.switchContainer}>
        <StyledSwitch onValueChange={onSwitchValueChange} value={switchValue} />
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
  },
  textContainer: {
    paddingLeft: 20,
  },
  title: {
    ...typography.caption,
    color: palette.textBlack,
  },
  image: {
    width: 19,
    height: 19,
  },
  imageContainer: {
    width: 21,
    height: 21,
  },
  switchContainer: {
    flexGrow: 1,
  },
});
