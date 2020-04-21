import React from 'react';
import { StyleSheet, View } from 'react-native';

import { palette, typography } from 'app/styles';

import { Text } from './Text';

const getInitials = (name: string): string => {
  const initials = name.match(/\b\w/g) || [];
  return ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
};

interface Props {
  name: string;
}

export class ContactAvatar extends React.PureComponent<Props> {
  render() {
    return (
      <View style={styles.wrapper}>
        <View style={styles.container}>
          <Text style={styles.initials}>{getInitials(this.props.name)}</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    width: 90,
    height: 90,
    borderRadius: 90,
    elevation: 1,
    backgroundColor: palette.background,
    shadowColor: palette.shadowLight,
    shadowOpacity: 1,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    ...typography.headline1,
    letterSpacing: 0.6,
    lineHeight: 46,
    color: palette.textBlack,
  },
});
