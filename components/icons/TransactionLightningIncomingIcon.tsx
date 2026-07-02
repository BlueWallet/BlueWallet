import React from 'react';
import LightningBadge from '../../img/wallet types/LightningBadge';
import TransactionBadgedIcon from './TransactionBadgedIcon';
import TransactionIncomingIcon from './TransactionIncomingIcon';
import { useTheme } from '../themes';

const TransactionLightningIncomingIcon: React.FC = () => {
  const { colors } = useTheme();

  return (
    <TransactionBadgedIcon
      badgeBackgroundColor={colors.incomingForegroundColor}
      badgeContent={<LightningBadge width={10} height={10} color={colors.background} />}
    >
      <TransactionIncomingIcon />
    </TransactionBadgedIcon>
  );
};

export default TransactionLightningIncomingIcon;
