import bip21 from 'bip21';
import React, { Component } from 'react';
import { View, StyleSheet, Text, InteractionManager } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { Header, ScreenTemplate, Button } from 'app/components';
import { CopyButton } from 'app/components/CopyButton';
import { Transaction, Route } from 'app/consts';
import { typography, palette } from 'app/styles';

import BlueApp from '../../BlueApp';
import { Chain } from '../../models/bitcoinUnits';
import { DashboardHeader } from './Dashboard/DashboardHeader';

const i18n = require('../../loc');

type Props = NavigationInjectedProps<{ secret: string }>;

interface State {
  secret: string;
  addressText: string;
  bip21encoded: any;
  amount: number;
  address: string;
  wallet: any;
}
export class ReceiveCoinsScreen extends Component<Props, State> {
  static navigationOptions = (props: NavigationScreenProps<{ transaction: Transaction }>) => {
    return {
      header: <Header navigation={props.navigation} isBackArrow title={i18n.receive.header} />,
    };
  };

  constructor(props: Props) {
    super(props);
    const secret = props.navigation.getParam('secret') || '';

    this.state = {
      secret: secret,
      addressText: '',
      bip21encoded: undefined,
      amount: 0,
      address: '',
      wallet: {},
    };
  }
  qrCodeSVG: any = null;
  async componentDidMount() {
    console.log('receive/details - componentDidMount');

    await this.updateData();
  }

  updateData = async () => {
    let address;
    let wallet;
    for (const w of BlueApp.getWallets()) {
      if (w.getSecret() === this.state.secret) {
        // found our wallet
        wallet = w;
      }
    }
    if (wallet) {
      if (wallet.getAddressForTransaction) {
        if (wallet.chain === Chain.ONCHAIN) {
          try {
            address = await Promise.race([wallet.getAddressForTransaction(), BlueApp.sleep(1000)]);
          } catch (_) {}
          if (!address) {
            // either sleep expired or getAddressAsync threw an exception
            console.warn('either sleep expired or getAddressAsync threw an exception');
            address = wallet.getAddressForTransaction();
          } else {
            BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
          }
          this.setState({
            address: address,
            addressText: address,
          });
        } else if (wallet.chain === Chain.OFFCHAIN) {
          try {
            await Promise.race([wallet.getAddressForTransaction(), BlueApp.sleep(1000)]);
            address = wallet.getAddress();
          } catch (_) {}
          if (!address) {
            // either sleep expired or getAddressAsync threw an exception
            console.warn('either sleep expired or getAddressAsync threw an exception');
            address = wallet.getAddress();
          } else {
            BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
          }
        }
        this.setState({
          address: address,
          addressText: address,
          wallet,
        });
      } else if (wallet.getAddress) {
        this.setState({
          address: wallet.getAddress(),
          addressText: wallet.getAddress(),
          wallet,
        });
      }
    }

    InteractionManager.runAfterInteractions(async () => {
      const bip21encoded = bip21.encode(this.state.address);
      this.setState({ bip21encoded });
    });
  };

  updateAmount = (amount: string) => {
    const bip21encoded = bip21.encode(this.state.address, {
      amount: amount.replace(',', '.'),
    });
    this.setState({
      amount: parseFloat(amount.replace(',', '.')),
      bip21encoded,
    });
  };

  editAmount = () => {
    this.props.navigation.navigate(Route.EditText, {
      title: i18n.receive.header,
      label: i18n.receive.details.amount,
      onSave: this.updateAmount,
      value: this.state.amount.toString(),
    });
  };

  share = async () => {
    if (this.qrCodeSVG === undefined) {
      Share.open({
        message: `bitcoin:${this.state.address}`,
      }).catch(error => console.log(error));
    } else {
      InteractionManager.runAfterInteractions(async () => {
        this.qrCodeSVG.toDataURL((data: any) => {
          const shareImageBase64 = {
            message: `bitcoin:${this.state.address}`,
            url: `data:image/png;base64,${data}`,
          };
          Share.open(shareImageBase64).catch(error => console.log(error));
        });
      });
    }
  };

  chooseItemFromModal = async (index: number) => {
    const wallets = BlueApp.getWallets();

    const wallet = wallets[index];
    this.setState({ wallet, secret: wallet.getSecret() }, this.updateData);
  };

  showModal = () => {
    const wallets = BlueApp.getWallets();
    const selectedIndex = wallets.findIndex(wallet => wallet.label === this.state.wallet.label);
    this.props.navigation.navigate('ActionSheet', {
      wallets: wallets,
      selectedIndex,
      onPress: this.chooseItemFromModal,
    });
  };

  render() {
    const { amount, addressText, bip21encoded, wallet } = this.state;
    return (
      <ScreenTemplate
        footer={
          <Button title={i18n.receive.details.share} onPress={this.share} containerStyle={styles.buttonContainer} />
        }
      >
        <DashboardHeader
          onSelectPress={this.showModal}
          balance={wallet.balance}
          label={wallet.label}
          unit={wallet.preferredBalanceUnit}
        />
        <View style={styles.qrcontainer}>
          {!!bip21encoded && (
            <QRCode
              value={bip21encoded.replace('bitcoin:', '')}
              size={130}
              color={BlueApp.settings.foregroundColor}
              logoBackgroundColor={BlueApp.settings.brandingColor}
              ecl={'H'}
              getRef={c => (this.qrCodeSVG = c)}
            />
          )}
        </View>
        <Text style={styles.address}>{addressText}</Text>
        <CopyButton textToCopy={addressText} />
        <Text style={styles.inputTitle}>{i18n.receive.details.receiveWithAmount}</Text>
        <View style={styles.amountInput}>
          <Text style={styles.amount} onPress={this.editAmount}>
            {amount ? amount.toString() : i18n.receive.details.amount}
          </Text>
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  qrcontainer: {
    alignSelf: 'center',
    width: 140,
    height: 140,
  },
  address: { ...typography.headline9, alignSelf: 'center', marginTop: 30 },
  inputTitle: { ...typography.headline4, alignSelf: 'center', marginVertical: 20 },
  amountInput: { width: '100%', borderBottomColor: palette.grey, borderBottomWidth: 1, paddingBottom: 10 },
  amount: { ...typography.caption, color: palette.textGrey },
  buttonContainer: {
    marginBottom: 20,
  },
});
