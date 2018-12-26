/* global alert */
import React from 'react';
import { Linking } from 'react-native';
import { NavigationActions } from 'react-navigation';
import MainBottomTabs from './MainBottomTabs';
import { LightningCustodianWallet } from './class';
let BlueApp = require('./BlueApp');

export default class App extends React.Component {
  navigator = null;

  componentDidMount() {
    Linking.getInitialURL()
      .then(url => this.handleOpenURL({ url }))
      .catch(console.error);

    Linking.addEventListener('url', this.handleOpenURL);
  }

  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleOpenURL);
  }

  handleOpenURL = event => {
    if (event.url === null) {
      return;
    }
    if (typeof event.url !== 'string') {
      return;
    }
    if (event.url.indexOf('bitcoin:') === 0 || event.url.indexOf('BITCOIN:') === 0) {
      if (BlueApp.getWallets().map(item => item.type !== new LightningCustodianWallet().type).length > 1) {
        this.navigator &&
          this.navigator.dispatch(
            NavigationActions.navigate({
              routeName: 'SendDetails',
              params: {
                uri: event.url,
              },
            }),
          );
      } else {
        alert('Before sending Bitcoins, you must first add a Bitcoin wallet.');
      }
    } else if (event.url.indexOf('lightning:') === 0 || event.url.indexOf('LIGHTNING:') === 0) {
      if (BlueApp.getWallets().map(item => item.type === new LightningCustodianWallet().type).length > 1) {
        this.navigator &&
          this.navigator.dispatch(
            NavigationActions.navigate({
              routeName: 'ScanLndInvoice',
              params: {
                uri: event.url,
              },
            }),
          );
      } else {
        alert('Before paying a Lightning invoice, you must first add a Lightning wallet.');
      }
    }
  };

  render() {
    return (
      <MainBottomTabs
        ref={nav => {
          this.navigator = nav;
        }}
      />
    );
  }
}
