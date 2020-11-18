import * as Sentry from '@sentry/react-native';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { Navigator } from 'app/navigators';
import { AppStateManager } from 'app/services';
import { AuthenticationAction } from 'app/state/authentication/actions';
import { persistor, store } from 'app/state/store';

import config from './config';

const i18n = require('./loc');

if (!__DEV__) {
  Sentry.init({
    dsn: config.sentryDsn,
    enableAutoSessionTracking: true,
  });
}

const getNewKey = () => new Date().toISOString();

export default class App extends React.PureComponent {
  state = {
    unlockKey: getNewKey(),
  };

  lockScreen = () => {
    store.dispatch({
      type: AuthenticationAction.SetIsAuthenticated,
      isAuthenticated: false,
    });
  };

  setUnlockScreenKey = () => {
    this.setState({
      unlockKey: getNewKey(),
    });
  };

  render() {
    return (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>
          <AppStateManager
            handleAppComesToForeground={this.setUnlockScreenKey}
            handleAppComesToBackground={this.lockScreen}
          />
          <PersistGate loading={null} persistor={persistor}>
            <View style={styles.wrapper}>
              <Navigator unlockKey={this.state.unlockKey} />
            </View>
          </PersistGate>
        </Provider>
      </I18nextProvider>
    );
  }
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
