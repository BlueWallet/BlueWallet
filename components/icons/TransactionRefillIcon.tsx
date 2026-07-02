import React from 'react';
import TransactionBadgedIcon from './TransactionBadgedIcon';
import TransactionIncomingIcon from './TransactionIncomingIcon';
import { useTheme } from '../themes';

const TransactionRefillIcon: React.FC = () => {
  const { colors } = useTheme();

  return (
    <TransactionBadgedIcon
      badgeName="plus"
      badgeBackgroundColor={colors.incomingForegroundColor}
      badgeForegroundColor={colors.background}
    >
      <TransactionIncomingIcon />
    </TransactionBadgedIcon>
  );
};

export default TransactionRefillIcon;
