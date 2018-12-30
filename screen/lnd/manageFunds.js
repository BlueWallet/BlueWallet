/* global alert */
import React, { Component } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { BlueSpacingVariable, BlueNavigationStyle, SafeBlueArea, BlueCard } from '../../BlueComponents';
import { ListItem } from 'react-native-elements';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class ManageFunds extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.lnd.title,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    this.onWalletSelect = this.onWalletSelect.bind(this);

    this.state = { fromWallet: props.navigation.getParam('fromWallet') };
  }

  async onWalletSelect(wallet) {
    this.props.navigation.dismiss();
    /** @type {LightningCustodianWallet} */
    let toAddress = false;
    if (this.state.fromWallet.refill_addressess.length > 0) {
      toAddress = this.state.fromWallet.refill_addressess[0];
    } else {
      try {
        await this.state.fromWallet.fetchBtcAddress();
        toAddress = this.state.fromWallet.refill_addressess[0];
      } catch (Err) {
        return alert(Err.message);
      }
    }

    if (wallet) {
      setTimeout(() => {
        this.props.navigation.navigate('SendDetails', {
          memo: loc.lnd.refill_lnd_balance,
          fromSecret: wallet.getSecret(),
          address: toAddress,
        });
      }, 100);
    } else {
      return alert('Internal error');
    }
  }

  render() {
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueSpacingVariable />

        <BlueCard>
          <ListItem
            titleStyle={{ color: BlueApp.settings.foregroundColor }}
            component={TouchableOpacity}
            onPress={a => {
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect });
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

          <View />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

ManageFunds.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    dismiss: PropTypes.function,
    navigate: PropTypes.function,
    getParam: PropTypes.function,
    state: PropTypes.shape({
      params: PropTypes.shape({
        fromSecret: PropTypes.string,
      }),
    }),
  }),
};
