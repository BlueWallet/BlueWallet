import React, { useCallback, useMemo } from 'react';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import MoreOptionsButton from './MoreOptionsButton';

const SettingsButton = () => {
  const { navigate } = useExtendedNavigation();
  const onPress = () => {
    navigate('Settings');
  };

  const onPressMenuItem = useCallback(
    (menuItem: string) => {
      switch (menuItem) {
        case CommonToolTipActions.ManageWallet.id:
          navigate('ManageWallets');
          break;
        default:
          break;
      }
    },
    [navigate],
  );

  const actions = useMemo(() => [CommonToolTipActions.ManageWallet], []);
  return (
    <MoreOptionsButton
      isMenuPrimaryAction={false}
      onPress={onPress}
      onPressMenuItem={onPressMenuItem}
      actions={actions}
      testID="SettingsButton"
    />
  );
};

export default SettingsButton;
