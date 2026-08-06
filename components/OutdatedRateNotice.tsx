import dayjs from 'dayjs';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import Badge from './Badge';
import BlueText from './BlueText';
import Icon from './Icon';
import { useTheme } from './themes';
import loc from '../loc';

type OutdatedRateNoticeProps = {
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
};

const OutdatedRateNotice: React.FC<OutdatedRateNoticeProps> = ({ lastUpdated, onRefresh, isRefreshing = false }) => {
  const { colors } = useTheme();

  if (!lastUpdated) {
    return null;
  }

  return (
    <View style={styles.outdatedRateContainer}>
      <Badge badgeStyle={styles.warningBadge} />
      <View style={styles.spacing8} />
      <BlueText>{loc.formatString(loc.send.outdated_rate, { date: dayjs(lastUpdated).format('l LT') })}</BlueText>
      <View style={styles.spacing8} />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.refresh}
        onPress={onRefresh}
        disabled={isRefreshing}
        style={isRefreshing ? styles.disabledButton : undefined}
      >
        <Icon name="arrows-rotate" type="font-awesome-6" size={16} color={colors.buttonAlternativeTextColor} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  spacing8: {
    width: 8,
  },
  warningBadge: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#fc990e',
  },
  disabledButton: {
    opacity: 0.5,
  },
  outdatedRateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
});

export default OutdatedRateNotice;
