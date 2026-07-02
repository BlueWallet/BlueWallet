import React from 'react';
import LightningBadge from '../../img/wallet types/LightningBadge';
import TransactionBadgedIcon from './TransactionBadgedIcon';
import TransactionOutgoingIcon from './TransactionOutgoingIcon';
import { useTheme } from '../themes';

const TransactionLightningOutgoingIcon: React.FC = () => {
  const { colors } = useTheme();

  return (
    <TransactionBadgedIcon
      badgeBackgroundColor={colors.outgoingForegroundColor}
      badgeContent={<LightningBadge width={10} height={10} color={colors.background} />}
    >
      <TransactionOutgoingIcon />
    </TransactionBadgedIcon>
  );
};

export default TransactionLightningOutgoingIcon;
