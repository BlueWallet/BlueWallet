import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@rneui/themed';
import { useLocale } from '@react-navigation/native';

import { useTheme } from './themes';

interface WalletToImportProp {
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}

const WalletToImport: React.FC<WalletToImportProp> = ({ title, subtitle, active, onPress }) => {
  const { colors } = useTheme();
  const { direction } = useLocale();

  const stylesHooks = StyleSheet.create({
    root: {
      borderColor: active ? colors.newBlue : colors.buttonDisabledBackgroundColor,
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    title: {
      color: colors.newBlue,
      writingDirection: direction,
    },
    subtitle: {
      color: colors.alternativeTextColor,
      writingDirection: direction,
    },
  });

  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress}>
      <View style={[styles.root, stylesHooks.root]}>
        <Text style={[styles.title, stylesHooks.title]}>{title}</Text>
        <Text style={[styles.subtitle, stylesHooks.subtitle]}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'stretch',
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'column',
    justifyContent: 'center',
    marginBottom: 8,
    minWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 15,
    paddingBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default WalletToImport;
