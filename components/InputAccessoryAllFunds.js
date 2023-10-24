import React from 'react';
import PropTypes from 'prop-types';
import { Text } from 'react-native-elements';
import { InputAccessoryView, StyleSheet, Keyboard, Platform, View } from 'react-native';
import loc from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { BlueButtonLink } from '../BlueComponents';
import { useTheme } from './themes';

const InputAccessoryAllFunds = ({ balance, canUseAll, onUseAllPressed }) => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.inputBackgroundColor,
    },
    totalLabel: {
      color: colors.alternativeTextColor,
    },
    totalCanNot: {
      color: colors.alternativeTextColor,
    },
  });

  const inputView = (
    <View style={[styles.root, stylesHook.root]}>
      <View style={styles.left}>
        <Text style={[styles.totalLabel, stylesHook.totalLabel]}>{loc.send.input_total}</Text>
        {canUseAll ? (
          <BlueButtonLink onPress={onUseAllPressed} style={styles.totalCan} title={`${balance} ${BitcoinUnit.BTC}`} />
        ) : (
          <Text style={[styles.totalCanNot, stylesHook.totalCanNot]}>
            {balance} {BitcoinUnit.BTC}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <BlueButtonLink style={styles.done} title={loc.send.input_done} onPress={Keyboard.dismiss} />
      </View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return <InputAccessoryView nativeID={InputAccessoryAllFunds.InputAccessoryViewID}>{inputView}</InputAccessoryView>;
  }

  // androidPlaceholder View is needed to force shrink screen (KeyboardAvoidingView) where this component is used
  return (
    <>
      <View style={styles.androidPlaceholder} />
      <View style={styles.androidAbsolute}>{inputView}</View>
    </>
  );
};

InputAccessoryAllFunds.InputAccessoryViewID = 'useMaxInputAccessoryViewID';

InputAccessoryAllFunds.propTypes = {
  balance: PropTypes.string.isRequired,
  canUseAll: PropTypes.bool.isRequired,
  onUseAllPressed: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    maxHeight: 44,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  totalLabel: {
    fontSize: 16,
    marginLeft: 8,
    marginRight: 0,
    paddingRight: 0,
    paddingLeft: 0,
    paddingTop: 12,
    paddingBottom: 12,
  },
  totalCan: {
    marginLeft: 8,
    paddingRight: 0,
    paddingLeft: 0,
    paddingTop: 12,
    paddingBottom: 12,
  },
  totalCanNot: {
    fontSize: 16,
    marginLeft: 8,
    marginRight: 0,
    paddingRight: 0,
    paddingLeft: 0,
    paddingTop: 12,
    paddingBottom: 12,
  },
  right: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  done: {
    paddingRight: 8,
    paddingLeft: 0,
    paddingTop: 12,
    paddingBottom: 12,
  },
  androidPlaceholder: {
    height: 44,
  },
  androidAbsolute: {
    height: 44,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default InputAccessoryAllFunds;
