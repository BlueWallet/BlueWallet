import { StackNavigationProp } from '@react-navigation/stack';
import React, { PureComponent } from 'react';
import { StyleSheet, View } from 'react-native';
import { CodeField } from 'react-native-confirmation-code-field';

import { CONST, MainCardStackNavigatorParams, Route } from 'app/consts';
import { noop } from 'app/helpers/helpers';
import { palette } from 'app/styles';

type NavigationType =
  | StackNavigationProp<MainCardStackNavigatorParams, Route.CreatePin>
  | StackNavigationProp<MainCardStackNavigatorParams, Route.CurrentPin>;

interface Props {
  value: string;
  onTextChange: (pin: string) => void;
  navigation: NavigationType;
}

export class PinInput extends PureComponent<Props> {
  codeFieldRef = React.createRef<any>();
  unsubscribeFocusListener: Function = noop;

  componentDidMount() {
    // workaround for autoFocus prop issues
    this.unsubscribeFocusListener = this.props.navigation.addListener('focus', () => {
      setTimeout(() => {
        this.focus();
      }, 500);
    });
  }

  componentWillUnmount() {
    this.unsubscribeFocusListener();
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
