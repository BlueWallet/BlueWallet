import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, TextStyle, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import BlueText from './BlueText';
import Icon from './Icon';
import TransactionIncomingIcon from './icons/TransactionIncomingIcon';
import TransactionOutgoingIcon from './icons/TransactionOutgoingIcon';
import loc from '../loc';

type TransactionDirection = 'sent' | 'received';

const ICON_BOX_SIZE = 30;
const EXPAND_ICON_SIZE = 20;
const EXPAND_ANIMATION_DURATION = 280;

interface TransactionStateHeaderProps {
  direction: TransactionDirection;
  confirmations: number;
  isOnChainTx: boolean;
  isExpanded?: boolean;
  onPress?: () => void;
  labelStyle: StyleProp<TextStyle>;
  valueStyle: StyleProp<TextStyle>;
  accentColor: string;
}

interface ExpandChevronProps {
  isExpanded: boolean;
  color: string;
}

const ExpandChevron: React.FC<ExpandChevronProps> = ({ isExpanded, color }) => {
  const expandProgress = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    expandProgress.value = withTiming(isExpanded ? 1 : 0, {
      duration: EXPAND_ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [expandProgress, isExpanded]);

  const expandIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${expandProgress.value * 180}deg` }],
  }));

  return (
    <Animated.View style={[styles.iconBox, expandIconStyle]}>
      <Icon name="chevron-down" type="ionicons" size={EXPAND_ICON_SIZE} color={color} />
    </Animated.View>
  );
};

const TransactionStateHeader: React.FC<TransactionStateHeaderProps> = ({
  direction,
  confirmations,
  isOnChainTx,
  isExpanded = false,
  onPress,
  labelStyle,
  valueStyle,
  accentColor,
}) => {
  const DirectionIcon = direction === 'sent' ? TransactionOutgoingIcon : TransactionIncomingIcon;
  const label = direction === 'sent' ? loc.transactions.details_sent : loc.transactions.details_received;
  const displayConfirmations = !Number.isFinite(confirmations) || confirmations <= 0 ? null : confirmations > 6 ? '6+' : confirmations;

  const content = (
    <>
      <View style={styles.iconBox}>
        <DirectionIcon />
      </View>
      <View style={styles.stateLabelContainer}>
        <BlueText style={[styles.stateLabel, labelStyle]}>{label}</BlueText>
        {isOnChainTx && displayConfirmations !== null && (
          <BlueText style={[styles.stateValue, valueStyle]}>
            {loc.formatString(loc.transactions.confirmations_lowercase, { confirmations: displayConfirmations })}
          </BlueText>
        )}
      </View>
      {onPress && <ExpandChevron isExpanded={isExpanded} color={accentColor} />}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.stateHeaderRow}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.stateHeaderRow}>{content}</View>;
};

const styles = StyleSheet.create({
  stateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconBox: {
    width: ICON_BOX_SIZE,
    height: ICON_BOX_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateLabelContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginHorizontal: 8,
    flex: 1,
    minWidth: 0,
  },
  stateLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 0,
  },
  stateValue: {
    fontSize: 13,
    marginBottom: 0,
    marginTop: 0,
  },
});

export default TransactionStateHeader;
