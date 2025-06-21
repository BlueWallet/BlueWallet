import React, { useCallback, useMemo } from 'react';
import { StyleSheet, GestureResponderEvent, Pressable } from 'react-native';
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
  pressed: {
    opacity: 0.6,
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
    <ToolTipMenu accessibilityRole="button" accessibilityLabel={loc.wallets.add_title} onPressMenuItem={onPressMenuItem} actions={actions}>
      <Pressable style={({ pressed }) => [pressed ? styles.pressed : null, styles.ball, stylesHook.ball]} onPress={onPress}>
        <Icon name="add" size={22} type="ionicons" color={colors.foregroundColor} />
      </Pressable>
    </ToolTipMenu>
  );
};

export default AddWalletButton;
