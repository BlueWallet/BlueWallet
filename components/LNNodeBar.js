import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import loc, { formatBalanceWithoutSuffix } from '../loc';
import PropTypes from 'prop-types';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { useTheme } from './themes';

export const LNNodeBar = props => {
  const { canReceive = 0, canSend = 0, nodeAlias = '', disabled = false, itemPriceUnit = BitcoinUnit.SATS } = props;
  const { colors } = useTheme();
  const opacity = { opacity: disabled ? 0.5 : 1.0 };
  const canSendBarFlex = {
    flex: canReceive > 0 && canSend > 0 ? Math.abs(canSend / (canReceive + canSend)) * 1.0 : 1.0,
  };
  const stylesHook = StyleSheet.create({
    nodeAlias: {
      color: colors.alternativeTextColor2,
    },
  });
  return (
    <View style={[styles.root, opacity]}>
      {nodeAlias.trim().length > 0 && <Text style={[styles.nodeAlias, stylesHook.nodeAlias]}>{nodeAlias}</Text>}
      <View style={styles.canReceiveBar}>
        <View style={styles.fullFlexDirectionRow}>
          <View style={[styles.canSendBar, canSendBarFlex]} />
        </View>
      </View>

      <View style={styles.containerBottomText}>
        <View style={styles.containerBottomRightText}>
          <Text style={styles.titleText}>{loc.lnd.can_send.toUpperCase()}</Text>
          <Text style={styles.canSend}>{formatBalanceWithoutSuffix(canSend, itemPriceUnit, true).toString()}</Text>
        </View>
        <View style={styles.containerBottomLeftText}>
          <Text style={styles.titleText}>{loc.lnd.can_receive.toUpperCase()}</Text>
          <Text style={styles.canReceive}>{formatBalanceWithoutSuffix(canReceive, itemPriceUnit, true).toString()}</Text>
        </View>
      </View>
    </View>
  );
};

export default LNNodeBar;

LNNodeBar.propTypes = {
  canReceive: PropTypes.number.isRequired,
  canSend: PropTypes.number.isRequired,
  nodeAlias: PropTypes.string,
  disabled: PropTypes.bool,
  itemPriceUnit: PropTypes.string,
};
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  containerBottomText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  nodeAlias: {
    marginVertical: 16,
  },
  canSendBar: {
    height: 14,
    maxHeight: 14,
    backgroundColor: '#4E6CF5',
    borderRadius: 6,
  },
  canReceiveBar: { backgroundColor: '#57B996', borderRadius: 6, height: 14, maxHeight: 14 },
  fullFlexDirectionRow: {
    flexDirection: 'row',
    flex: 1,
  },
  containerBottomLeftText: {},
  containerBottomRightText: {},
  titleText: {
    color: '#9AA0AA',
  },
  canReceive: {
    color: '#57B996',
    textAlign: 'right',
  },
  canSend: {
    color: '#4E6CF5',
    textAlign: 'left',
  },
});
