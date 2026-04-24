import React, { useCallback, useMemo } from 'react';
import { StyleSheet, GestureResponderEvent, View } from 'react-native';
import Icon from './Icon';
import { useTheme } from './themes';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import loc from '../loc';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';

type AddWalletButtonProps = {
  onPress?: (event: GestureResponderEvent) => void;
};

const AddWalletButton: React.FC<AddWalletButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const navigation = useExtendedNavigation();

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
      onPress={onPress}
      buttonStyle={[styles.ball, { backgroundColor: colors.buttonBackgroundColor }]}
      accessibilityRole="button"
      accessibilityLabel={loc.wallets.add_title}
      onPressMenuItem={onPressMenuItem}
      actions={actions}
      shouldOpenOnLongPress
    >
      <View style={styles.iconContainer}>
        <Icon name="add" size={22} type="material" color={colors.foregroundColor} />
      </View>
    </ToolTipMenu>
  );
};

export default AddWalletButton;

const styles = StyleSheet.create({
  ball: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
