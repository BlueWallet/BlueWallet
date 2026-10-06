import React from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import BlueButtonLink from './BlueButtonLink';
import { KEYBOARD_ACCESSORY_BAR_HEIGHT } from './keyboardAccessory';
import { useTheme } from './themes';
import loc from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';

interface KeyboardAccessoryAllFundsProps {
  balance: string;
  canUseAll: boolean;
  onUseAllPressed: () => void;
}

/** Pure Total / All Funds + Done bar content for KeyboardAccessoryDock (chrome lives on the dock). */
const KeyboardAccessoryAllFunds: React.FC<KeyboardAccessoryAllFundsProps> = ({ balance, canUseAll, onUseAllPressed }) => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    totalLabel: {
      color: colors.alternativeTextColor,
    },
    totalCanNot: {
      color: colors.alternativeTextColor,
    },
  });

  return (
    <View style={styles.root}>
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
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    height: KEYBOARD_ACCESSORY_BAR_HEIGHT,
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
});

export default KeyboardAccessoryAllFunds;
