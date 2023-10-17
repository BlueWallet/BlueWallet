import React, { useMemo, useState, useContext, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Avatar, Badge, Icon, ListItem } from 'react-native-elements';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  PixelRatio,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRoute, useTheme, useNavigation } from '@react-navigation/native';
import * as RNLocalize from 'react-native-localize';

import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { SafeBlueArea, BlueSpacing10, BlueSpacing20, BlueButton, BlueListItem } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import BottomModal from '../../components/BottomModal';
import { FContainer, FButton } from '../../components/FloatButtons';
import debounce from '../../blue_modules/debounce';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const FrozenBadge = () => {
  const { colors } = useTheme();
  const oStyles = StyleSheet.create({
    freeze: { backgroundColor: colors.redBG, borderWidth: 0 },
    freezeText: { color: colors.redText },
  });
  return <Badge value={loc.cc.freeze} badgeStyle={oStyles.freeze} textStyle={oStyles.freezeText} />;
};

const ChangeBadge = () => {
  const { colors } = useTheme();
  const oStyles = StyleSheet.create({
    change: { backgroundColor: colors.buttonDisabledBackgroundColor, borderWidth: 0 },
    changeText: { color: colors.alternativeTextColor },
  });
  return <Badge value={loc.cc.change} badgeStyle={oStyles.change} textStyle={oStyles.changeText} />;
};

const OutputList = ({
  item: { address, txid, value, vout, confirmations = 0 },
  balanceUnit = BitcoinUnit.BTC,
  oMemo,
  frozen,
  change,
  onOpen,
  selected,
  selectionStarted,
  onSelect,
  onDeSelect,
}) => {
  const { colors } = useTheme();
  const { txMetadata } = useContext(BlueStorageContext);
  const memo = oMemo || txMetadata[txid]?.memo || '';
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalance(value, balanceUnit, true);

  const oStyles = StyleSheet.create({
    container: { borderBottomColor: colors.lightBorder, backgroundColor: colors.elevated },
    containerSelected: {
      backgroundColor: colors.ballOutgoingExpired,
      borderBottomColor: 'rgba(0, 0, 0, 0)',
    },
    avatar: { borderColor: 'white', borderWidth: 1, backgroundColor: color },
    amount: { fontWeight: 'bold', color: colors.foregroundColor },
    memo: { fontSize: 13, marginTop: 3, color: colors.alternativeTextColor },
  });

  let onPress = onOpen;
  if (selectionStarted) {
    onPress = selected ? onDeSelect : onSelect;
  }

  return (
    <ListItem bottomDivider onPress={onPress} containerStyle={selected ? oStyles.containerSelected : oStyles.container}>
      <Avatar
        rounded
        overlayContainerStyle={oStyles.avatar}
        onPress={selected ? onDeSelect : onSelect}
        icon={selected ? { name: 'check' } : undefined}
      />
      <ListItem.Content>
        <ListItem.Title style={oStyles.amount}>{amount}</ListItem.Title>
        <ListItem.Subtitle style={oStyles.memo} numberOfLines={1} ellipsizeMode="middle">
          {memo || address}
        </ListItem.Subtitle>
      </ListItem.Content>
      {change && <ChangeBadge />}
      {frozen && <FrozenBadge />}
    </ListItem>
  );
};

OutputList.propTypes = {
  item: PropTypes.shape({
    address: PropTypes.string.isRequired,
    txid: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    vout: PropTypes.number.isRequired,
    confirmations: PropTypes.number,
  }),
  balanceUnit: PropTypes.string,
  oMemo: PropTypes.string,
  frozen: PropTypes.bool,
  change: PropTypes.bool,
  onOpen: PropTypes.func,
  selected: PropTypes.bool,
  selectionStarted: PropTypes.bool,
  onSelect: PropTypes.func,
  onDeSelect: PropTypes.func,
};

const OutputModal = ({ item: { address, txid, value, vout, confirmations = 0 }, balanceUnit = BitcoinUnit.BTC, oMemo }) => {
  const { colors } = useTheme();
  const { txMetadata } = useContext(BlueStorageContext);
  const memo = oMemo || txMetadata[txid]?.memo || '';
  const fullId = `${txid}:${vout}`;
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalance(value, balanceUnit, true);

  const oStyles = StyleSheet.create({
    container: { paddingHorizontal: 0, borderBottomColor: colors.lightBorder, backgroundColor: colors.elevated },
    avatar: { borderColor: 'white', borderWidth: 1, backgroundColor: color },
    amount: { fontWeight: 'bold', color: colors.foregroundColor },
    tranContainer: { paddingLeft: 20 },
    tranText: { fontWeight: 'normal', fontSize: 13, color: colors.alternativeTextColor },
    memo: { fontSize: 13, marginTop: 3, color: colors.alternativeTextColor },
  });
  const confirmationsFormatted = new Intl.NumberFormat(RNLocalize.getLocales()[0].languageCode, { maximumSignificantDigits: 3 }).format(
    confirmations,
  );

  return (
    <ListItem bottomDivider containerStyle={oStyles.container}>
      <Avatar rounded overlayContainerStyle={oStyles.avatar} />
      <ListItem.Content>
        <ListItem.Title numberOfLines={1} adjustsFontSizeToFit style={oStyles.amount}>
          {amount}
          <View style={oStyles.tranContainer}>
            <Text style={oStyles.tranText}>{loc.formatString(loc.transactions.list_conf, { number: confirmationsFormatted })}</Text>
          </View>
        </ListItem.Title>
        {memo ? (
          <>
            <ListItem.Subtitle style={oStyles.memo}>{memo}</ListItem.Subtitle>
            <BlueSpacing10 />
          </>
        ) : null}
        <ListItem.Subtitle style={oStyles.memo}>{address}</ListItem.Subtitle>
        <BlueSpacing10 />
        <ListItem.Subtitle style={oStyles.memo}>{fullId}</ListItem.Subtitle>
      </ListItem.Content>
    </ListItem>
  );
};

OutputModal.propTypes = {
  item: PropTypes.shape({
    address: PropTypes.string.isRequired,
    txid: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    vout: PropTypes.number.isRequired,
    confirmations: PropTypes.number,
  }),
  balanceUnit: PropTypes.string,
  oMemo: PropTypes.string,
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

const OutputModalContent = ({ output, wallet, onUseCoin, frozen, setFrozen }) => {
  const { colors } = useTheme();
  const { txMetadata, saveToDisk } = useContext(BlueStorageContext);
  const [memo, setMemo] = useState(wallet.getUTXOMetadata(output.txid, output.vout).memo || txMetadata[output.txid]?.memo || '');
  const onMemoChange = value => setMemo(value);
  const switchValue = useMemo(() => ({ value: frozen, onValueChange: value => setFrozen(value) }), [frozen, setFrozen]);

  // save on form change. Because effect called on each event, debounce it.
  const debouncedSaveMemo = useRef(
    debounce(async m => {
      wallet.setUTXOMetadata(output.txid, output.vout, { memo: m });
      await saveToDisk();
    }, 500),
  );
  useEffect(() => {
    debouncedSaveMemo.current(memo);
  }, [memo]);

  return (
    <>
      <OutputModal item={output} balanceUnit={wallet.getPreferredBalanceUnit()} />
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
  frozen: PropTypes.bool.isRequired,
  setFrozen: PropTypes.func.isRequired,
};

const CoinControl = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { walletID, onUTXOChoose } = useRoute().params;
  const { wallets, saveToDisk, sleep } = useContext(BlueStorageContext);
  const wallet = wallets.find(w => w.getID() === walletID);
  // sort by height ascending, txid , vout ascending
  const utxo = wallet.getUtxo(true).sort((a, b) => a.height - b.height || a.txid.localeCompare(b.txid) || a.vout - b.vout);
  const [output, setOutput] = useState();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [frozen, setFrozen] = useState(
    utxo.filter(out => wallet.getUTXOMetadata(out.txid, out.vout).frozen).map(({ txid, vout }) => `${txid}:${vout}`),
  );

  // save frozen status. Because effect called on each event, debounce it.
  const debouncedSaveFronen = useRef(
    debounce(async frzn => {
      utxo.forEach(({ txid, vout }) => {
        wallet.setUTXOMetadata(txid, vout, { frozen: frzn.includes(`${txid}:${vout}`) });
      });
      await saveToDisk();
    }, 500),
  );
  useEffect(() => {
    debouncedSaveFronen.current(frozen);
  }, [frozen]);

  useEffect(() => {
    (async () => {
      try {
        await Promise.race([wallet.fetchUtxo(), sleep(10000)]);
      } catch (e) {
        console.log('coincontrol wallet.fetchUtxo() failed'); // either sleep expired or fetchUtxo threw an exception
      }
      const freshUtxo = wallet.getUtxo(true);
      setFrozen(freshUtxo.filter(out => wallet.getUTXOMetadata(out.txid, out.vout).frozen).map(({ txid, vout }) => `${txid}:${vout}`));
      setLoading(false);
    })();
  }, [wallet, setLoading, sleep]);

  const stylesHook = StyleSheet.create({
    tip: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  });

  const tipCoins = () => {
    if (utxo.length === 0) return null;

    let text = loc.cc.tip;
    if (selected.length > 0) {
      // show summ of coins if any selected
      const summ = selected.reduce((prev, curr) => {
        return prev + utxo.find(({ txid, vout }) => `${txid}:${vout}` === curr).value;
      }, 0);

      const value = formatBalance(summ, wallet.getPreferredBalanceUnit(), true);
      text = loc.formatString(loc.cc.selected_summ, { value });
    }

    return (
      <View style={[styles.tip, stylesHook.tip]}>
        <Text style={{ color: colors.foregroundColor }}>{text}</Text>
      </View>
    );
  };

  const handleChoose = item => setOutput(item);

  const handleUseCoin = u => {
    setOutput(null);
    navigation.pop();
    onUTXOChoose(u);
  };

  const handleMassFreeze = () => {
    if (allFrozen) {
      setFrozen(f => f.filter(i => !selected.includes(i))); // unfreeze
    } else {
      setFrozen(f => [...new Set([...f, ...selected])]); // freeze
    }
  };

  const handleMassUse = () => {
    const fUtxo = utxo.filter(({ txid, vout }) => selected.includes(`${txid}:${vout}`));
    handleUseCoin(fUtxo);
  };

  // check if any outputs are selected
  const selectionStarted = selected.length > 0;
  // check if all selected items are frozen
  const allFrozen = selectionStarted && selected.reduce((prev, curr) => (prev ? frozen.includes(curr) : false), true);
  const buttonFontSize = PixelRatio.roundToNearestPixel(width / 26) > 22 ? 22 : PixelRatio.roundToNearestPixel(width / 26);

  const renderItem = p => {
    const { memo } = wallet.getUTXOMetadata(p.item.txid, p.item.vout);
    const change = wallet.addressIsChange(p.item.address);
    const oFrozen = frozen.includes(`${p.item.txid}:${p.item.vout}`);
    return (
      <OutputList
        balanceUnit={wallet.getPreferredBalanceUnit()}
        item={p.item}
        oMemo={memo}
        frozen={oFrozen}
        change={change}
        onOpen={() => handleChoose(p.item)}
        selected={selected.includes(`${p.item.txid}:${p.item.vout}`)}
        selectionStarted={selectionStarted}
        onSelect={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // animate buttons show
          setSelected(s => [...s, `${p.item.txid}:${p.item.vout}`]);
        }}
        onDeSelect={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // animate buttons show
          setSelected(s => s.filter(i => i !== `${p.item.txid}:${p.item.vout}`));
        }}
      />
    );
  };

  const renderOutputModalContent = () => {
    const oFrozen = frozen.includes(`${output.txid}:${output.vout}`);
    const setOFrozen = value => {
      if (value) {
        setFrozen(f => [...f, `${output.txid}:${output.vout}`]);
      } else {
        setFrozen(f => f.filter(i => i !== `${output.txid}:${output.vout}`));
      }
    };
    return <OutputModalContent output={output} wallet={wallet} onUseCoin={handleUseCoin} frozen={oFrozen} setFrozen={setOFrozen} />;
  };

  if (loading) {
    return (
      <SafeBlueArea style={[styles.center, { backgroundColor: colors.elevated }]}>
        <ActivityIndicator testID="Loading" />
      </SafeBlueArea>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.elevated }]}>
      {utxo.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ color: colors.foregroundColor }}>{loc.cc.empty}</Text>
        </View>
      )}

      <BottomModal
        isVisible={Boolean(output)}
        onClose={() => {
          Keyboard.dismiss();
          setOutput(false);
        }}
      >
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, { backgroundColor: colors.elevated }]}>{output && renderOutputModalContent()}</View>
        </KeyboardAvoidingView>
      </BottomModal>

      <FlatList
        ListHeaderComponent={tipCoins}
        data={utxo}
        renderItem={renderItem}
        keyExtractor={item => `${item.txid}:${item.vout}`}
        contentInset={{ top: 0, left: 0, bottom: 70, right: 0 }}
      />

      {selectionStarted && (
        <FContainer>
          <FButton
            onPress={handleMassFreeze}
            text={allFrozen ? loc.cc.freezeLabel_un : loc.cc.freezeLabel}
            icon={<Icon name="snowflake" size={buttonFontSize} type="font-awesome-5" color={colors.buttonAlternativeTextColor} />}
          />
          <FButton
            onPress={handleMassUse}
            text={selected.length > 1 ? loc.cc.use_coins : loc.cc.use_coin}
            icon={
              <View style={styles.sendIcon}>
                <Icon name="arrow-down" size={buttonFontSize} type="font-awesome" color={colors.buttonAlternativeTextColor} />
              </View>
            }
          />
        </FContainer>
      )}
    </View>
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
  sendIcon: {
    transform: [{ rotate: '225deg' }],
  },
});

CoinControl.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.cc.header }));

export default CoinControl;
