import React, { useCallback, useMemo } from 'react';
import { StyleSheet, GestureResponderEvent, View } from 'react-native';
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    padding: 0,
    margin: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  icon: {
    padding: 0,
    margin: 0,
    lineHeight: 22,
    textAlignVertical: 'center',
    textAlign: 'center',
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
      <View style={styles.iconContainer}>
        <Icon name="add" size={22} type="ionicons" color={colors.foregroundColor} iconStyle={styles.icon} />
      </View>
    </ToolTipMenu>
  );
};

export default AddWalletButton;
