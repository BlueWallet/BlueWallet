/* global alert */
import React, { Component } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Dropdown } from 'react-native-material-dropdown';
import { BlueSpacingVariable, BlueNavigationStyle, BlueLoading, SafeBlueArea, BlueCard } from '../../BlueComponents';
import { ListItem } from 'react-native-elements';
import PropTypes from 'prop-types';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

let data = [];

export default class ManageFunds extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.lnd.title,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    let fromSecret;
    if (props.navigation.state.params.fromSecret) fromSecret = props.navigation.state.params.fromSecret;
    let fromWallet = false;

    for (let w of BlueApp.getWallets()) {
      if (w.getSecret() === fromSecret) {
        fromWallet = w;
        break;
      }
    }

    if (fromWallet) {
      console.log(fromWallet.type);
    }

    this.state = {
      fromWallet,
      fromSecret,
      isLoading: true,
    };
  }

  async componentDidMount() {
    data = [];
    for (let c = 0; c < BlueApp.getWallets().length; c++) {
      let w = BlueApp.getWallets()[c];
      if (w.type !== LightningCustodianWallet.type) {
        data.push({
          value: c,
          label: w.getLabel() + ' (' + w.getBalance() + ' BTC)',
        });
      }
    }

    this.setState({
      isLoading: false,
    });
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueSpacingVariable />

        <BlueCard>
          {(() => {
            if (this.state.isRefill) {
              return (
                <View>
                  <Dropdown
                    label={loc.lnd.choose_source_wallet}
                    data={data}
                    onChangeText={async value => {
                      /** @type {LightningCustodianWallet} */
                      let fromWallet = this.state.fromWallet;
                      let toAddress = false;
                      if (fromWallet.refill_addressess.length > 0) {
                        toAddress = fromWallet.refill_addressess[0];
                      } else {
                        try {
                          await fromWallet.fetchBtcAddress();
                          toAddress = fromWallet.refill_addressess[0];
                        } catch (Err) {
                          return alert(Err.message);
                        }
                      }

                      let wallet = BlueApp.getWallets()[value];
                      if (wallet) {
                        console.log(wallet.getSecret());
                        setTimeout(() => {
                          console.log({ toAddress });
                          this.props.navigation.navigate('SendDetails', {
                            memo: loc.lnd.refill_lnd_balance,
                            fromSecret: wallet.getSecret(),
                            address: toAddress,
                          });
                        }, 750);
                      } else {
                        return alert('Internal error');
                      }
                    }}
                  />
                </View>
              );
            } else {
              return (
                <View>
                  <ListItem
                    titleStyle={{ color: BlueApp.settings.foregroundColor }}
                    component={TouchableOpacity}
                    onPress={a => {
                      this.setState({ isRefill: true });
                    }}
                    title={loc.lnd.refill}
                  />
                  <ListItem
                    titleStyle={{ color: BlueApp.settings.foregroundColor }}
                    component={TouchableOpacity}
                    onPress={a => {
                      alert('Coming soon');
                    }}
                    title={loc.lnd.withdraw}
                  />
                </View>
              );
            }
          })()}

          <View />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

ManageFunds.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    navigate: PropTypes.function,
    state: PropTypes.shape({
      params: PropTypes.shape({
        fromSecret: PropTypes.string,
      }),
    }),
  }),
};
