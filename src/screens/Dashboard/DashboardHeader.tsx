import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { icons, images } from 'app/assets';
import { Image } from 'app/components';
import { en } from 'app/locale';
import { typography, palette } from 'app/styles';

interface Props {
  balance: number;
  unit: string;
  label: string;
  onSendPress: () => void;
  onReceivePress: () => void;
  onSelectPress: () => void;
}

export const DashboardHeader = ({ balance, unit, label, onSendPress, onReceivePress, onSelectPress }: Props) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.chooseWalletButton} onPress={onSelectPress}>
        <Text style={styles.chooseWalletButtonText}>{`${balance} ${unit} `}</Text>
        <Image source={icons.iconDropdown} style={styles.icon} />
      </TouchableOpacity>
      <View style={styles.descriptionContainer}>
        <Text style={styles.buttonDescription}>{label}</Text>
        <Image source={images.coin} style={styles.coinIcon} />
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.circleButton} onPress={onSendPress}>
          <Image source={images.yellowMinus} style={styles.circleButtonImage} />
          <Text style={styles.circleButtonText}>{en.dashboard.send}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleButton} onPress={onReceivePress}>
          <Image source={images.yellowPlus} style={styles.circleButtonImage} />
          <Text style={styles.circleButtonText}>{en.dashboard.receive}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    height: 16,
    width: 16,
  },
  coinIcon: {
    width: 17,
    height: 17,
    margin: 4,
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
  buttonDescription: {
    ...typography.caption,
    color: palette.textGrey,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginVertical: 25,
    width: '100%',
    justifyContent: 'space-evenly',
  },
  circleButton: {
    alignItems: 'center',
  },
  circleButtonImage: { height: 32, width: 32, margin: 5 },
  circleButtonText: {
    ...typography.headline6,
    color: palette.textSecondary,
  },
});
