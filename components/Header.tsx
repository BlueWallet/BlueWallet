import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './themes';
import AddWalletButton from './AddWalletButton';
import SettingsButton from './icons/SettingsButton';
import Icon from './Icon';

interface HeaderProps {
  leftText: string;
  isDrawerList?: boolean;
  onNewWalletPress?: () => void;
  onSettingsPress?: () => void;
  onManageWalletsPress?: () => void;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  leftText,
  isDrawerList,
  onNewWalletPress,
  onSettingsPress,
  onManageWalletsPress,
  onBackPress,
}) => {
  const { colors } = useTheme();
  const styleWithProps = StyleSheet.create({
    root: {
      backgroundColor: isDrawerList ? colors.elevated : colors.background,
      borderTopColor: isDrawerList ? colors.elevated : colors.background,
      borderBottomColor: isDrawerList ? colors.elevated : colors.background,
    },
    text: {
      color: colors.foregroundColor,
    },
  });

  return (
    <View style={[styles.root, styleWithProps.root]}>
      {onBackPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={leftText} onPress={onBackPress} style={styles.backButton}>
          <Icon name="chevron-left" type="material" size={28} color={colors.foregroundColor} />
          <Text style={[styles.text, styleWithProps.text]}>{leftText}</Text>
        </Pressable>
      ) : (
        <Text style={[styles.text, styleWithProps.text]}>{leftText}</Text>
      )}
      <View style={styles.actions}>
        {onNewWalletPress && <AddWalletButton onPress={onNewWalletPress} />}
        {onSettingsPress && onManageWalletsPress && <SettingsButton onPress={onSettingsPress} onManageWalletPress={onManageWalletsPress} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  text: {
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: 34,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
});
