import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Transaction } from 'bitcoinjs-lib';
import { round } from 'lodash';
import React, { Component } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';

import { images } from 'app/assets';
import { Header, ScreenTemplate, Button, StyledText, Image, Text } from 'app/components';
import { Route, MainCardStackNavigatorParams, RootStackParams } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { palette, typography } from 'app/styles';

import { satoshiToBtc, btcToSatoshi, roundBtcToSatoshis } from '../../utils/bitcoin';

const BlueElectrum = require('../../BlueElectrum');
const EV = require('../../events');
const i18n = require('../../loc');

const ScreenFooter = (onSendPress: () => void, onDetailsPress: () => void) => (
  <View style={styles.footer}>
    <Button title={i18n.send.confirm.sendNow} containerStyle={styles.buttonContainer} onPress={onSendPress} />
    <StyledText title={i18n.transactions.details.transactionDetails} onPress={onDetailsPress} />
  </View>
);

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.SendCoinsConfirm>
  >;

  route: RouteProp<MainCardStackNavigatorParams, Route.SendCoinsConfirm>;
}

export class SendCoinsConfirmScreen extends Component<Props> {
  getAmountByTx = (txDecoded: Transaction): { my: number; foreign: number } => {
    const { fromWallet } = this.props.route.params;
    return txDecoded.outs.reduce(
      (amount: { my: number; foreign: number }, out: { value: number; script: Uint8Array }) => {
        if (fromWallet.isOutputScriptMine(out.script)) {
          return {
            ...amount,
            my: out.value + amount.my,
          };
        }
        return {
          ...amount,
          foreign: out.value + amount.foreign,
        };
      },
      { my: 0, foreign: 0 },
    );
  };

  getNewBalances = () => {
    const { fee, txDecoded, fromWallet, isAlert, pendingAmountDecrease } = this.props.route.params;
    const balance = fromWallet.balance;
    const incomingBalance = fromWallet.incoming_balance;
    const amount = this.getAmountByTx(txDecoded);
    if (isAlert) {
      return {
        availableBalance: satoshiToBtc(balance - amount.my - amount.foreign) - fee,
        pendingBalance: satoshiToBtc(incomingBalance + amount.my) - fee,
      };
    }

    if (pendingAmountDecrease !== undefined) {
      const decreasePending = roundBtcToSatoshis(pendingAmountDecrease);
      return {
        availableBalance: satoshiToBtc(balance + amount.my),
        pendingBalance: satoshiToBtc(incomingBalance).toNumber() - decreasePending,
      };
    }

    return {
      availableBalance: satoshiToBtc(balance - amount.foreign) - fee,
      pendingBalance: satoshiToBtc(incomingBalance).toNumber(),
    };
  };

  broadcast = () => {
    const { txDecoded, fromWallet } = this.props.route.params;

    this.setState({ isLoading: true }, async () => {
      try {
        await BlueElectrum.ping();
        await BlueElectrum.waitTillConnected();

        const result = await fromWallet.broadcastTx(txDecoded.toHex());

        if (result && result.code) {
          if (result.code === 1) {
            const message = result.message.split('\n');
            throw new Error(`${message[0]}: ${message[2]}`);
          }
        } else {
          EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs

          CreateMessage({
            title: i18n.send.success.title,
            description: i18n.send.success.description,
            type: MessageType.success,
            buttonProps: {
              title: i18n.message.returnToDashboard,
              onPress: () => this.props.navigation.navigate(Route.MainCardStackNavigator),
            },
          });
          this.setState({ isLoading: false });
        }
      } catch (error) {
        this.setState({ isLoading: false });
        Alert.alert('ERROR', error.message, [
          {
            text: 'OK',
            onPress: () => this.props.navigation.goBack(),
          },
        ]);
      }
    });
  };

  goToDetails = () => {
    const { fee, recipients, txDecoded, satoshiPerByte, fromWallet } = this.props.route.params;

    const tx = txDecoded.toHex();
    const feeSatoshi = btcToSatoshi(fee).toNumber();

    this.props.navigation.navigate(Route.SendTransactionDetails, {
      fee,
      recipients,
      size: Math.round(tx.length / 2),
      tx,
      satoshiPerByte,
      wallet: fromWallet,
      feeSatoshi,
    });
  };

  goToUnlockScreen = () => {
    this.props.navigation.navigate(Route.UnlockTransaction, {
      onSuccess: this.broadcast,
    });
  };

  shouldRenderNewBalances = () => {
    const { fromWallet } = this.props.route.params;
    return !!(fromWallet.balance !== undefined && fromWallet.incoming_balance !== undefined);
  };

  renderNewBalances = () => {
    const {
      route: { params },
    } = this.props;
    const { fromWallet } = params;

    const { availableBalance, pendingBalance } = this.getNewBalances();
    return (
      <View style={styles.balancesContainer}>
        <View style={styles.balanceWrapper}>
          <Text style={styles.balanceText}>
            {roundBtcToSatoshis(availableBalance)} {fromWallet.preferredBalanceUnit}
          </Text>
          <Text style={styles.buttonDescription}>{i18n.send.confirm.availableBalance}</Text>
        </View>
        <View style={styles.balanceWrapper}>
          <Text style={styles.pendingBalanceText}>
            {roundBtcToSatoshis(pendingBalance)} {fromWallet.preferredBalanceUnit}
          </Text>
          <Text style={styles.buttonDescription}>{i18n.send.confirm.pendingBalance}</Text>
        </View>
      </View>
    );
  };

  render() {
    const {
      navigation,
      route: { params },
    } = this.props;
    const { fromWallet, recipients, satoshiPerByte } = params;

    const item = recipients[0];

    return (
      <ScreenTemplate
        footer={ScreenFooter(this.goToUnlockScreen, this.goToDetails)}
        header={<Header navigation={navigation} isBackArrow title={i18n.send.header} />}
      >
        <View style={styles.container}>
          <View>
            <View style={styles.chooseWalletButton}>
              <Text style={typography.headline4}>
                {item.amount || satoshiToBtc(item.value).toString()} {fromWallet.preferredBalanceUnit}
              </Text>
            </View>
            <View style={styles.descriptionContainer}>
              <Text style={styles.buttonDescription}>{fromWallet.label}</Text>
              <Image source={images.coin} style={styles.coinIcon} />
            </View>
          </View>
          <Text style={[styles.buttonDescription, styles.to]}>{i18n.send.details.to}</Text>
          <Text style={styles.address}>{item.address}</Text>
          <View style={styles.feeBoxContainer}>
            <Text style={typography.caption}>{`${i18n.send.details.fee}  `}</Text>
            <View style={styles.feeBox}>
              <Text style={styles.fee}>
                {round(satoshiPerByte, 2)} {i18n.send.details.feeUnit}
              </Text>
            </View>
          </View>
          {this.shouldRenderNewBalances() && this.renderNewBalances()}
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  to: {
    alignSelf: 'center',
    paddingVertical: 16,
  },
  balanceWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: '3%',
  },
  balancesContainer: {
    width: Dimensions.get('window').width,
    alignSelf: 'center',
    paddingVertical: '4%',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.lightGrey,
  },
  balanceText: {
    ...typography.headline4,
  },
  pendingBalanceText: {
    ...typography.headline4,
    color: palette.lightRed,
  },
  footer: {
    height: 100,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  buttonContainer: {
    width: '100%',
  },
  chooseWalletButton: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinIcon: {
    width: 17,
    height: 17,
    margin: 4,
  },
  fee: {
    ...typography.headline9,
    color: palette.textSecondary,
  },
  feeBox: {
    borderRadius: 4,
  },
  feeBoxContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  address: {
    ...typography.headline9,
    textAlign: 'center',
  },
});
