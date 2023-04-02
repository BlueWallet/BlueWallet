import React, { useEffect, useState, useContext, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { BlueLoading, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import loc from '../../loc';
import { Icon } from 'react-native-elements';
import { LightningLdkWallet } from '../../class';
import alert from '../../components/Alert';
const fs = require('../../blue_modules/fs');

const LdkViewLogs = () => {
  const { colors } = useTheme();
  const { wallets } = useContext(BlueStorageContext);
  const { walletID } = useRoute().params;
  /** @type {LightningLdkWallet} */
  const wallet = wallets.find(w => w.getID() === walletID);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState('');
  const [info, setInfo] = useState('');
  const [getInfo, setGetInfo] = useState({});
  const { setOptions } = useNavigation();
  const refreshDataInterval = useRef();
  const stylesHooks = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });

  useEffect(() => {
    setIsLoading(true);
    refetchData()
      .then(() => {
        refreshDataInterval.current = setInterval(() => {
          refetchData();
        }, 5000);
      })
      .finally(() => {
        setOptions({
          headerRight: () => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc.wallets.list_tryagain}
              style={styles.reloadLogs}
              onPress={getLogs}
            >
              <Icon name="redo" type="font-awesome-5" size={22} color={colors.foregroundColor} />
            </TouchableOpacity>
          ),
        });
      });
    return () => {
      clearInterval(refreshDataInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLogs = () => {
    wallet.getLogs().then(setLogs);
  };

  const syncBlockchain = () => {
    wallet.checkBlockchain();
  };

  const exportLogs = async () => {
    return fs.writeFileAndExport('rn-ldk.log', info + '\n' + (await wallet.getLogsWithTs()));
  };

  const selfTest = async () => {
    try {
      await wallet.selftest();
      alert('ok');
    } catch (error) {
      alert(error.message);
    }
  };

  const refetchData = async () => {
    getLogs();
    await wallet
      .getInfo()
      .then(async info => {
        setGetInfo(info);
        const peers = await wallet.listPeers();
        const listChannels = await wallet.listChannels();
        const version = await LightningLdkWallet.getVersion();

        let nfo = 'num peers: ' + peers.length;
        nfo += '\nnum channels: ' + listChannels.length;
        nfo += '\nldk binary version: ' + version;
        nfo += '\nstorage namespace: ' + wallet.getStorageNamespace();
        setInfo(nfo);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  if (isLoading) {
    return (
      <View style={[styles.root, stylesHooks.root]}>
        <BlueLoading />
      </View>
    );
  }

  return (
    <SafeBlueArea>
      <ScrollView style={styles.root}>
        <TouchableOpacity accessibilityRole="button" onPress={selfTest} style={styles.button}>
          <BlueText>self test</BlueText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={exportLogs} style={styles.button}>
          <BlueText>export logs to a file</BlueText>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={syncBlockchain} style={styles.button}>
          <BlueText>sync blockchain</BlueText>
        </TouchableOpacity>
        <BlueText>Identity pubkey: {getInfo.identityPubkey}</BlueText>

        <BlueText>{info}</BlueText>
        <BlueSpacing20 />

        <BlueText>{logs}</BlueText>
      </ScrollView>
    </SafeBlueArea>
  );
};

LdkViewLogs.navigationOptions = navigationStyle({}, opts => ({
  ...opts,
  title: loc.lnd.view_logs,
}));

export default LdkViewLogs;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  button: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 15,
    margin: 5,
    borderWidth: 1,
  },
  reloadLogs: {
    marginHorizontal: 16,
    minWidth: 150,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
