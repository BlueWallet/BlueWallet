import 'intl';
import 'intl/locale-data/jsonp/en';
import React from 'react';
import './shim.js';
import { AppRegistry } from 'react-native';
import WalletMigrate from './screen/wallets/walletMigrate';
import { name as appName } from './app.json';
import App from './App';
import LottieView from 'lottie-react-native';
import UnlockWith from './UnlockWith.js';

const A = require('./analytics');

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

class BlueAppComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isMigratingData: true, onAnimationFinished: false, successfullyAuthenticated: false };
  }

  componentDidMount() {
    const walletMigrate = new WalletMigrate(this.setIsMigratingData);
    walletMigrate.start();
  }

  setIsMigratingData = async () => {
    A(A.ENUM.INIT);
    this.setState({ isMigratingData: false });
  };

  onAnimationFinish = () => {
    if (this.state.isMigratingData) {
      this.loadingSplash.play(0);
    } else {
      this.setState({ onAnimationFinished: true });
    }
  };

  onSuccessfullyAuthenticated = () => {
    this.setState({ successfullyAuthenticated: true });
  };

  render() {
    if (this.state.isMigratingData) {
      return (
        <LottieView
          ref={ref => (this.loadingSplash = ref)}
          onAnimationFinish={this.onAnimationFinish}
          source={require('./img/bluewalletsplash.json')}
          autoPlay
          loop={false}
        />
      );
    } else {
      if (this.state.onAnimationFinished) {
        return this.state.successfullyAuthenticated ? (
          <App />
        ) : (
          <UnlockWith onSuccessfullyAuthenticated={this.onSuccessfullyAuthenticated} />
        );
      } else {
        return (
          <LottieView
            ref={ref => (this.loadingSplash = ref)}
            onAnimationFinish={this.onAnimationFinish}
            source={require('./img/bluewalletsplash.json')}
            autoPlay
            loop={false}
          />
        );
      }
    }
  }
}

AppRegistry.registerComponent(appName, () => BlueAppComponent);
