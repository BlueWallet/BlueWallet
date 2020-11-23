import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Transaction } from 'bitcoinjs-lib';
import { round } from 'lodash';
import React, { Component } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { Header, ScreenTemplate, Button, StyledText, Image, Text, Warning, EllipsisText } from 'app/components';
import { Route, MainCardStackNavigatorParams, RootStackParams, ActionMeta } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import * as txNotesActions from 'app/state/transactionsNotes/actions';
import * as walletsActions from 'app/state/wallets/actions';
import { palette, typography } from 'app/styles';

import { satoshiToBtc, btcToSatoshi, roundBtcToSatoshis } from '../../utils/bitcoin';

const i18n = require('../../loc');

const ScreenFooter = (onSendPress: () => void, onDetailsPress: () => void, buttonTitle?: string) => (
  <View style={styles.footer}>
    <Button
      title={buttonTitle || i18n.send.confirm.sendNow}
      containerStyle={styles.buttonContainer}
      onPress={onSendPress}
    />
    <StyledText title={i18n.transactions.details.transactionDetails} onPress={onDetailsPress} />
  </View>
);

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.SendCoinsConfirm>
  >;
  createTransactionNote: (txid: string, note: string) => txNotesActions.CreateTransactionNoteAction;
  sendTransaction: (
    { txDecoded }: { txDecoded: Transaction },
    meta?: ActionMeta,
  ) => walletsActions.SendTransactionAction;
  route: RouteProp<MainCardStackNavigatorParams, Route.SendCoinsConfirm>;
}

class SendCoinsConfirmScreen extends Component<Props> {
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
        availableBalance: satoshiToBtc(balance - amount.my - amount.foreign).toNumber() - fee,
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

  navgitateToMainCard = () => this.props.navigation.navigate(Route.MainCardStackNavigator);

  broadcast = () => {
    const {
      createTransactionNote,
      sendTransaction,
      route: {
        params: { txDecoded, successMsgDesc, memo },
      },
      navigation,
    } = this.props;

    sendTransaction(
      { txDecoded },
      {
        onSuccess: (txid: string) => {
          const trimmedMemo = memo?.trim();

          if (trimmedMemo) {
            createTransactionNote(txid, trimmedMemo);
          }

          CreateMessage({
            title: i18n.message.hooray,
            description: successMsgDesc || i18n.send.success.description,
            type: MessageType.success,
            buttonProps: {
              title: i18n.message.returnToDashboard,
              onPress: this.navgitateToMainCard,
            },
          });
        },
        onFailure: (error: string) => {
          Alert.alert('ERROR', error, [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]);
        },
      },
    );
  };

  goToDetails = () => {
    const { fee, recipients, txDecoded, satoshiPerByte, fromWallet } = this.props.route.params;

    const tx = txDecoded.toHex();
    const feeSatoshi = btcToSatoshi(fee);

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
    const { fromWallet, isAlert } = params;

    const { availableBalance, pendingBalance } = this.getNewBalances();
    return (
      <View style={styles.balancesContainer}>
        {isAlert && <Warning />}
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
    const { fromWallet, recipients, satoshiPerByte, headerTitle, buttonTitle } = params;

    const item = recipients[0];

    return (
      <ScreenTemplate
        footer={ScreenFooter(this.goToUnlockScreen, this.goToDetails, buttonTitle)}
        // @ts-ignore
        header={<Header navigation={navigation} isBackArrow title={headerTitle || i18n.send.header} />}
      >
        <View style={styles.container}>
          <View>
            <View style={styles.chooseWalletButton}>
              <Text style={typography.headline4}>
                {roundBtcToSatoshis(item.amount) || satoshiToBtc(item.value).toString()}{' '}
                {fromWallet.preferredBalanceUnit}
              </Text>
            </View>
            <View style={styles.descriptionContainer}>
              <EllipsisText style={styles.buttonDescription}>{fromWallet.label}</EllipsisText>
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

const mapDispatchToProps = {
  createTransactionNote: txNotesActions.createTransactionNote,
  sendTransaction: walletsActions.sendTransaction,
};

export default connect(null, mapDispatchToProps)(SendCoinsConfirmScreen);

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
    paddingHorizontal: 20,
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
