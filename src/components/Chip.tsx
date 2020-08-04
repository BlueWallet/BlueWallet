import React from 'react';
import { StyleSheet, View, StyleProp, TextStyle, ViewStyle } from 'react-native';

import { palette, typography } from 'app/styles';

import { Text } from './Text';

interface Props {
  label: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export class Chip extends React.PureComponent<Props> {
  render() {
    return (
      <View style={[styles.container, this.props.containerStyle]}>
        <Text style={[styles.label, this.props.textStyle]}>{this.props.label}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    backgroundColor: palette.backgroundDarker,
    borderRadius: 4,
  },
  label: {
    ...typography.headline5,
    lineHeight: 32,
    textAlign: 'center',
  },
});
