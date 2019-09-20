import 'intl';
import 'intl/locale-data/jsonp/en';
import React from 'react';
import './shim.js';
import App from './App';
import { Sentry } from 'react-native-sentry';
import { AppRegistry } from 'react-native';
import WalletMigrate from './screen/wallets/walletMigrate';
import { name as appName } from './app.json';
import LottieView from 'lottie-react-native';

/** @type {AppStorage} */
const BlueApp = require('./BlueApp');
let A = require('./analytics');
if (process.env.NODE_ENV !== 'development') {
  Sentry.config('https://23377936131848ca8003448a893cb622@sentry.io/1295736').install();
}

if (!Error.captureStackTrace) {
  // captureStackTrace is only available when debugging
  Error.captureStackTrace = () => {};
}

class BlueAppComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isMigratingData: true, onAnimationFinished: false };
  }

  componentDidMount() {
    const walletMigrate = new WalletMigrate(this.setIsMigratingData);
    walletMigrate.start();
  }

  setIsMigratingData = async () => {
    await BlueApp.startAndDecrypt();
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
        return <App />;
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
