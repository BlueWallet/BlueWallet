import React, { PureComponent } from 'react';
import { StyleSheet, View } from 'react-native';
// @ts-ignore
import ReactNativeSmoothPincodeInput from 'react-native-smooth-pincode-input';

import { CONST } from 'app/consts';
import { palette, typography } from 'app/styles';

interface Props {
  value: string;
  onTextChange: (pin: string) => void;
}
export class PinInput extends PureComponent<Props> {
  pinCodeRef = React.createRef();

  render() {
    return (
      <ReactNativeSmoothPincodeInput
        ref={this.pinCodeRef}
        password
        restrictToNumbers
        cellSpacing={10}
        cellSize={40}
        codeLength={CONST.pinCodeLength}
        autoFocus
        cellStyle={styles.cell}
        cellStyleFocused={styles.cellFocused}
        cellStyleFilled={styles.cell}
        textStyle={styles.text}
        animationFocused={''}
        textStyleFocused={styles.textFocused}
        mask={<View style={styles.cellMask} />}
        {...this.props}
      />
    );
  }
}
const styles = StyleSheet.create({
  cell: {
    borderBottomWidth: 1,
    borderColor: palette.textGrey,
  },
  cellFocused: {
    borderColor: palette.secondary,
  },
  text: {
    ...typography.headline4,
    color: palette.textBlack,
    lineHeight: 30,
  },
  textFocused: {
    color: palette.textBlack,
  },
  cellMask: {
    width: 13,
    height: 13,
    borderRadius: 25,
    backgroundColor: palette.textBlack,
  },
});
