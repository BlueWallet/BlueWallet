import React, { Component } from 'react';
import { View } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueListItem, BlueText, BlueCard } from '../../BlueComponents';
import BlueNotifications from '../../class/BlueNotifications';

export default class SettingsNotifications extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: 'Notifications',
  });

  constructor(props) {
    super(props);
    this.state = { notificationsEnabled: false, blueWalletNewsNotificationEnabled: false, bitcoinPriceNotificationEnabled: false };
  }

  notificationSwitchValueChanged = async value => {
    await BlueNotifications.setEnabled(value);
    this.setState({ notificationsEnabled: value, bitcoinPriceNotificationEnabled: value, blueWalletNewsNotificationEnabled: value });
  };

  bitcoinPriceNotificationSwitchValueChanged = async value => {
    await BlueNotifications.setNotificationTypeEnabled(BlueNotifications.PRICE_FLUCTUATION, value);
    this.setState({ bitcoinPriceNotificationEnabled: value });
  };

  blueWalletNewsNotificationSwitchValueChanged = async value => {
    await BlueNotifications.setNotificationTypeEnabled(BlueNotifications.NEWS, value);
    this.setState({ blueWalletNewsNotificationEnabled: value });
  };

  async componentDidMount() {
    const notificationsEnabled = await BlueNotifications.isEnabled();
    const blueWalletNewsNotificationEnabled = await BlueNotifications.isNotificationTypeEnabled(BlueNotifications.NEWS);
    const bitcoinPriceNotificationEnabled = await BlueNotifications.isNotificationTypeEnabled(BlueNotifications.PRICE_FLUCTUATION);
    this.setState({ notificationsEnabled, blueWalletNewsNotificationEnabled, bitcoinPriceNotificationEnabled });
  }

  render() {
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <BlueListItem
            hideChevron
            switchButton
            switched={this.state.notificationsEnabled}
            onSwitch={this.notificationSwitchValueChanged}
            title="Notifications"
          />
          <BlueCard>
            <BlueText>By enabling, you will receive notifications related to:</BlueText>
          </BlueCard>
          <BlueListItem
            hideChevron
            switchButton
            switchDisabled={!this.state.notificationsEnabled}
            switched={this.state.blueWalletNewsNotificationEnabled}
            onSwitch={this.blueWalletNewsNotificationSwitchValueChanged}
            title="BlueWallet News"
          />
          <BlueListItem
            hideChevron
            switchButton
            switchDisabled={!this.state.notificationsEnabled}
            switched={this.state.bitcoinPriceNotificationEnabled}
            onSwitch={this.bitcoinPriceNotificationSwitchValueChanged}
            title="Bitcoin Price Fluctuation"
          />
        </View>
      </SafeBlueArea>
    );
  }
}
