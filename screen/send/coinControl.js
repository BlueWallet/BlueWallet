import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from 'react-native-modal';
import { ListItem, Avatar, Badge } from 'react-native-elements';
import { StyleSheet, FlatList, KeyboardAvoidingView, View, Text, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRoute, useTheme } from '@react-navigation/native';

import { BlueNavigationStyle, SafeBlueArea, BlueSpacing40, BlueButton, BlueListItem } from '../../BlueComponents';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
const BlueApp = require('../../BlueApp');

const oStyles = StyleSheet.create({
  avatar: { borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: StyleSheet.hairlineWidth },
  amount: { fontWeight: 'bold' },
  memo: { fontSize: 13, marginTop: 3 },
});

const Output = ({ item: { txid, value }, onPress }) => {
  const { colors } = useTheme();
  const txMemo = BlueApp.tx_metadata[txid]?.memo ?? `${txid.substring(0, 6)}...${txid.substr(txid.length - 6)}`;
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalanceWithoutSuffix(value, BitcoinUnit.BTC, true);

  return (
    <ListItem bottomDivider onPress={onPress}>
      <Avatar rounded overlayContainerStyle={[oStyles.avatar, { backgroundColor: color }]} />
      <ListItem.Content>
        <ListItem.Title style={oStyles.amount}>{amount}</ListItem.Title>
        <ListItem.Subtitle style={[oStyles.memo, { color: colors.alternativeTextColor }]} numberOfLines={1}>
          {txMemo}
        </ListItem.Subtitle>
      </ListItem.Content>
      <Badge value="freeze" status="error" />
    </ListItem>
  );
};

Output.propTypes = {
  item: PropTypes.shape({
    txid: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
  }),
  onPress: PropTypes.func,
};

const CoinControl = () => {
  const { colors } = useTheme();
  const route = useRoute();
  const { walletId } = route.params;
  const wallet = useMemo(() => BlueApp.getWallets().find(w => w.getID() === walletId), [walletId]);
  const utxo = useMemo(() => wallet.getUtxo(), [wallet]);
  const [output, setOutput] = useState();
  const [freeze, setFreeze] = useState(false);

  const handleChoose = item => setOutput(item);
  const renderItem = ({ item }) => <Output item={item} onPress={() => handleChoose(item)} />;
  const onFreeze = () => {
    console.info('onFreeze');
    setFreeze(i => !i);
  };

  console.info('utxo', utxo);

  return (
    <SafeBlueArea>
      <Modal
        isVisible={Boolean(output)}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          setOutput(false);
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, { backgroundColor: colors.elevated }]}>
            {output && (
              <>
                <Output item={output} />
                <BlueListItem title="Freeze" Component={TouchableWithoutFeedback} switch={{ value: freeze, onValueChange: onFreeze }} />
                <Text>{loc.multisig.type_your_mnemonics}</Text>
                <BlueSpacing40 />

                <BlueButton title="Use coin" onPress={() => {}} />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <FlatList data={utxo} renderItem={renderItem} keyExtractor={item => item.txid} />
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    padding: 22,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 290,
    height: 290,
  },
});

CoinControl.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.cc.header,
  gestureEnabled: false,
});

export default CoinControl;
