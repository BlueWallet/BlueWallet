import React, { useMemo, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import Modal from 'react-native-modal';
import { ListItem, Avatar, Badge } from 'react-native-elements';
import { StyleSheet, FlatList, KeyboardAvoidingView, View, Text, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRoute, useTheme } from '@react-navigation/native';

import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { BlueNavigationStyle, SafeBlueArea, BlueSpacing40, BlueButton, BlueListItem } from '../../BlueComponents';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const oStyles = StyleSheet.create({
  avatar: { borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: StyleSheet.hairlineWidth },
  amount: { fontWeight: 'bold' },
  memo: { fontSize: 13, marginTop: 3 },
});

const Output = ({ item: { txid, value, vout }, frozen, full = false, onPress }) => {
  const { colors } = useTheme();
  const { txMetadata } = useContext(BlueStorageContext);
  const memo = txMetadata[txid]?.memo || '';
  const fullId = `${txid}:${vout}`;
  const shortId = `${txid.substring(0, 6)}...${txid.substr(txid.length - 6)}:${vout}`;
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalanceWithoutSuffix(value, BitcoinUnit.BTC, true);

  return (
    <ListItem bottomDivider onPress={onPress}>
      <Avatar rounded overlayContainerStyle={[oStyles.avatar, { backgroundColor: color }]} />
      <ListItem.Content>
        <ListItem.Title style={oStyles.amount}>{amount}</ListItem.Title>
        {full ? (
          <>
            <ListItem.Subtitle style={[oStyles.memo, { color: colors.alternativeTextColor }]}>
              {memo ? memo + '\n' : null}
              {fullId}
            </ListItem.Subtitle>
          </>
        ) : (
          <ListItem.Subtitle style={[oStyles.memo, { color: colors.alternativeTextColor }]} numberOfLines={1}>
            {memo || shortId}
          </ListItem.Subtitle>
        )}
      </ListItem.Content>
      {frozen && <Badge value="freeze" status="error" />}
    </ListItem>
  );
};

Output.propTypes = {
  item: PropTypes.shape({
    txid: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    vout: PropTypes.number.isRequired,
  }),
  frozen: PropTypes.bool,
  full: PropTypes.bool,
  onPress: PropTypes.func,
};

const CoinControl = () => {
  const { colors } = useTheme();
  const route = useRoute();
  const { walletId } = route.params;
  const { wallets, saveToDisk } = useContext(BlueStorageContext);
  const wallet = wallets.find(w => w.getID() === walletId);
  const utxo = useMemo(() => wallet.getUtxo({ frozen: true }), [wallet]);
  const [output, setOutput] = useState();
  const [, setReRender] = useState(false);
  const frozenUtxo = wallet.getFrozenUtxo();
  const switchValue = output && frozenUtxo.some(({ txid, vout }) => output.txid === txid && output.vout === vout);

  const handleChoose = item => setOutput(item);
  const onFreeze = async ({ txid, vout }, value) => {
    if (value) {
      wallet.freezeOutput(txid, vout);
    } else {
      wallet.unFreezeOutput(txid, vout);
    }
    await saveToDisk();
    setReRender(i => !i);
  };
  const renderItem = p => (
    <Output
      item={p.item}
      frozen={frozenUtxo.some(({ txid, vout }) => p.item.txid === txid && p.item.vout === vout)}
      onPress={() => handleChoose(p.item)}
    />
  );

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
                <Output item={output} full />
                <BlueListItem
                  title="Freeze"
                  Component={TouchableWithoutFeedback}
                  switch={{ value: switchValue, onValueChange: value => onFreeze(output, value) }}
                />
                <Text>{loc.multisig.type_your_mnemonics}</Text>
                <BlueSpacing40 />

                <BlueButton title="Use coin" onPress={() => {}} />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <FlatList data={utxo} renderItem={renderItem} keyExtractor={item => `${item.txid}:${item.vout}`} />
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
