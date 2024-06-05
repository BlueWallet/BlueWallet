import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BlueCard, BlueSpacing20, BlueText } from '../../BlueComponents';
import loc from '../../loc';
import ListItem, { PressableWrapper } from '../../components/ListItem';
import { useSettings } from '../../hooks/context/useSettings';
import TorModule from '../../blue_modules/kmpTor';
import { BlueCurrentTheme } from '../../components/themes';

const TorSettings: React.FC = () => {
  const { isTorEnabled, setIsTorEnabledStorage } = useSettings();
  const [daemonStatus, setDaemonStatus] = useState<string>();

  useEffect(() => {
    const refreshDaemonStatus = () => {
      setDaemonStatus(TorModule.getTorStatus());
    };
    refreshDaemonStatus();
    const intervalId = setInterval(refreshDaemonStatus, 1000);
    return () => {
      clearInterval(intervalId);
    };
  }, [isTorEnabled]);

  useEffect(() => {
    if (daemonStatus === 'OFF' && isTorEnabled) TorModule.restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daemonStatus]);

  return (
    <ScrollView keyboardShouldPersistTaps="always" automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <ListItem
        Component={PressableWrapper}
        title={loc.settings.tor_switch}
        switch={{
          onValueChange: setIsTorEnabledStorage,
          value: isTorEnabled,
          testID: 'Tor',
        }}
      />
      <BlueCard>
        <BlueText>{loc.settings.tor_settings_explain}</BlueText>
      </BlueCard>
      <BlueCard>
        <BlueText style={styles.status}>{loc.settings.electrum_status}</BlueText>
        <View style={styles.connectWrap}>
          {daemonStatus === 'ON' ? (
            <View style={[styles.container, styles.containerConnected]}>
              <BlueText style={styles.textConnected}>{loc.settings.tor_connected}</BlueText>
            </View>
          ) : daemonStatus === 'STARTING' ? (
            <View style={[styles.container, styles.containerStarting]}>
              <BlueText style={styles.textStarting}>{loc.settings.tor_starting}</BlueText>
            </View>
          ) : (
            <View style={[styles.container, styles.containerDisconnected]}>
              <BlueText style={styles.containerDisconnected}>{loc.settings.tor_disconnected}</BlueText>
            </View>
          )}
        </View>
      </BlueCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  status: {
    textAlign: 'center',
    color: BlueCurrentTheme.colors.feeText,
    marginBottom: 4,
  },
  connectWrap: {
    width: 'auto',
    height: 34,
    flexWrap: 'wrap',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  container: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 16,
    paddingRight: 16,
    borderRadius: 20,
  },
  containerConnected: {
    backgroundColor: BlueCurrentTheme.colors.feeLabel,
  },
  containerDisconnected: {
    backgroundColor: BlueCurrentTheme.colors.redBG,
  },
  containerStarting: {
    backgroundColor: BlueCurrentTheme.colors.redBG,
  },
  textConnected: {
    color: BlueCurrentTheme.colors.feeValue,
    fontWeight: 'bold',
  },
  textStarting: {
    color: BlueCurrentTheme.colors.feeValue,
    fontWeight: 'bold',
  },
});

export default TorSettings;
