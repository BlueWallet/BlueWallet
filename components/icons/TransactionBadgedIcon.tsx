import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Icon, { FontAwesomeIconName } from '../Icon';
import { useTheme } from '../themes';

const BADGE_SIZE = 18;
const BADGE_ICON_SIZE = 8;
const BADGE_OFFSET = -6;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'flex-start',
    overflow: 'visible',
  } as ViewStyle,
  badge: {
    position: 'absolute',
    right: BADGE_OFFSET,
    bottom: BADGE_OFFSET,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
});

type TransactionBadgedIconProps = {
  children: React.ReactNode;
  badgeBackgroundColor: string;
  badgeForegroundColor?: string;
  badgeName?: FontAwesomeIconName;
  badgeContent?: React.ReactNode;
};

const TransactionBadgedIcon: React.FC<TransactionBadgedIconProps> = ({
  children,
  badgeBackgroundColor,
  badgeForegroundColor,
  badgeName,
  badgeContent,
}) => {
  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    badge: {
      backgroundColor: badgeBackgroundColor,
      borderColor: colors.background,
    },
  });

  return (
    <View style={styles.container}>
      {children}
      <View style={[styles.badge, stylesHook.badge]}>
        {badgeContent ?? (badgeName && badgeForegroundColor ? <Icon name={badgeName} size={BADGE_ICON_SIZE} type="font-awesome" color={badgeForegroundColor} /> : null)}
      </View>
    </View>
  );
};

export default TransactionBadgedIcon;
