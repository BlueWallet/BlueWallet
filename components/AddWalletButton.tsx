import React, { useCallback, useMemo } from 'react';
import { StyleSheet, GestureResponderEvent } from 'react-native';
import { Icon } from '@rneui/themed';
import { useTheme } from './themes';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import loc from '../loc';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';

type AddWalletButtonProps = {
  onPress?: (event: GestureResponderEvent) => void;
};

const styles = StyleSheet.create({
  ball: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignContent: 'center',
  },
});

const AddWalletButton: React.FC<AddWalletButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const navigation = useExtendedNavigation();
  const stylesHook = StyleSheet.create({
    ball: {
      backgroundColor: colors.buttonBackgroundColor,
    },
  });

  const onPressMenuItem = useCallback(
    (action: string) => {
      switch (action) {
        case CommonToolTipActions.ImportWallet.id:
          navigation.navigate('AddWalletRoot', { screen: 'ImportWallet' });
          break;
        default:
          break;
      }
    },
    [navigation],
  );

  const actions = useMemo(() => [CommonToolTipActions.ImportWallet], []);

  return (
    <ToolTipMenu
      isButton
      onPress={(event: GestureResponderEvent) => {
        onPress?.(event);
      }}
      buttonStyle={[styles.ball, stylesHook.ball]}
      accessibilityRole="button"
      accessibilityLabel={loc.wallets.add_title}
      onPressMenuItem={onPressMenuItem}
      actions={actions}
      shouldOpenOnLongPress
    >
      <Icon name="add" size={22} type="ionicons" color={colors.foregroundColor} />
    </ToolTipMenu>
  );
};

export default AddWalletButton;
