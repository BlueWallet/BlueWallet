import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

import { BlueLoading, BlueSpacing20, BlueText, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import loc from '../../loc';
import { Icon } from 'react-native-elements';

const LNDViewLogs = () => {
  const { colors } = useTheme();
  const { wallets } = useContext(BlueStorageContext);
  const { walletID } = useRoute().params;
  const wallet = wallets.find(w => w.getID() === walletID);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState('');
  const [info, setInfo] = useState('');
  const [getInfo, setGetInfo] = useState({});
  const { setOptions } = useNavigation();
  const stylesHooks = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    text: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
      color: colors.foregroundColor,
    },
  });

  useEffect(() => {
    setOptions({
      headerRight: () => (
        <TouchableOpacity style={styles.reloadLogs} onPress={getLogs}>
          <Icon name="redo" type="font-awesome-5" size={22} />
        </TouchableOpacity>
      ),
    });
    refetchData().then(() => {
      getLogs();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLogs = () => {
    wallet.getLogs().then(setLogs);
  };
  const refetchData = async () => {
    setIsLoading(true);
    console.warn(wallet);
    const dir = await wallet.getLndDir();
    await wallet
      .getInfo()
      .then(async info => {
        setGetInfo(info);
        const peers = await wallet.listPeers();
        const pendingChannels = await wallet.pendingChannels();
        const listChannels = await wallet.listChannels();
        const txs = await wallet.getLndTransactions();
        const walletBalance = await wallet.walletBalance();

        setInfo('LND dir: ' + dir + '\n\nReceivable balance: ' + wallet.getReceivableBalance() + ' Sat');
        console.log(
          'walletBalance=' +
            JSON.stringify(walletBalance) +
            '\n\n' +
            JSON.stringify(getInfo) +
            '\n\n' +
            dir +
            '\n\n' +
            JSON.stringify(pendingChannels) +
            '\n\n' +
            JSON.stringify(listChannels) +
            '\n\ntxs= ' +
            JSON.stringify(txs) +
            '\n\n' +
            JSON.stringify(peers),
        );
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
        <BlueText>Identity pubkey: {getInfo.identityPubkey}</BlueText>
        <BlueText>numPendingChannels: {getInfo.numPendingChannels || 0}</BlueText>
        <BlueText>numActiveChannels: {getInfo.numActiveChannels || 0}</BlueText>
        <BlueText>Peers: {getInfo.numPeers || 0}</BlueText>
        <BlueText>Version: {getInfo.version}</BlueText>
        <BlueText>
          {getInfo.syncedToChain ? 'synced to chain' : 'not synced to chain'} ({getInfo.blockHeight})
        </BlueText>
        <BlueText>{getInfo.syncedToGraph ? 'synced to graph' : 'not synced to graph'}</BlueText>
        <BlueText>{info}</BlueText>
        <BlueSpacing20 />

        <BlueText>{logs}</BlueText>
      </ScrollView>
    </SafeBlueArea>
  );
};

LNDViewLogs.navigationOptions = navigationStyle({}, opts => ({
  ...opts,
  title: loc.lnd.view_logs,
}));

export default LNDViewLogs;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  text: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 5,
    marginHorizontal: 20,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    borderRadius: 4,
    textAlignVertical: 'top',
  },
  textMessage: {
    minHeight: 50,
  },
  flex: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reloadLogs: {
    marginHorizontal: 16,
    minWidth: 150,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
