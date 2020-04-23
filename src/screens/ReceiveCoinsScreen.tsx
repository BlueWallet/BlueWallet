import bip21 from 'bip21';
import React, { Component } from 'react';
import { View, StyleSheet, Text, InteractionManager } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { Header, ScreenTemplate, Button } from 'app/components';
import { Transaction, Route } from 'app/consts';
import i18n from 'app/locale';
import { typography, palette } from 'app/styles';

import BlueApp from '../../BlueApp';
import { Chain } from '../../models/bitcoinUnits';

type Props = NavigationInjectedProps<{ secret: string }>;

interface State {
  secret: string;
  addressText: string;
  bip21encoded: any;
  amount: number;
  address: string;
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
      secret,
      addressText: '',
      bip21encoded: undefined,
      amount: 0,
      address: '',
    };
  }
  qrCodeSVG: any = null;
  async componentDidMount() {
    console.log('receive/details - componentDidMount');

    {
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
          });
        } else if (wallet.getAddress) {
          this.setState({
            address: wallet.getAddress(),
            addressText: wallet.getAddress(),
          });
        }
      }
    }

    InteractionManager.runAfterInteractions(async () => {
      const bip21encoded = bip21.encode(this.state.address);
      this.setState({ bip21encoded });
    });
  }

  updateAmount = (amount: number) => {
    const bip21encoded = bip21.encode(this.state.address, {
      amount,
    });
    this.setState({
      amount,
      bip21encoded,
    });
  };

  editAmount = () => {
    this.props.navigation.navigate(Route.EditText, {
      title: i18n.receive.header,
      label: i18n.receive.details.amount,
      onSave: this.updateAmount,
      value: this.state.amount,
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

  render() {
    const { amount, addressText, bip21encoded } = this.state;
    return (
      <ScreenTemplate
        footer={
          <Button title={i18n.receive.details.share} onPress={this.share} containerStyle={styles.buttonContainer} />
        }
      >
        <View style={styles.qrcontainer}>
          <QRCode
            value={bip21encoded}
            size={130}
            color={BlueApp.settings.foregroundColor}
            logoBackgroundColor={BlueApp.settings.brandingColor}
            ecl={'H'}
            getRef={c => (this.qrCodeSVG = c)}
          />
        </View>
        <Text style={styles.address}>{addressText}</Text>
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
    marginTop: 150,
  },
  address: { ...typography.headline9, alignSelf: 'center', marginVertical: 30 },
  inputTitle: { ...typography.headline4, alignSelf: 'center', marginVertical: 20 },
  amountInput: { width: '100%', borderBottomColor: palette.grey, borderBottomWidth: 1, paddingBottom: 10 },
  amount: { ...typography.caption, color: palette.textGrey },
  buttonContainer: {
    marginBottom: 20,
  },
});
