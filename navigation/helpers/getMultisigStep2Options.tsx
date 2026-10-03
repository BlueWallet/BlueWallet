import React from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import Icon from '../../components/Icon';
import type { Theme } from '../../components/themes';
import { isDesktop, isIOS26OrHigher } from '../../blue_modules/environment';
import loc from '../../loc';
import { getHeaderMenuOptions, usesHeaderMenu } from '../../components/HeaderMenu';

type HelpButtonProps = { onPress: () => void; theme: Theme };
const HelpButton = ({ onPress, theme: { colors } }: HelpButtonProps) => (
  <Pressable
    accessibilityRole="button"
    style={({ pressed }) => [
      styles.helpButton,
      { backgroundColor: colors.buttonDisabledBackgroundColor },
      pressed && styles.helpButtonPressed,
    ]}
    onPress={onPress}
  >
    <Icon size={20} name="help-outline" type="material" color={colors.foregroundColor} />
    <Text style={[styles.helpButtonText, { color: colors.foregroundColor }]}>{loc.multisig.ms_help}</Text>
  </Pressable>
);

export const getMultisigStep2Options = (props: HelpButtonProps): NativeStackNavigationOptions => {
  if (usesHeaderMenu) {
    return getHeaderMenuOptions({}, [
      {
        id: 'MultisigHelp',
        text: loc.multisig.ms_help,
        icon: { iconValue: 'questionmark.circle' },
        onPress: props.onPress,
      },
    ]);
  }
  if (Platform.OS === 'ios' && isIOS26OrHigher && !isDesktop) {
    return {
      headerRight: undefined,
      unstable_headerRightItems: () => [
        {
          type: 'button',
          label: loc.multisig.ms_help,
          accessibilityLabel: loc.multisig.ms_help,
          icon: { type: 'sfSymbol', name: 'questionmark.circle' },
          onPress: props.onPress,
        },
      ],
    };
  }
  return {
    headerRight: () => <HelpButton {...props} />,
    unstable_headerRightItems: undefined,
  };
};

const styles = StyleSheet.create({
  helpButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  helpButtonPressed: {
    opacity: 0.75,
  },
});
