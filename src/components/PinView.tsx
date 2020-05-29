import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';

import { palette } from 'app/styles';

interface Props {
  value: string;
  length: number;
}

export class PinView extends Component<Props> {
  render() {
    const { value, length } = this.props;
    return (
      <View style={styles.container}>
        {[...Array(length)].map((el, index) => {
          const isFocused = !value[index] && (value[index - 1] || index === 0);
          const isFilled = value[index];
          return (
            <View
              key={index}
              style={[
                styles.valueContainer,
                {
                  borderBottomColor: isFocused ? palette.secondary : palette.textBlack,
                },
              ]}
            >
              {isFilled && <View style={styles.cellMask} />}
            </View>
          );
        })}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  valueContainer: {
    borderBottomWidth: 1,
    borderColor: palette.textGrey,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  cellMask: {
    width: 13,
    height: 13,
    borderRadius: 25,
    backgroundColor: palette.textBlack,
  },
});
