import React, { Component } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  BlueFormInput,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueFormLabel,
  BlueFormInputAddress,
  BlueSpacing20,
  BlueHeaderDefaultSub,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class WalletDetails extends Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      return <BlueHeaderDefaultSub leftText={loc.wallets.details.title} onClose={() => navigation.goBack(null)} />;
    },
  };

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
      confirmDelete: false,
      isLoading: true,
      wallet,
      address,
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
    });
  }

  async setLabel(text) {
    this.state.wallet.setLabel(text);
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(() => {
      BlueApp.saveToDisk();
    }, 3000);

    this.setState({
      labelChanged: true,
    }); /* also, a hack to make screen update new typed text */
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
        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          {(() => {
            if (this.state.wallet.getAddress()) {
              return (
                <View>
                  <BlueFormLabel>{loc.wallets.details.address}:</BlueFormLabel>
                  <BlueFormInputAddress value={this.state.wallet.getAddress()} editable />
                </View>
              );
            }
          })()}

          <BlueFormLabel>{loc.wallets.details.type}:</BlueFormLabel>
          <BlueFormInput value={this.state.wallet.getTypeReadable()} editable={false} />

          <BlueFormLabel>{loc.wallets.details.label}:</BlueFormLabel>
          <BlueFormInput
            value={this.state.wallet.getLabel()}
            onChangeText={text => {
              this.setLabel(text);
            }}
          />
        </BlueCard>

        {(() => {
          if (this.state.confirmDelete) {
            return (
              <View style={{ alignItems: 'center' }}>
                <BlueText>{loc.wallets.details.are_you_sure}</BlueText>
                <View style={{ flex: 0, flexDirection: 'row' }}>
                  <View style={{ flex: 0.5 }}>
                    <BlueButton
                      icon={{
                        name: 'stop',
                        type: 'octicon',
                        color: BlueApp.settings.buttonTextColor,
                      }}
                      onPress={async () => {
                        BlueApp.deleteWallet(this.state.wallet);
                        await BlueApp.saveToDisk();
                        EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
                        EV(EV.enum.WALLETS_COUNT_CHANGED);
                        this.props.navigation.navigate('Wallets');
                      }}
                      title={loc.wallets.details.yes_delete}
                    />
                  </View>
                  <View style={{ flex: 0.5 }}>
                    <BlueButton
                      onPress={async () => {
                        this.setState({ confirmDelete: false });
                      }}
                      title={loc.wallets.details.no_cancel}
                    />
                  </View>
                </View>
              </View>
            );
          } else {
            return (
              <View>
                <BlueSpacing20 />
                <BlueButton
                  icon={{
                    name: 'stop',
                    type: 'octicon',
                    color: BlueApp.settings.buttonTextColor,
                  }}
                  onPress={async () => {
                    this.setState({ confirmDelete: true });
                  }}
                  title={loc.wallets.details.delete_this_wallet}
                />
                <BlueSpacing20 />

                <BlueButton
                  onPress={() =>
                    this.props.navigation.navigate('WalletExport', {
                      address: this.state.wallet.getAddress(),
                      secret: this.state.wallet.getSecret(),
                    })
                  }
                  title={loc.wallets.details.export_backup}
                />
              </View>
            );
          }
        })()}
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
  }),
};
