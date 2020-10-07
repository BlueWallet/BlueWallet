import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { images } from 'app/assets';
import { Image, Dropdown } from 'app/components';
import { HDSegwitP2SHArWallet, HDSegwitP2SHAirWallet } from 'app/legacy';
import { typography, palette } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  balance: number;
  unit: string;
  label: string;
  type?: string;
  onSendPress?: () => void;
  onReceivePress?: () => void;
  onSelectPress?: () => void;
  onRecoveryPress?: () => void;
  incomingBalance?: number;
  typeReadable?: string;
}

const shouldRenderRecover = (type: string) => [HDSegwitP2SHArWallet.type, HDSegwitP2SHAirWallet.type].includes(type);

export const DashboarContentdHeader = ({
  balance,
  unit,
  label,
  type,
  incomingBalance,
  onSendPress,
  onReceivePress,
  onSelectPress,
  onRecoveryPress,
  typeReadable,
}: Props) => {
  return (
    <View style={styles.header}>
      <Dropdown
        title={i18n.formatBalance(Number(balance), unit, true)}
        label={<Text style={styles.buttonDescription}>{i18n.wallets.dashboard.availableBalance}</Text>}
        onSelectPress={onSelectPress}
      />
      {incomingBalance !== undefined && (
        <View style={styles.pendingBalanceWrapper}>
          <Text style={styles.pendingBalanceText}>{i18n.formatBalance(Number(incomingBalance), unit, true)}</Text>

          <Text style={styles.buttonDescription}>{i18n.wallets.wallet.pendingBalance}</Text>
        </View>
      )}
      <View>
        <Text style={styles.chooseWalletButtonText} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
        {typeReadable && (
          <View style={styles.typeReadableContainer}>
            <Text style={styles.buttonDescription}>
              {typeReadable} {i18n.wallets.dashboard.wallet}
            </Text>
            <Image source={images.coin} style={styles.coinIcon} />
          </View>
        )}
      </View>
      {onReceivePress && onSelectPress && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.circleButton} onPress={onSendPress}>
            <Image source={images.yellowMinus} style={styles.circleButtonImage} />
            <Text style={styles.circleButtonText}>{i18n.wallets.dashboard.send}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleButton} onPress={onReceivePress}>
            <Image source={images.yellowPlus} style={styles.circleButtonImage} />
            <Text style={styles.circleButtonText}>{i18n.wallets.dashboard.receive}</Text>
          </TouchableOpacity>
          {!!type && shouldRenderRecover(type) && (
            <TouchableOpacity style={styles.circleButton} onPress={onRecoveryPress}>
              <Image source={images.cancel} style={styles.circleButtonImage} />
              <Text style={styles.circleButtonText}>{i18n.wallets.dashboard.recover}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeReadableContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIcon: {
    width: 17,
    height: 17,
    margin: 4,
  },
  pendingBalanceWrapper: {
    paddingBottom: 20,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chooseWalletButtonText: {
    textAlign: 'center',
    ...typography.headline4,
  },
  pendingBalanceText: {
    ...typography.headline4,
    color: palette.lightRed,
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
