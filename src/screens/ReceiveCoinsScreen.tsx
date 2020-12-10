import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import bip21 from 'bip21';
import React, { Component } from 'react';
import { View, StyleSheet, Text, InteractionManager } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, Button, WalletDropdown } from 'app/components';
import { CopyButton } from 'app/components/CopyButton';
import { Route, MainCardStackNavigatorParams, RootStackParams, Wallet } from 'app/consts';
import { checkZero } from 'app/helpers/helpers';
import { ApplicationState } from 'app/state';
import { selectors, reducer } from 'app/state/wallets';
import { typography, palette } from 'app/styles';

import BlueApp from '../../BlueApp';
import logger from '../../logger';

const i18n = require('../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.ReceiveCoins>
  >;
  route: RouteProp<MainCardStackNavigatorParams, Route.ReceiveCoins>;
  wallet?: Wallet;
  wallets: Wallet[];
}
interface State {
  amount: number;
}

class ReceiveCoinsScreen extends Component<Props, State> {
  state = {
    amount: 0,
  };

  qrCodeSVG: any = null;

  get bip21encoded() {
    const { amount } = this.state;
    const { wallet } = this.props;
    if (!wallet) {
      return;
    }
    return bip21.encode(wallet.getAddressForTransaction(), { amount });
  }

  updateAmount = (amount: string) => {
    const parsedAmount = amount;
    this.setState({
      amount: parseFloat(parsedAmount),
    });
  };

  validate = (value: string): string | undefined =>
    !Number(value.replace(',', '.')) && i18n.send.details.amount_field_is_not_valid;

  editAmount = () => {
    this.props.navigation.navigate(Route.EditText, {
      title: i18n.receive.header,
      label: i18n.receive.details.amount,
      onSave: this.updateAmount,
      keyboardType: 'numeric',
      validate: this.validate,
      checkZero,
      value: this.state.amount && !!this.state.amount ? this.state.amount.toString() : '',
    });
  };

  get message(): string {
    const { wallet } = this.props;
    if (!wallet) {
      return '';
    }

    return wallet.getAddressForTransaction();
  }

  share = () => {
    const message = this.message;
    if (this.qrCodeSVG === undefined) {
      Share.open({
        message,
      }).catch(error => {
        logger.warn('ReceiveCoins', error.message);
      });
    } else {
      InteractionManager.runAfterInteractions(async () => {
        this.qrCodeSVG.toDataURL((data: any) => {
          const shareImageBase64 = {
            message,
            url: `data:image/png;base64,${data}`,
          };
          Share.open(shareImageBase64).catch(error => {
            logger.warn('ReceiveCoins', error.message);
          });
        });
      });
    }
  };

  chooseItemFromModal = (index: number) => {
    const { wallets, navigation } = this.props;

    const wallet = wallets[index];
    navigation.setParams({ id: wallet.id });
  };

  showModal = () => {
    const {
      wallets,
      route: {
        params: { id },
      },
    } = this.props;

    const selectedIndex = wallets.findIndex(wallet => wallet.id === id);
    this.props.navigation.navigate(Route.ActionSheet, {
      wallets,
      selectedIndex,
      onPress: this.chooseItemFromModal,
    });
  };

  render() {
    const { amount } = this.state;
    const { wallet } = this.props;

    if (!wallet) {
      return null;
    }

    return (
      <ScreenTemplate
        footer={
          <Button
            title={i18n.receive.details.shareWalletAddress}
            onPress={this.share}
            containerStyle={styles.buttonContainer}
          />
        }
        header={<Header isBackArrow title={i18n.receive.header} />}
      >
        <WalletDropdown
          onSelectPress={this.showModal}
          balance={wallet.balance}
          label={wallet.label}
          unit={wallet.preferredBalanceUnit}
        />
        <View style={styles.qrcontainer}>
          {!!this.bip21encoded && (
            <QRCode
              quietZone={10}
              value={this.bip21encoded}
              size={140}
              color={BlueApp.settings.foregroundColor}
              logoBackgroundColor={BlueApp.settings.brandingColor}
              ecl={'H'}
              getRef={c => (this.qrCodeSVG = c)}
            />
          )}
        </View>
        <Text style={styles.labelText}>{i18n.receive.label}:</Text>
        <Text style={styles.address}>{this.message}</Text>
        <CopyButton textToCopy={this.message} />
        <Text style={styles.inputTitle}>{i18n.receive.details.receiveWithAmount}</Text>
        <Text style={styles.receiveSubtitle}>{i18n.receive.details.receiveWithAmountSubtitle}</Text>
        <View style={styles.amountInput}>
          <Text style={styles.amount} onPress={this.editAmount}>
            {amount ? amount.toString() : i18n.receive.details.amount}
          </Text>
        </View>
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState & reducer.WalletsState, props: Props) => {
  const { id } = props.route.params;
  return {
    wallet: selectors.getById(state, id),
    wallets: selectors.wallets(state),
  };
};

export default connect(mapStateToProps)(ReceiveCoinsScreen);

const styles = StyleSheet.create({
  qrcontainer: {
    alignSelf: 'center',
    width: 140,
    height: 140,
  },
  address: { ...typography.headline9, alignSelf: 'center', marginTop: 5, marginBottom: 30 },
  inputTitle: { ...typography.headline4, alignSelf: 'center', marginTop: 20, marginBottom: 5 },
  amountInput: { width: '100%', borderBottomColor: palette.grey, borderBottomWidth: 1, paddingBottom: 10 },
  amount: { ...typography.caption, color: palette.textGrey },
  buttonContainer: {
    marginBottom: 20,
  },
  labelText: {
    ...typography.overline,
    marginTop: 20,
  },
  receiveSubtitle: {
    ...typography.overline,
    color: palette.textGrey,
    fontSize: 13,
    marginBottom: 30,
    textAlign: 'center',
  },
});
