import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, FlatList } from 'react-native';
import { useRoute, useTheme } from '@react-navigation/native';
import { ListItem, Avatar, Badge } from 'react-native-elements';
import { BlueNavigationStyle, SafeBlueArea } from '../../BlueComponents';

import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
const BlueApp = require('../../BlueApp');

const oStyles = StyleSheet.create({
  avatar: { borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: StyleSheet.hairlineWidth },
  amount: { fontWeight: 'bold' },
  memo: { fontSize: 13, marginTop: 3 },
});

const Output = ({ item: { txid, value } }) => {
  const { colors } = useTheme();
  const txMemo = BlueApp.tx_metadata[txid]?.memo ?? `${txid.substring(0, 6)}...${txid.substr(txid.length - 6)}`;
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalanceWithoutSuffix(value, BitcoinUnit.BTC, true);

  return (
    <ListItem bottomDivider>
      <Avatar rounded overlayContainerStyle={[oStyles.avatar, { backgroundColor: color }]} />
      <ListItem.Content>
        <ListItem.Title style={oStyles.amount}>{amount}</ListItem.Title>
        <ListItem.Subtitle style={[oStyles.memo, { color: colors.alternativeTextColor }]} numberOfLines={1}>
          {txMemo}
        </ListItem.Subtitle>
      </ListItem.Content>
      <Badge value="99+" status="error" />
    </ListItem>
  );
};

Output.propTypes = {
  item: PropTypes.shape({
    txid: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  }),
};

const CoinControl = () => {
  const route = useRoute();
  const { walletId } = route.params;
  const wallet = useMemo(() => BlueApp.getWallets().find(w => w.getID() === walletId), [walletId]);
  const utxo = useMemo(() => wallet.getUtxo(), [wallet]);

  const renderItem = ({ item }) => <Output item={item} />;

  console.info('utxo', utxo);

  return (
    <SafeBlueArea>
      <FlatList data={utxo} renderItem={renderItem} keyExtractor={item => item.txid} />
    </SafeBlueArea>
  );
};

CoinControl.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.cc.header,
  gestureEnabled: false,
});

export default CoinControl;
