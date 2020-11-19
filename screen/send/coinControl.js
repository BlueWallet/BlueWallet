import React, { useMemo, useState, useContext, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import _debounce from 'lodash/debounce';
import Modal from 'react-native-modal';
import { ListItem, Avatar, Badge } from 'react-native-elements';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from 'react-native';
import { useRoute, useTheme, useNavigation } from '@react-navigation/native';

import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { BlueNavigationStyle, SafeBlueArea, BlueSpacing10, BlueSpacing20, BlueSpacing40, BlueButton, BlueListItem } from '../../BlueComponents';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const Output = ({ item: { address, txid, value, vout }, oMemo, frozen, change = false, full = false, onPress }) => {
  const { colors } = useTheme();
  const { txMetadata } = useContext(BlueStorageContext);
  const cs = useColorScheme();
  const memo = oMemo || txMetadata[txid]?.memo || '';
  const fullId = `${txid}:${vout}`;
  const shortId = `${address.substring(0, 9)}...${address.substr(address.length - 9)}`;
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalanceWithoutSuffix(value, BitcoinUnit.BTC, true);

  const oStyles = StyleSheet.create({
    containerFull: { paddingHorizontal: 0 },
    avatar: { borderColor: 'white', borderWidth: 1 },
    amount: { fontWeight: 'bold' },
    memo: { fontSize: 13, marginTop: 3 },
    changeLight: { backgroundColor: colors.buttonDisabledBackgroundColor },
    changeDark: { backgroundColor: colors.buttonDisabledBackgroundColor, borderWidth: 0 },
    changeText: { color: colors.alternativeTextColor },
    freezeLight: { backgroundColor: colors.redBG },
    freezeDark: { backgroundColor: colors.redBG, borderWidth: 0 },
    freezeText: { color: colors.redText },
  });


  return (
    <ListItem bottomDivider onPress={onPress} containerStyle={[{ borderBottomColor: colors.lightBorder, backgroundColor: colors.elevated }, full && oStyles.containerFull]}>
      <Avatar rounded overlayContainerStyle={[oStyles.avatar, { backgroundColor: color }]} />
      <ListItem.Content>
        <ListItem.Title style={[oStyles.amount, { color: colors.foregroundColor }]}>{amount}</ListItem.Title>
        {full ? (
          <>
            {memo ? (
              <>
                <ListItem.Subtitle style={[oStyles.memo, { color: colors.alternativeTextColor }]}>{memo}</ListItem.Subtitle>
                <BlueSpacing10 />
              </>
            ) : null}
            <ListItem.Subtitle style={[oStyles.memo, { color: colors.alternativeTextColor }]}>{address}</ListItem.Subtitle>
            <BlueSpacing10 />
            <ListItem.Subtitle style={[oStyles.memo, { color: colors.alternativeTextColor }]}>{fullId}</ListItem.Subtitle>
          </>
        ) : (
          <ListItem.Subtitle style={[oStyles.memo, { color: colors.alternativeTextColor }]} numberOfLines={1}>
            {memo || shortId}
          </ListItem.Subtitle>
        )}
      </ListItem.Content>
      {change && (
        <Badge value={loc.cc.change} badgeStyle={oStyles[cs === 'dark' ? 'changeDark' : 'changeLight']} textStyle={oStyles.changeText} />
      )}
      {frozen && (
        <Badge value={loc.cc.freeze} badgeStyle={oStyles[cs === 'dark' ? 'freezeDark' : 'freezeLight']} textStyle={oStyles.freezeText} />
      )}
    </ListItem>
  );
};

Output.propTypes = {
  item: PropTypes.shape({
    address: PropTypes.string.isRequired,
    txid: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    vout: PropTypes.number.isRequired,
  }),
  oMemo: PropTypes.string,
  frozen: PropTypes.bool,
  change: PropTypes.bool,
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
  buttonContainer: {
    height: 45,
  },
});

const OutputModalContent = ({ output, wallet, onUseCoin }) => {
  const { colors } = useTheme();
  const { txMetadata, saveToDisk } = useContext(BlueStorageContext);
  const [frozen, setFrozen] = useState(wallet.getUTXOMetadata(output.txid, output.vout).frozen || false);
  const [memo, setMemo] = useState(wallet.getUTXOMetadata(output.txid, output.vout).memo || txMetadata[output.txid]?.memo || '');
  const onMemoChange = value => setMemo(value);
  const switchValue = useMemo(() => ({ value: frozen, onValueChange: value => setFrozen(value) }), [frozen, setFrozen]);

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
        testID="OutputMemo"
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
      <BlueListItem title={loc.cc.freezeLabel} Component={TouchableWithoutFeedback} switch={switchValue} />
      <BlueSpacing20 />
      <View style={mStyles.buttonContainer}>
        <BlueButton testID="UseCoin" title={loc.cc.use_coin} onPress={() => onUseCoin([output])} />
      </View>
      <BlueSpacing20 />
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
  // sort by height ascending, txid , vout ascending
  const utxo = wallet.getUtxo({ frozen: true }).sort((a, b) => a.height - b.height || a.txid.localeCompare(b.txid) || a.vout - b.vout);
  const [output, setOutput] = useState();
  const [loading, setLoading] = useState(true);

  const stylesHook = StyleSheet.create({
    tip: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  });

  renderHeader = () => {
    return( 
      <View style={[styles.tip, stylesHook.tip]}>
          <Text style={{ color: colors.foregroundColor }}>
            {loc.cc.tip}
          </Text>
      </View>
    );
  };

  useEffect(() => {
    wallet.fetchUtxo().then(() => setLoading(false));
  }, [wallet, setLoading]);

  const handleChoose = item => setOutput(item);

  const handleUseCoin = utxo => {
    setOutput(null);
    navigation.pop();
    onUTXOChoose(utxo);
  };

  const renderItem = p => {
    const { memo, frozen } = wallet.getUTXOMetadata(p.item.txid, p.item.vout);
    const change = wallet.addressIsChange(p.item.address);
    return <Output item={p.item} oMemo={memo} frozen={frozen} change={change} onPress={() => handleChoose(p.item)} />;
  };

  if (loading) {
    return (
      <SafeBlueArea style={[styles.root, styles.center, { backgroundColor: colors.elevated }]}>
        <ActivityIndicator testID="Loading" />
      </SafeBlueArea>
    );
  }

  return (
    <SafeBlueArea style={[styles.root, { backgroundColor: colors.elevated }]}>
      {utxo.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ color: colors.foregroundColor }}>{loc.cc.empty}</Text>
        </View>
      )}

      <Modal
        isVisible={Boolean(output)}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          setOutput(false);
        }}
        onBackButtonPress={() => {
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

      <FlatList ListHeaderComponent={renderHeader} data={utxo} renderItem={renderItem} keyExtractor={item => `${item.txid}:${item.vout}`} />
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tip: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginVertical: 24,
  },
});

CoinControl.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.cc.header,
  gestureEnabled: false,
});

export default CoinControl;
