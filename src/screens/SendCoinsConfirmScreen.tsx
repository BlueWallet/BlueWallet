import React, { Component } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { images } from 'app/assets';
import { Header, ScreenTemplate, Button, StyledText, Image, Text } from 'app/components';
import { Transaction, Route, FlowType } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { NavigationService } from 'app/services';
import { palette, typography } from 'app/styles';

import { HDSegwitBech32Wallet } from '../../class';
import { BitcoinUnit } from '../../models/bitcoinUnits';

const Bignumber = require('bignumber.js');

const BlueElectrum = require('../../BlueElectrum');
const currency = require('../../currency');
const EV = require('../../events');
const i18n = require('../../loc');

const ScreenFooter = (onSendPress: () => void, onDetailsPress: () => void) => (
  <View style={styles.footer}>
    <Button title={i18n.send.confirm.sendNow} containerStyle={styles.buttonContainer} onPress={onSendPress} />
    <StyledText title={i18n.transactions.details.transactionDetails} onPress={onDetailsPress} />
  </View>
);

type Props = NavigationInjectedProps<{
  isLoading: boolean;
  fee: number;
  feeSatoshi: number;
  memo: string;
  recipients: any;
  size: number;
  tx: any;
  satoshiPerByte: any;
  fromWallet: any;
}>;

export class SendCoinsConfirmScreen extends Component<Props> {
  static navigationOptions = (props: NavigationScreenProps<{ transaction: Transaction }>) => {
    return {
      header: <Header navigation={props.navigation} isBackArrow title={i18n.send.header} />,
    };
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      fee: props.navigation.getParam('fee'),
      feeSatoshi: new Bignumber(props.navigation.getParam('fee')).multipliedBy(100000000).toNumber(),
      memo: props.navigation.getParam('memo'),
      recipients: props.navigation.getParam('recipients'),
      size: Math.round(props.navigation.getParam('tx').length / 2),
      tx: props.navigation.getParam('tx'),
      satoshiPerByte: props.navigation.getParam('satoshiPerByte'),
      fromWallet: props.navigation.getParam('fromWallet'),
    };
  }

  broadcast = () => {
    this.setState({ isLoading: true }, async () => {
      try {
        await BlueElectrum.ping();
        await BlueElectrum.waitTillConnected();

        const result = await this.state.fromWallet.broadcastTx(this.state.tx);
        if (result && result.code) {
          if (result.code === 1) {
            const message = result.message.split('\n');
            throw new Error(`${message[0]}: ${message[2]}`);
          }
        } else {
          EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
          let amount = 0;
          const recipients = this.state.recipients;
          if (recipients[0].amount === BitcoinUnit.MAX) {
            amount = this.state.fromWallets.getBalance() - this.state.feeSatoshi;
          } else {
            for (const recipient of recipients) {
              amount += recipient.amount ? +recipient.amount : recipient.value;
            }
          }

          if (this.state.fromWallet.type === HDSegwitBech32Wallet.type) {
            amount = i18n.formatBalanceWithoutSuffix(amount, BitcoinUnit.BTC, false);
          }

          CreateMessage({
            title: i18n.send.success.title,
            description: i18n.send.success.description,
            type: MessageType.success,
            buttonProps: {
              title: i18n.message.returnToDashboard,
              onPress: () => NavigationService.navigateWithReset(Route.MainCardStackNavigator),
            },
          });
          this.setState({ isLoading: false });
        }
      } catch (error) {
        this.setState({ isLoading: false });
        Alert.alert(error.message);
      }
    });
  };

  goToDetails = () => {
    const { navigation } = this.props;
    this.props.navigation.navigate(Route.SendTransactionDetails, {
      fee: navigation.getParam('fee'),
      recipients: navigation.getParam('recipients'),
      size: Math.round(navigation.getParam('tx').length / 2),
      tx: navigation.getParam('tx'),
      satoshiPerByte: navigation.getParam('satoshiPerByte'),
      wallet: this.state.fromWallet,
      feeSatoshi: this.state.feeSatoshi,
    });
  };

  goToUnlockScreen = () => {
    this.props.navigation.navigate(Route.UnlockTransaction, {
      onSuccess: this.broadcast,
    });
  };

  render() {
    const { navigation } = this.props;
    const fromWallet = navigation.getParam('fromWallet');
    const recipients = navigation.getParam('recipients');
    const item = recipients[0];
    const fee = navigation.getParam('fee');
    return (
      <ScreenTemplate footer={ScreenFooter(this.goToUnlockScreen, this.goToDetails)}>
        <View style={styles.container}>
          <View>
            <View style={styles.chooseWalletButton}>
              <Text style={typography.headline4}>
                {item.amount || currency.satoshiToBTC(item.value)} {fromWallet.preferredBalanceUnit}
              </Text>
            </View>
            <View style={styles.descriptionContainer}>
              <Text style={styles.buttonDescription}>{fromWallet.label}</Text>
              <Image source={images.coin} style={styles.coinIcon} />
            </View>
          </View>
          <Text style={[styles.buttonDescription, { alignSelf: 'center' }]}>{i18n.send.details.to}</Text>
          <Text style={styles.address}>{item.address}</Text>
          <View style={styles.feeBoxContainer}>
            <Text style={typography.caption}>{i18n.send.details.fee}</Text>
            <View style={styles.feeBox}>
              <Text style={styles.fee}>
                {fee} {i18n.send.details.feeUnit}
              </Text>
            </View>
          </View>
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  footer: {
    height: 100,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  container: {
    flex: 1,
    paddingVertical: '20%',
    justifyContent: 'space-evenly',
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
    color: palette.white,
  },
  feeBox: {
    backgroundColor: palette.textSecondary,
    borderRadius: 4,
    padding: 10,
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
