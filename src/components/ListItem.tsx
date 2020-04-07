import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { palette, typography } from 'styles';
import { Image, FastImageSource } from './Image';
import { StyledSwitch } from './StyledSwitch';

interface Props {
  title: string;
  source: FastImageSource;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
}

export const ListItem = ({ title, source, onSwitchValueChange, switchValue }: Props) => (
  <View style={styles.container}>
    {!!source && <Image source={source} style={styles.image} />}
    <View style={styles.textContainer}>
      <Text style={styles.title}>{title}</Text>
    </View>
    {!!switchValue && (
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
    paddingVertical: 16,
    paddingHorizontal: 12,
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
  switchContainer: {
    flexGrow: 1,
  },
});
