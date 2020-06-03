import 'react-native-gesture-handler';

import 'intl';
import 'intl/locale-data/jsonp/en';
import './shim.js';

import React from 'react';
import { AppRegistry, StatusBar } from 'react-native';
import SplashScreen from 'react-native-splash-screen';

import App from './App';
import WalletMigrate from './walletMigrate';

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

class BlueAppComponent extends React.Component {
  state = {
    isMigratingData: true,
  };

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
      return (
        <>
          <StatusBar backgroundColor="rgba(0,0,0,0)" translucent />
          <App />
        </>
      );
    }
  }
}

AppRegistry.registerComponent('GoldWallet', () => BlueAppComponent);
