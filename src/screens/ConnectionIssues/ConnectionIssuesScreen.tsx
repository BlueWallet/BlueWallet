import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';

import { ScreenTemplate, Loader } from 'app/components';
import { selectors } from 'app/state/electrumX';
import { typography, palette } from 'app/styles';

const i18n = require('../../../loc');

export const ConnectionIssuesScreen = () => {
  const isInternetReachable = useSelector(selectors.isInternetReachable);
  const isServerConnected = useSelector(selectors.isServerConnected);

  const getTitle = () => {
    if (!isInternetReachable) {
      return i18n.connectionIssue.noInternetTitle;
    }
    if (!isServerConnected) {
      return i18n.connectionIssue.noNetworkTitle;
    }
  };

  const getDescription = () => {
    if (!isInternetReachable) {
      return i18n.connectionIssue.noInternetDescription;
    }
    if (!isServerConnected) {
      return i18n.connectionIssue.noNetworkDescription;
    }
  };

  return (
    <ScreenTemplate>
      <View style={styles.container}>
        <Text style={styles.title}>{getTitle()}</Text>
        <Loader size={137} />
        <Text style={styles.description}>{getDescription()}</Text>
      </View>
    </ScreenTemplate>
  );
};

export default ConnectionIssuesScreen;

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  title: { ...typography.headline4, textAlign: 'center', paddingBottom: 66 },
  description: {
    ...typography.body,
    textAlign: 'center',
    color: palette.textGrey,
    paddingTop: 61,
  },
});
