import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Icon, { FontAwesomeIconName } from '../Icon';
import { useTheme } from '../themes';
import TransactionExpiredIcon from './TransactionExpiredIcon';
import TransactionIncomingIcon from './TransactionIncomingIcon';
import TransactionOutgoingIcon from './TransactionOutgoingIcon';
import TransactionPendingIcon from './TransactionPendingIcon';

const BADGE_SIZE = 18;
const BADGE_ICON_SIZE = 10;
const BADGE_OFFSET = -4;

const LIGHTNING_BADGE_PATH =
  'M87.449 0C86.1496 0 84.8502 0.55814 83.7364 1.48837L20.8077 57.8605C19.1371 59.3488 18.5802 61.7674 19.3227 64C20.0652 66.2326 22.2928 67.5349 24.5203 67.5349H45.3109L26.7479 112.372C25.8197 114.791 26.5623 117.581 28.6042 119.07C29.5324 119.814 30.6461 120 31.7599 120C33.0593 120 34.5444 119.442 35.4725 118.512L99.1437 60.2791C100.257 59.3488 101 57.6744 101 56C101 52.8372 98.5868 50.4186 95.4311 50.4186V50.4186H75.0118L92.6466 7.62791C93.5748 5.2093 92.8323 2.4186 90.7903 0.930233C89.6766 0.372093 88.5628 0 87.449 0V0Z';

const styles = StyleSheet.create({
  badgedContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    right: BADGE_OFFSET,
    bottom: BADGE_OFFSET,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onchainBox: {
    position: 'relative',
  },
  onchainBall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    transform: [{ rotate: '-45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export type TransactionListIconVariant =
  | 'pending'
  | 'incoming'
  | 'outgoing'
  | 'expired'
  | 'onchain'
  | 'lightning-incoming'
  | 'lightning-outgoing'
  | 'refill';

export type TransactionListIconRow = {
  type?: string;
  value?: number;
  confirmations?: number;
  category?: string;
  timestamp?: number;
  expire_time?: number;
  ispaid?: boolean;
};

export type ResolveTransactionListIconParams = {
  item: TransactionListIconRow;
  arkRowKind?: 'Lightning' | 'Refill';
  isPendingRefill: boolean;
};

export function resolveTransactionListIconVariant({
  item,
  arkRowKind,
  isPendingRefill,
}: ResolveTransactionListIconParams): TransactionListIconVariant {
  if (isPendingRefill) return 'pending';

  if (item.category === 'receive' && item.confirmations! < 3) return 'pending';

  if (arkRowKind === 'Refill') return 'refill';

  if (arkRowKind === 'Lightning' && item.type === 'bitcoind_tx') {
    return item.value! < 0 ? 'lightning-outgoing' : 'lightning-incoming';
  }

  if (item.type === 'bitcoind_tx') return 'onchain';

  if (item.type === 'paid_invoice') return 'lightning-outgoing';

  if (item.type === 'user_invoice' || item.type === 'payment_request') {
    const now = (Date.now() / 1000) | 0; // eslint-disable-line no-bitwise
    const timestamp = item.timestamp ?? 0;
    const expireTime = item.expire_time ?? 0;
    const invoiceExpiration = timestamp + expireTime;
    if (!item.ispaid && invoiceExpiration < now) return 'expired';
    if (!item.ispaid) return 'pending';
    return 'lightning-incoming';
  }

  if (!item.confirmations) return 'pending';
  return item.value! < 0 ? 'outgoing' : 'incoming';
}

type BadgeKind = 'lightning' | 'plus';

const LightningBadge: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={10} height={10} viewBox="0 0 120 120" fill="none">
    <Path d={LIGHTNING_BADGE_PATH} fill={color} />
  </Svg>
);

const BadgedBaseIcon: React.FC<{
  direction: 'incoming' | 'outgoing';
  badge: BadgeKind;
}> = ({ direction, badge }) => {
  const { colors } = useTheme();
  const isIncoming = direction === 'incoming';
  const badgeBackgroundColor = isIncoming ? colors.incomingForegroundColor : colors.outgoingForegroundColor;

  const stylesHook = StyleSheet.create({
    badge: {
      backgroundColor: badgeBackgroundColor,
      borderColor: colors.background,
    },
  });

  return (
    <View style={styles.badgedContainer}>
      {isIncoming ? <TransactionIncomingIcon /> : <TransactionOutgoingIcon />}
      <View style={[styles.badge, stylesHook.badge]}>
        {badge === 'lightning' ? (
          <LightningBadge color={colors.background} />
        ) : (
          <Icon name="plus" size={BADGE_ICON_SIZE} type="font-awesome" color={colors.background} />
        )}
      </View>
    </View>
  );
};

const OnchainIcon: React.FC = () => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    onchainBall: {
      backgroundColor: colors.ballReceive,
    },
  });

  return (
    <View style={styles.onchainBox}>
      <View style={[styles.onchainBall, stylesHook.onchainBall]}>
        <Icon name={'link' as FontAwesomeIconName} size={16} type="font-awesome" color={colors.incomingForegroundColor} />
      </View>
    </View>
  );
};

type TransactionListIconProps = {
  variant: TransactionListIconVariant;
};

const TransactionListIcon: React.FC<TransactionListIconProps> = ({ variant }) => {
  switch (variant) {
    case 'pending':
      return <TransactionPendingIcon />;
    case 'incoming':
      return <TransactionIncomingIcon />;
    case 'outgoing':
      return <TransactionOutgoingIcon />;
    case 'expired':
      return <TransactionExpiredIcon />;
    case 'onchain':
      return <OnchainIcon />;
    case 'lightning-incoming':
      return <BadgedBaseIcon direction="incoming" badge="lightning" />;
    case 'lightning-outgoing':
      return <BadgedBaseIcon direction="outgoing" badge="lightning" />;
    case 'refill':
      return <BadgedBaseIcon direction="incoming" badge="plus" />;
    default:
      return null;
  }
};

export default TransactionListIcon;
