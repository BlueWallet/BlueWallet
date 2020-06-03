import React from 'react';
import { StyleSheet, View, StyleProp, TextStyle } from 'react-native';

import { palette, typography } from 'app/styles';

import { Text } from './Text';

interface Props {
  label: string;
  textStyle?: StyleProp<TextStyle>;
}

export class Chip extends React.PureComponent<Props> {
  render() {
    return (
      <View style={styles.container}>
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
    marginEnd: 16,
    marginBottom: 16,
  },
  label: {
    ...typography.headline5,
    lineHeight: 32,
    textAlign: 'center',
  },
});
