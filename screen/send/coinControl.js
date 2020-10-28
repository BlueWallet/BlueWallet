import React, { useMemo, useState, useContext, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import _debounce from 'lodash/debounce';
import Modal from 'react-native-modal';
import { ListItem, Avatar, Badge } from 'react-native-elements';
import { StyleSheet, FlatList, KeyboardAvoidingView, View, TextInput, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRoute, useTheme, useNavigation } from '@react-navigation/native';

import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { BlueNavigationStyle, SafeBlueArea, BlueSpacing20, BlueButton, BlueListItem } from '../../BlueComponents';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const oStyles = StyleSheet.create({
  avatar: { borderColor: 'rgba(0, 0, 0, 0.5)', borderWidth: StyleSheet.hairlineWidth },
  amount: { fontWeight: 'bold' },
  memo: { fontSize: 13, marginTop: 3 },
});

const Output = ({ item: { txid, value, vout }, oMemo, frozen, full = false, onPress }) => {
  const { colors } = useTheme();
  const { txMetadata } = useContext(BlueStorageContext);
  const memo = txMetadata[txid]?.memo || oMemo || '';
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
  oMemo: PropTypes.string,
  frozen: PropTypes.bool,
  full: PropTypes.bool,
  onPress: PropTypes.func,
};

const mStyles = StyleSheet.create({
  memoTextInput: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    color: '#81868e',
  },
});

const OutputModalContent = ({ output, wallet, onUseCoin }) => {
  const { colors } = useTheme();
  const { txMetadata, saveToDisk } = useContext(BlueStorageContext);
  const [frozen, setFrozen] = useState(wallet.getUTXOMetadata(output.txid, output.vout).frozen || false);
  const [memo, setMemo] = useState(wallet.getUTXOMetadata(output.txid, output.vout).memo || txMetadata[output.txid]?.memo || '');
  const onFreeze = value => setFrozen(value);
  const onMemoChange = value => setMemo(value);

  // save on form change. Because effect called on each event, debounce it.
  const debouncedSave = useRef(
    _debounce(async (frozen, memo) => {
      wallet.setUTXOMetadata(output.txid, output.vout, { frozen, memo });
      await saveToDisk();
    }, 500),
  );
  useEffect(() => {
    debouncedSave.current(frozen, memo);
  }, [frozen, memo]);

  return (
    <>
      <Output item={output} full />
      <BlueSpacing20 />
      <TextInput
        placeholder={loc.send.details_note_placeholder}
        value={memo}
        placeholderTextColor="#81868e"
        style={[
          mStyles.memoTextInput,
          {
            borderColor: colors.formBorder,
            borderBottomColor: colors.formBorder,
            backgroundColor: colors.inputBackgroundColor,
          },
        ]}
        onChangeText={onMemoChange}
      />
      <BlueListItem title="Freeze" Component={TouchableWithoutFeedback} switch={{ value: frozen, onValueChange: onFreeze }} />
      <BlueSpacing20 />
      <BlueButton title="Use coin" onPress={() => onUseCoin([output])} />
    </>
  );
};

OutputModalContent.propTypes = {
  output: PropTypes.object,
  wallet: PropTypes.object,
  onUseCoin: PropTypes.func.isRequired,
};

const CoinControl = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { walletId, onUTXOChoose } = useRoute().params;
  const { wallets } = useContext(BlueStorageContext);
  const wallet = wallets.find(w => w.getID() === walletId);
  const utxo = useMemo(() => wallet.getUtxo({ frozen: true }), [wallet]);
  const [output, setOutput] = useState();

  const handleChoose = item => setOutput(item);

  const handleUseCoin = utxo => {
    setOutput(null);
    navigation.pop();
    onUTXOChoose(utxo);
  };

  const renderItem = p => {
    const { memo, frozen } = wallet.getUTXOMetadata(p.item.txid, p.item.vout);
    return <Output item={p.item} oMemo={memo} frozen={frozen} onPress={() => handleChoose(p.item)} />;
  };

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
            {output && <OutputModalContent output={output} wallet={wallet} onUseCoin={handleUseCoin} />}
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
    minHeight: 350,
    height: 350,
  },
});

CoinControl.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.cc.header,
  gestureEnabled: false,
});

export default CoinControl;
