import React from 'react';
import NavigationService from './NavigationService';
import { MainBottomTabs } from './MainBottomTabs';
import WalletMigrate from './screen/wallets/walletMigrate';
import { Linking } from 'react-native';
import { createAppContainer, NavigationActions } from 'react-navigation';

const AppContainer = createAppContainer(MainBottomTabs);

export default class App extends React.Component {
  navigator = null;

  constructor() {
    super();
    this.state = { walletMigrateHasCompleted: false };
  }

  async componentDidMount() {
    Linking.addEventListener('url', url => this.handleOpenURL({ url }));
    const url = await Linking.getInitialURL();
    this.handleOpenURL({ url });
  }

  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleOpenURL);
  }

  walletMigrateHasCompleted = () => this.setState({ walletMigrateHasCompleted: true });

  handleOpenURL = event => {
    const url = event.url || event;
    if (url === null) {
      return;
    }
    if (typeof url !== 'string') {
      return;
    }
    if (url.indexOf('bitcoin:') === 0 || url.indexOf('BITCOIN:') === 0) {
      this.navigator &&
        this.navigator.dispatch(
          NavigationActions.navigate({
            routeName: 'SendDetails',
            params: {
              uri: url,
            },
          }),
        );
    } else if (url.indexOf('lightning:') === 0 || url.indexOf('LIGHTNING:') === 0) {
      this.navigator &&
        this.navigator.dispatch(
          NavigationActions.navigate({
            routeName: 'ScanLndInvoice',
            params: {
              uri: url,
            },
          }),
        );
    }
  };

  render() {
    return this.state.walletMigrateHasCompleted ? (
      <AppContainer
        ref={nav => {
          this.navigator = nav;
          NavigationService.setTopLevelNavigator(nav);
        }}
      />
    ) : (
      <WalletMigrate onComplete={this.walletMigrateHasCompleted} />
    );
  }
}
