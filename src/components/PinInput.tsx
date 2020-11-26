import React, { PureComponent } from 'react';
import { StyleSheet, View } from 'react-native';
import { CodeField } from 'react-native-confirmation-code-field';

import { CONST } from 'app/consts';
import { noop } from 'app/helpers/helpers';
import { palette } from 'app/styles';

interface Props {
  value: string;
  testID?: string;
  onTextChange: (pin: string) => void;
}

export class PinInput extends PureComponent<Props> {
  codeFieldRef = React.createRef<any>();
  unsubscribeFocusListener: Function = noop;

  componentDidMount() {
    setTimeout(() => {
      this.focus();
    });
  }

  focus = () => {
    this.codeFieldRef.current?.focus();
  };

  render() {
    return (
      <CodeField
        ref={this.codeFieldRef}
        autoFocus
        value={this.props.value}
        testID={this.props.testID}
        cellCount={CONST.pinCodeLength}
        onChangeText={text => this.props.onTextChange(text.replace(/\D/g, ''))}
        rootStyle={styles.container}
        keyboardType="number-pad"
        renderCell={({ index, symbol, isFocused }) => (
          <View key={index.toString()} style={[styles.cell, isFocused && styles.cellFocused]}>
            {!!symbol && <View style={styles.cellMask} />}
          </View>
        )}
      />
    );
  }
}
const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  cell: {
    borderBottomWidth: 1,
    borderColor: palette.textGrey,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  cellFocused: {
    borderColor: palette.secondary,
  },
  cellMask: {
    width: 13,
    height: 13,
    borderRadius: 25,
    backgroundColor: palette.textBlack,
  },
});
