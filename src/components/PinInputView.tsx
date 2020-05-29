import React, { Component } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';

import { icons } from 'app/assets';
import { palette, typography, ifIphoneX } from 'app/styles';

type Props = {
  onTextChange: (number: string) => void;
  onClearPress: () => void;
  value: string;
};

export class PinInputView extends Component<Props> {
  renderNumbersButtons(numbers: string[]) {
    return numbers.map((number: string, index: number) =>
      !number ? (
        <View style={styles.dummyFill} />
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.buttonContainer}
          key={index.toString()}
          onPress={() => {
            number === 'x' ? this.props.onClearPress() : this.props.onTextChange(number);
          }}
        >
          {number === 'x' ? (
            <Image source={icons.delete} style={styles.clearIcon} resizeMode="contain" />
          ) : (
            <Text style={typography.subtitle5}>{number}</Text>
          )}
        </TouchableOpacity>
      ),
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.numberRow}>{this.renderNumbersButtons(['1', '2', '3'])}</View>
        <View style={styles.numberRow}>{this.renderNumbersButtons(['4', '5', '6'])}</View>
        <View style={styles.numberRow}>{this.renderNumbersButtons(['7', '8', '9'])}</View>
        <View style={styles.numberRow}>{this.renderNumbersButtons(['', '0', 'x'])}</View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    height: '35%',
    width: '100%',
    backgroundColor: palette.grey,
    padding: 3,
    paddingBottom: ifIphoneX(50, 16),
  },
  numberRow: {
    flex: 1,
    flexDirection: 'row',
    marginVertical: 4,
  },
  buttonContainer: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 7,
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.7,
    shadowColor: palette.textGrey,
    shadowOffset: { height: 1, width: StyleSheet.hairlineWidth },
    elevation: 3,
  },
  dummyFill: { flex: 1, marginHorizontal: 4, height: '100%' },
  clearIcon: { height: 20 },
});
