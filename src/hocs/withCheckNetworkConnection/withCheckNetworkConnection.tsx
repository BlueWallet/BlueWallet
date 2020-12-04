import React from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';

import { selectors } from 'app/state/electrumX';

const i18n = require('../../../loc');

export type CheckNetworkConnectionCallback = (...args: unknown[]) => void;

const withCheckNetworkConnection = <P extends Record<string, any>>(Component: React.ComponentType<P>) => (props: P) => {
  const isInternetReachable = useSelector(selectors.isInternetReachable);
  const isServerConnected = useSelector(selectors.isServerConnected);

  const checkNetworkConnection = (callback: CheckNetworkConnectionCallback) => {
    if (!isInternetReachable) {
      Alert.alert(i18n.connectionIssue.noInternetTitle, i18n.connectionIssue.offlineMessageDescription2);
      return;
    }
    if (!isServerConnected) {
      Alert.alert(i18n.connectionIssue.noNetworkTitle, i18n.connectionIssue.noNetworkDescription);
      return;
    }
    callback();
  };

  return <Component {...props} checkNetworkConnection={checkNetworkConnection} />;
};

export default withCheckNetworkConnection;
