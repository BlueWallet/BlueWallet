import 'intl';
import 'intl/locale-data/jsonp/en';
import './shim.js';

import React from 'react';
import { AppRegistry, StatusBar } from 'react-native';
import SplashScreen from 'react-native-splash-screen';

import App from './App';
import UnlockWith from './UnlockWith.js';
import { name as appName } from './app.json';
import WalletMigrate from './walletMigrate';

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

class BlueAppComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isMigratingData: true,
      successfullyAuthenticated: false,
    };
  }

  componentDidMount() {
    const walletMigrate = new WalletMigrate(this.setIsMigratingData);
    walletMigrate.start();
  }

  setIsMigratingData = async () => {
    SplashScreen.hide();
    this.setState({
      isMigratingData: false,
    });
  };

  onSuccessfullyAuthenticated = () => {
    this.setState({
      successfullyAuthenticated: true,
    });
  };

  render() {
    if (this.state.isMigratingData) {
      return null;
    } else {
      return this.state.successfullyAuthenticated ? (
        <>
          <StatusBar backgroundColor="rgba(0,0,0,0)" translucent />
          <App />
        </>
      ) : (
        <UnlockWith onSuccessfullyAuthenticated={this.onSuccessfullyAuthenticated} />
      );
    }
  }
}

AppRegistry.registerComponent(appName, () => BlueAppComponent);
