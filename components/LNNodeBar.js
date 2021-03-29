import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import loc from '../loc';
import PropTypes from 'prop-types';

export const LNNodeBar = props => {
  const { canReceive = 0, canSend = 0, nodeAlias = '', disabled = false } = props;
  const opacity = { opacity: disabled ? 0.28 : 1.0 };
  const canReceiveBarFlex = { flex: canReceive > 0 && canSend > 0 ? Math.abs((canReceive - canSend) / (canReceive + canSend)) * 1.0 : 1.0 };
  return (
    <View style={[styles.root, opacity]}>
      {nodeAlias.trim().length > 0 && <Text style={styles.nodeAlias}>{nodeAlias}</Text>}
      <View style={styles.canSendBar}>
        <View style={styles.fullFlexDirectionRow}>
          <View style={[styles.canReceiveBar, canReceiveBarFlex]} />
        </View>
      </View>

      <View style={styles.containerBottomText}>
        <View style={styles.containerBottomLeftText}>
          <Text style={styles.titleText}>{loc.lnd.can_receive.toUpperCase()}</Text>
          <Text style={styles.canReceive}>{canReceive}</Text>
        </View>
        <View style={styles.containerBottomRightText}>
          <Text style={styles.titleText}>{loc.lnd.can_send.toUpperCase()}</Text>
          <Text style={styles.canSend}>{canSend}</Text>
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
    color: '#022553',
    marginVertical: 16,
  },
  canSendBar: {
    flex: 1,
    height: 14,
    maxHeight: 14,
    backgroundColor: '#4E6CF5',
    borderRadius: 6,
  },
  canReceiveBar: { backgroundColor: '#57B996', borderRadius: 6 },
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
    textAlign: 'left',
  },
  canSend: {
    color: '#4E6CF5',
    textAlign: 'right',
  },
});
