import AsyncStorage from '@react-native-community/async-storage';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';

import { ScreenTemplate, Button, FlatButton, InputItem, Header } from 'app/components';
import { AppStorage, defaultPeer } from 'app/legacy';
import i18n from 'app/locale';

const BlueElectrum = require('../../../BlueElectrum');

export const ElectrumServerScreen = () => {
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
          alert(i18n.electrumServer.connectionError);
        } else {
          await AsyncStorage.setItem(AppStorage.ELECTRUM_HOST, host);
          await AsyncStorage.setItem(AppStorage.ELECTRUM_TCP_PORT, port);
          alert(i18n.electrumServer.successfullSave);
        }
      } catch (error) {
        alert(i18n.electrumServer.connectionError);
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
    >
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

ElectrumServerScreen.navigationOptions = (props: NavigationScreenProps) => ({
  header: <Header isBackArrow={true} navigation={props.navigation} title={i18n.electrumServer.header} />,
});

const styles = StyleSheet.create({
  saveButton: { paddingBottom: 10 },
});
