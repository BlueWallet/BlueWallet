import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { icons } from 'app/assets';
import { Image } from 'app/components';
import { typography } from 'app/styles';

interface Props {
  title: string;
  label: React.ReactNode;
  onSelectPress?: () => void;
}

export const Dropdown = ({ title, label, onSelectPress }: Props) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.chooseWalletButton} onPress={onSelectPress}>
        <Text style={styles.chooseWalletButtonText}>{title}</Text>
        {onSelectPress && <Image source={icons.iconDropdown} style={styles.icon} />}
      </TouchableOpacity>
      <View style={styles.descriptionContainer}>{label}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  icon: {
    height: 16,
    width: 16,
    position: 'absolute',
    right: 0,
  },
  chooseWalletButton: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chooseWalletButtonText: {
    ...typography.headline4,
  },
  descriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
