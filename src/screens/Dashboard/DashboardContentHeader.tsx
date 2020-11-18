import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { images } from 'app/assets';
import { Image, Dropdown, EllipsisText } from 'app/components';
import { HDSegwitP2SHArWallet, HDSegwitP2SHAirWallet } from 'app/legacy';
import { typography, palette } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  balance: number;
  unit: string;
  label: string;
  type?: string;
  isAllWallets?: boolean;
  onSendPress?: () => void;
  onReceivePress?: () => void;
  onSelectPress?: () => void;
  onRecoveryPress?: () => void;
  incomingBalance?: number;
  typeReadable?: string;
}

const shouldRenderRecover = (type: string) => [HDSegwitP2SHArWallet.type, HDSegwitP2SHAirWallet.type].includes(type);

export const DashboardContentHeader = ({
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
  isAllWallets,
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
        <EllipsisText style={styles.chooseWalletButtonText}>{label}</EllipsisText>
        {isAllWallets && (
          <View style={styles.typeReadableContainer}>
            <Text style={styles.buttonDescription}>BTCV</Text>
            <Image source={images.coin} style={styles.coinIcon} />
          </View>
        )}
        {typeReadable && (
          <View style={styles.typeReadableContainer}>
            <Text style={styles.buttonDescription}>{typeReadable}</Text>
            <Image source={images.coin} style={styles.coinIcon} />
          </View>
        )}
      </View>
      {onReceivePress && onSelectPress && !isAllWallets ? (
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
      ) : (
        <View style={styles.buttonsContainerEmpty} />
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
    marginRight: 45,
    marginLeft: 20,
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
  buttonsContainerEmpty: {
    flexDirection: 'row',
    marginVertical: 41,
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
