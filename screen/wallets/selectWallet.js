import React, { Component } from 'react';
import { View, ActivityIndicator, FlatList } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueText, WalletsCarouselInformationView, BlueSpacing20 } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { ACINQStrikeLightningWallet } from '../../class';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class SelectWallet extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.wallets.select_wallet,
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      data: [],
    };
  }

  componentDidMount() {
    const wallets = BlueApp.getWallets().filter(
      item => item.type !== LightningCustodianWallet.type && item.type !== ACINQStrikeLightningWallet.type && item.allowSend(),
    );
    this.setState({
      data: wallets,
      isLoading: false,
    });
  }

  _renderItem = ({ item }) => {
    return (
      <WalletsCarouselInformationView
        wallet={item}
        onPress={() => {
          ReactNativeHapticFeedback.trigger('selection', false);
          this.props.navigation.getParam('onWalletSelect')(item);
        }}
      />
    );
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignContent: 'center', paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    } else if (this.state.data.length <= 0) {
      return (
        <SafeBlueArea style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 20 }}>
            <BlueText style={{ textAlign: 'center' }}>There are currently no Bitcoin wallets available.</BlueText>
            <BlueSpacing20 />
            <BlueText style={{ textAlign: 'center' }}>
              A Bitcoin wallet is required to refill Lightning wallets. Please, create or import one.
            </BlueText>
          </View>
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea>
        <FlatList
          style={{ flex: 1 }}
          extraData={this.state.data}
          data={this.state.data}
          renderItem={this._renderItem}
          keyExtractor={(_item, index) => `${index}`}
        />
      </SafeBlueArea>
    );
  }
}

SelectWallet.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    setParams: PropTypes.func,
    dismiss: PropTypes.func,
    getParam: PropTypes.func,
  }),
};
