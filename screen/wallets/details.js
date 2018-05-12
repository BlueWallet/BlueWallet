import React, { Component } from 'react';
import { Dimensions, ActivityIndicator, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
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
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-briefcase' : 'ios-briefcase-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
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
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
    });
  }

  async setLabel(text) {
    this.state.wallet.label = text;
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

        <BlueCard
          title={'Wallet Details'}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <BlueFormLabel>Address:</BlueFormLabel>
          <BlueFormInputAddress
            value={this.state.wallet.getAddress()}
            editable
          />

          <BlueFormLabel>Type:</BlueFormLabel>
          <BlueFormInput
            value={this.state.wallet.getTypeReadable()}
            editable={false}
          />

          <BlueFormLabel>Label:</BlueFormLabel>
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
                <BlueText>Are you sure?</BlueText>
                <View style={{ flex: 0, flexDirection: 'row' }}>
                  <View style={{ flex: 0.5 }}>
                    <BlueButton
                      icon={{ name: 'stop', type: 'octicon' }}
                      onPress={async () => {
                        BlueApp.deleteWallet(this.state.wallet);
                        await BlueApp.saveToDisk();
                        EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
                        EV(EV.enum.WALLETS_COUNT_CHANGED);
                        this.props.navigation.goBack();
                      }}
                      title="Yes, delete"
                    />
                  </View>
                  <View style={{ flex: 0.5 }}>
                    <BlueButton
                      onPress={async () => {
                        this.setState({ confirmDelete: false });
                      }}
                      title="No, cancel"
                    />
                  </View>
                </View>
              </View>
            );
          } else {
            return (
              <View>
                <BlueButton
                  icon={{ name: 'stop', type: 'octicon' }}
                  onPress={async () => {
                    this.setState({ confirmDelete: true });
                  }}
                  title="Delete this wallet"
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
                        title="Export / backup"
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
