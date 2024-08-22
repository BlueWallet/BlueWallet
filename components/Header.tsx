import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from './themes';
import AddWalletButton from './AddWalletButton';

interface HeaderProps {
  leftText: string;
  isDrawerList?: boolean;
  onNewWalletPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ leftText, isDrawerList, onNewWalletPress }) => {
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
      <Text style={[styles.text, styleWithProps.text]}>{leftText}</Text>
      {onNewWalletPress && <AddWalletButton onPress={onNewWalletPress} />}
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
});
