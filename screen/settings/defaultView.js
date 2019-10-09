/* global alert */
import React, { Component } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueListItem } from '../../BlueComponents';
import PropTypes from 'prop-types';
import OnAppLaunch from '../../class/onAppLaunch';
const BlueApp = require('../../BlueApp');

export default class DefaultView extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: 'On Launch',
  });

  constructor(props) {
    super(props);
    this.state = { defaultWalletLabel: '', viewAllWalletsEnabled: true };
  }

  async componentDidMount() {
    const viewAllWalletsEnabled = await OnAppLaunch.isViewAllWalletsEnabled();
    let defaultWalletLabel = '';
    const wallet = await OnAppLaunch.getSelectedDefaultWallet();
    if (wallet) {
      defaultWalletLabel = wallet.getLabel();
    }
    this.setState({ viewAllWalletsEnabled, defaultWalletLabel });
  }

  selectWallet = () => {
    this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelectValueChanged });
  };

  onViewAllWalletsSwitchValueChanged = async value => {
    await OnAppLaunch.setViewAllWalletsEnabled(value);
    if (value) {
      return this.setState({ viewAllWalletsEnabled: true, defaultWalletLabel: '' });
    } else {
      const selectedWallet = await OnAppLaunch.getSelectedDefaultWallet();
      return this.setState({ viewAllWalletsEnabled: false, defaultWalletLabel: selectedWallet.getLabel() });
    }
  };

  onWalletSelectValueChanged = async wallet => {
    try {
      const walletID = wallet.getID();
      await OnAppLaunch.setSelectedDefaultWallet(walletID);
      this.setState({ defaultWalletLabel: wallet.getLabel(), viewAllWalletsEnabled: false }, () => this.props.navigation.pop());
    } catch (e) {
      alert(e);
    }
  };

  render() {
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <View>
          <BlueListItem
            title="View All Wallets"
            hideChevron
            switchButton
            swithchEnabled={BlueApp.getWallets().length > 0}
            switched={this.state.viewAllWalletsEnabled}
            onSwitch={this.onViewAllWalletsSwitchValueChanged}
          />
          {!this.state.viewAllWalletsEnabled && (
            <BlueListItem
              title="Default into"
              component={TouchableOpacity}
              onPress={this.selectWallet}
              rightTitle={this.state.defaultWalletLabel}
            />
          )}
        </View>
      </SafeBlueArea>
    );
  }
}

DefaultView.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    pop: PropTypes.func,
  }),
};
