import dayjs from 'dayjs';
import React from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

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
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.outdatedRateContainer}>
      <Animated.View style={[styles.warningBadgeWrapper, { opacity: pulseAnim }]}>
        <Badge badgeStyle={styles.warningBadge} />
      </Animated.View>
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
  warningBadgeWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningBadge: {
    width: 10,
    height: 10,
    minHeight: 10,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 999,
    backgroundColor: '#fc990e',
    overflow: 'hidden',
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
