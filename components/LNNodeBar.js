import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import loc from '../loc';

export const LNNodeBar = props => {
  return (
    <View style={styles.root}>
      <View style={styles.canSendBar}>
        <View style={styles.fullFlexDirectionRow}>
          <View style={styles.canReceiveBar} />
        </View>
      </View>

      <View style={styles.containerBottomText}>
        <View style={styles.containerBottomLeftText}>
          <Text style={styles.titleText}>{loc.lnd.can_receive.toUpperCase()}</Text>
          <Text style={styles.canReceive}>650 000</Text>
        </View>
        <View style={styles.containerBottomRightText}>
          <Text style={styles.titleText}>{loc.lnd.can_send.toUpperCase()}</Text>
          <Text style={styles.canSend}>350 000</Text>
        </View>
      </View>
    </View>
  );
};

export default LNNodeBar;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  containerBottomText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  canSendBar: {
    flex: 1,
    height: 14,
    maxHeight: 14,
    backgroundColor: '#4E6CF5',
    borderRadius: 6,
  },
  canReceiveBar: { flex: 0.9, backgroundColor: '#57B996', borderRadius: 6 },
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
