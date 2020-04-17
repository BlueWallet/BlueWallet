import React from 'react';
import { StyleSheet, View } from 'react-native';

import { palette, typography } from 'app/styles';

import { Text } from './Text';

interface Props {
  label: string;
}

export class Chip extends React.PureComponent<Props> {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{this.props.label}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    paddingHorizontal: 8,
    backgroundColor: palette.backgroundDarker,
    borderRadius: 4,
    marginEnd: 16,
    marginBottom: 16,
  },
  label: {
    ...typography.headline5,
    lineHeight: 32,
  },
});
