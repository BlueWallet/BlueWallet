import React, { Component } from 'react';
import { Dimensions, ActivityIndicator, View } from 'react-native';
import {
  BlueSpacing,
  BlueSpacing40,
  BlueFormInput,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueFormLabel,
  BlueFormInputAddress,
  BlueHeaderDefaultSub,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

export default class WalletDetails extends Component {
  static navigationOptions = {
    tabBarVisible: false,
  };

  constructor(props) {
    super(props);

    let address = props.navigation.state.params.address;

    /**  @type {AbstractWallet}   */
    let wallet;

    for (let w of BlueApp.getWallets()) {
      if (w.getAddress() === address) {
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
        {(() => {
          if (isIpad) {
            return <BlueSpacing40 />;
          } else {
            return <BlueSpacing />;
          }
        })()}

        <BlueHeaderDefaultSub
          leftText={loc.wallets.details.title}
          onClose={() => this.props.navigation.goBack()}
        />

        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <BlueFormLabel>{loc.wallets.details.address}:</BlueFormLabel>
          <BlueFormInputAddress
            value={this.state.wallet.getAddress()}
            editable
          />

          <BlueFormLabel>{loc.wallets.details.type}:</BlueFormLabel>
          <BlueFormInput
            value={this.state.wallet.getTypeReadable()}
            editable={false}
          />

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
                        this.props.navigation.goBack();
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

                {(() => {
                  if (isIpad) {
                    return <View />;
                  } else {
                    return (
                      <BlueButton
                        onPress={() =>
                          this.props.navigation.navigate('WalletExport', {
                            address: this.state.wallet.getAddress(),
                          })
                        }
                        title={loc.wallets.details.export_backup}
                      />
                    );
                  }
                })()}
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
      }),
    }),
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
