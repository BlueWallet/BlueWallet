import React from 'react';
import { Linking } from 'react-native';
import NavigationService from './NavigationService';
import WalletMigrateStackNavigator from './MainBottomTabs';
import { NavigationActions, StackActions } from 'react-navigation';

export default class App extends React.Component {
  navigator = null;

  componentDidMount() {
    Linking.addEventListener('url', this.handleOpenURL);
  }

  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleOpenURL);
  }

  onComplete = () => {
    const resetAction = StackActions.reset({
      index: 0,
      actions: [NavigationActions.navigate({ routeName: 'MainBottomTabs' })],
    });
    this.navigator.dispatch(resetAction);
    Linking.getInitialURL()
      .then(url => this.handleOpenURL({ url }))
      .catch(console.error);
  };

  handleOpenURL = event => {
    if (event.url === null) {
      return;
    }
    if (typeof event.url !== 'string') {
      return;
    }
    if (event.url.indexOf('bitcoin:') === 0 || event.url.indexOf('BITCOIN:') === 0) {
      this.navigator &&
        this.navigator.dispatch(
          NavigationActions.navigate({
            routeName: 'SendDetails',
            params: {
              uri: event.url,
            },
          }),
        );
    } else if (event.url.indexOf('lightning:') === 0 || event.url.indexOf('LIGHTNING:') === 0) {
      this.navigator &&
        this.navigator.dispatch(
          NavigationActions.navigate({
            routeName: 'ScanLndInvoice',
            params: {
              uri: event.url,
            },
          }),
        );
    }
  };

  render() {
    return (
      <WalletMigrateStackNavigator
        ref={nav => {
          this.navigator = nav;
          NavigationService.setTopLevelNavigator(nav);
        }}
      />
    );
  }
}
