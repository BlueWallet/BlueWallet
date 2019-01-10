import 'intl';
import 'intl/locale-data/jsonp/en';
import React from 'react';
import './shim.js';
import App from './App';
import { AppRegistry } from 'react-native';
import WalletMigrate from './screen/wallets/walletMigrate';
import { name as appName } from './app.json';
/** @type {AppStorage} */
const BlueApp = require('./BlueApp');

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

class BlueAppComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isMigratingData: true };
  }

  async setIsMigratingData() {
    await BlueApp.startAndDecrypt();
    this.setState({ isMigratingData: false });
  }

  render() {
    return this.state.isMigratingData ? <WalletMigrate onComplete={() => this.setIsMigratingData()} /> : <App />;
  }
}

AppRegistry.registerComponent(appName, () => BlueAppComponent);
