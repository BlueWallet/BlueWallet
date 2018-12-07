/* global alert */
import React, { Component } from 'react';
import { ActivityIndicator, View, Text, TextInput, Alert, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { BlueButton, SafeBlueArea, BlueCard, BlueSpacing20, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class WalletDetails extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(),
    title: loc.wallets.details.title,
    headerRight: (
      <TouchableOpacity
        style={{ marginHorizontal: 16 }}
        onPress={() => {
          navigation.getParam('saveAction')();
        }}
      >
        <Text style={{ color: '#0c2550' }}>{loc.wallets.details.save}</Text>
      </TouchableOpacity>
    ),
  });

  constructor(props) {
    super(props);

    let address = props.navigation.state.params.address;
    let secret = props.navigation.state.params.secret;

    /**  @type {AbstractWallet}   */
    let wallet;

    for (let w of BlueApp.getWallets()) {
      if ((address && w.getAddress() === address) || w.getSecret() === secret) {
        // found our wallet
        wallet = w;
      }
    }

    this.state = {
      isLoading: true,
      walletName: wallet.getLabel(),
      wallet,
      address,
    };
    this.props.navigation.setParams({ saveAction: () => this.setLabel() });
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
    });
  }

  async setLabel() {
    this.state.wallet.setLabel(this.state.walletName);
    BlueApp.saveToDisk();
    alert('Wallet updated.');
    this.props.navigation.goBack(null);
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <BlueCard style={{ alignItems: 'center', flex: 1 }}>
              {(() => {
                if (this.state.wallet.getAddress()) {
                  return (
                    <React.Fragment>
                      <Text style={{ color: '#0c2550', fontWeight: '500', fontSize: 14, marginVertical: 12 }}>
                        {loc.wallets.details.address.toLowerCase()}
                      </Text>
                      <Text style={{ color: '#81868e', fontWeight: '500', fontSize: 14 }}>{this.state.wallet.getAddress()}</Text>
                    </React.Fragment>
                  );
                }
              })()}
              <Text style={{ color: '#0c2550', fontWeight: '500', fontSize: 14, marginVertical: 16 }}>
                {loc.wallets.add.wallet_name.toLowerCase()}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  borderColor: '#d2d2d2',
                  borderBottomColor: '#d2d2d2',
                  borderWidth: 1.0,
                  borderBottomWidth: 0.5,
                  backgroundColor: '#f5f5f5',
                  minHeight: 44,
                  height: 44,
                  alignItems: 'center',
                  borderRadius: 4,
                }}
              >
                <TextInput
                  placeholder={loc.send.details.note_placeholder}
                  value={this.state.walletName}
                  onChangeText={text => this.setState({ walletName: text })}
                  numberOfLines={1}
                  style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
                  editable={!this.state.isLoading}
                  underlineColorAndroid="transparent"
                />
              </View>

              <Text style={{ color: '#0c2550', fontWeight: '500', fontSize: 14, marginVertical: 12 }}>
                {loc.wallets.details.type.toLowerCase()}
              </Text>
              <Text style={{ color: '#81868e', fontWeight: '500', fontSize: 14 }}>{this.state.wallet.getTypeReadable()}</Text>
            </BlueCard>
            <View>
              <BlueSpacing20 />
              <BlueButton
                icon={{
                  name: 'cloud-upload',
                  type: 'octicon',
                  color: BlueApp.settings.buttonTextColor,
                }}
                onPress={() =>
                  this.props.navigation.navigate('WalletExport', {
                    address: this.state.wallet.getAddress(),
                    secret: this.state.wallet.getSecret(),
                  })
                }
                title={loc.wallets.details.export_backup}
              />

              <BlueSpacing20 />

              {this.state.wallet.type !== new LightningCustodianWallet().type && (
                <BlueButton
                  icon={{
                    name: 'shopping-cart',
                    type: 'font-awesome',
                    color: BlueApp.settings.buttonTextColor,
                  }}
                  onPress={() =>
                    this.props.navigation.navigate('BuyBitcoin', {
                      address: this.state.wallet.getAddress(),
                      secret: this.state.wallet.getSecret(),
                    })
                  }
                  title={loc.wallets.details.buy_bitcoin}
                />
              )}
              <BlueSpacing20 />

              <TouchableOpacity
                style={{ alignItems: 'center' }}
                onPress={() =>
                  Alert.alert(
                    loc.wallets.details.delete + ' ' + loc.wallets.details.title,
                    loc.wallets.details.are_you_sure,
                    [
                      {
                        text: loc.wallets.details.yes_delete,
                        onPress: async () => {
                          BlueApp.deleteWallet(this.state.wallet);
                          await BlueApp.saveToDisk();
                          EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
                          EV(EV.enum.WALLETS_COUNT_CHANGED);
                          this.props.navigation.navigate('Wallets');
                        },
                        style: 'destructive',
                      },
                      { text: loc.wallets.details.no_cancel, onPress: () => {}, style: 'cancel' },
                    ],
                    { cancelable: false },
                  )
                }
              >
                <Text style={{ color: '#d0021b', fontSize: 15, fontWeight: '500' }}>{loc.wallets.details.delete}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </SafeBlueArea>
    );
  }
}

WalletDetails.propTypes = {
  navigation: PropTypes.shape({
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
        secret: PropTypes.string,
      }),
    }),
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    setParams: PropTypes.func,
  }),
};
