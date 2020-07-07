import AsyncStorage from '@react-native-community/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Alert, Text } from 'react-native';

import { ScreenTemplate, Button, FlatButton, InputItem, Header } from 'app/components';
import { MainCardStackNavigatorParams, Route } from 'app/consts';
import { AppStorage, defaultPeer } from 'app/legacy';
import { typography, palette } from 'app/styles';

const BlueElectrum = require('../../../BlueElectrum');
const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.ElectrumServer>;
}

export const ElectrumServerScreen = (props: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');

  useEffect(() => {
    (async () => {
      setHost((await AsyncStorage.getItem(AppStorage.ELECTRUM_HOST)) || '');
      setPort((await AsyncStorage.getItem(AppStorage.ELECTRUM_TCP_PORT)) || '');
      setIsLoading(false);
    })();
  }, []);

  const onUseDefaultPress = () => {
    setHost(defaultPeer.host);
    setPort(defaultPeer.tcp);
  };

  const onSavePress = () => {
    setIsLoading(true);
    (async () => {
      try {
        if (!(await BlueElectrum.testConnection(host, port))) {
          Alert.alert(i18n.electrumServer.connectionError);
        } else {
          await AsyncStorage.setItem(AppStorage.ELECTRUM_HOST, host);
          await AsyncStorage.setItem(AppStorage.ELECTRUM_TCP_PORT, port);
          Alert.alert(i18n.electrumServer.successfullSave);
        }
      } catch (error) {
        Alert.alert(i18n.electrumServer.connectionError);
      }

      setIsLoading(false);
    })();
  };

  if (isLoading) {
    return null;
  }

  return (
    <ScreenTemplate
      footer={
        <>
          <Button title={i18n.electrumServer.save} onPress={onSavePress} containerStyle={styles.saveButton} />
          <FlatButton title={i18n.electrumServer.useDefault} onPress={onUseDefaultPress} />
        </>
      }
      header={<Header isBackArrow={true} navigation={props.navigation} title={i18n.electrumServer.header} />}
    >
      <Text style={styles.title}>{i18n.electrumServer.title}</Text>
      <Text style={styles.description}>{i18n.electrumServer.description}</Text>
      <InputItem
        setValue={setHost}
        label={i18n.electrumServer.host}
        focused={!!host}
        value={host}
        keyboardType="numeric"
      />
      <InputItem
        setValue={setPort}
        label={i18n.electrumServer.port}
        focused={!!port}
        value={port}
        keyboardType="numeric"
      />
    </ScreenTemplate>
  );
};

const styles = StyleSheet.create({
  saveButton: { paddingBottom: 10 },
  title: {
    ...typography.headline4,
    alignSelf: 'center',
    marginTop: 10,
  },
  description: {
    ...typography.caption,
    color: palette.textGrey,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 40,
    marginHorizontal: 15,
    textAlign: 'center',
  },
});
