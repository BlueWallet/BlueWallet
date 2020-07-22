import { NavigationContainer } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import React from 'react';
import { I18nextProvider } from 'react-i18next';
import { View, YellowBox, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { BlueApp } from 'app/legacy';
import { i18n } from 'app/locale';
import { RootNavigator } from 'app/navigators';
import { UnlockScreen } from 'app/screens';
import { SecureStorageService, AppStateManager, navigationRef } from 'app/services';
import { persistor, store } from 'app/state/store';

YellowBox.ignoreWarnings(['VirtualizedLists should never be nested inside', `\`-[RCTRootView cancelTouches]\``]);

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    dsn: 'https://23377936131848ca8003448a893cb622@sentry.io/1295736',
  });
}

interface State {
  isPinSet: boolean;
  successfullyAuthenticated: boolean;
}

export default class App extends React.PureComponent<State> {
  state: State = {
    isPinSet: false,
    successfullyAuthenticated: false,
  };

  async componentDidMount() {
    const isPinSet = await SecureStorageService.getSecuredValue('pin');
    if (isPinSet) {
      this.setState({ isPinSet });
    }
  }

  handleAppComesToForeground = async () => {
    this.setState({
      successfullyAuthenticated: false,
    });
  };

  onSuccessfullyAuthenticated = () => {
    this.setState({
      successfullyAuthenticated: true,
    });
  };

  get showUnlockScreen(): boolean {
    if (__DEV__) {
      // do not check PIN during development
      BlueApp.startAndDecrypt();
      return false;
    }
    const { successfullyAuthenticated, isPinSet } = this.state;
    return isPinSet && !successfullyAuthenticated;
  }

  render() {
    const isBiometricEnabledByUser = store.getState().appSettings.isBiometricsEnabled;
    return (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>
          <AppStateManager handleAppComesToForeground={this.handleAppComesToForeground} />
          <PersistGate loading={null} persistor={persistor}>
            <View style={styles.wrapper}>
              <NavigationContainer ref={navigationRef as any}>
                <RootNavigator />
                {this.showUnlockScreen && (
                  <UnlockScreen
                    onSuccessfullyAuthenticated={this.onSuccessfullyAuthenticated}
                    isBiometricEnabledByUser={isBiometricEnabledByUser}
                  />
                )}
              </NavigationContainer>
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
