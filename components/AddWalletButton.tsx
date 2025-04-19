import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, GestureResponderEvent } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
    <ToolTipMenu accessibilityRole="button" accessibilityLabel={loc.wallets.add_title} onPressMenuItem={onPressMenuItem} actions={actions}>
      <TouchableOpacity style={[styles.ball, stylesHook.ball]} onPress={onPress}>
        <Ionicons name="add" size={22} color={colors.foregroundColor} />
      </TouchableOpacity>
    </ToolTipMenu>
  );
};

export default AddWalletButton;
