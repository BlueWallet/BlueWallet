import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, Badge, Icon, ListItem as RNElementsListItem } from '@rneui/themed';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
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
import * as RNLocalize from 'react-native-localize';

import debounce from '../../blue_modules/debounce';
import { BlueSpacing10, BlueSpacing20 } from '../../BlueComponents';
import { TWallet, Utxo } from '../../class/wallets/types';
import BottomModal, { BottomModalHandle } from '../../components/BottomModal';
import Button from '../../components/Button';
import { FButton, FContainer } from '../../components/FloatButtons';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import ListItem from '../../components/ListItem';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import { Action } from '../../components/types';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';

type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'CoinControl'>;
type RouteProps = RouteProp<SendDetailsStackParamList, 'CoinControl'>;

const FrozenBadge: React.FC = () => {
  const { colors } = useTheme();
  const oStyles = StyleSheet.create({
    freeze: { backgroundColor: colors.redBG, borderWidth: 0, marginLeft: 4 },
    freezeText: { color: colors.redText, marginTop: -1 },
  });
  return <Badge value={loc.cc.freeze} badgeStyle={oStyles.freeze} textStyle={oStyles.freezeText} />;
};

const ChangeBadge: React.FC = () => {
  const { colors } = useTheme();
  const oStyles = StyleSheet.create({
    change: { backgroundColor: colors.buttonDisabledBackgroundColor, borderWidth: 0, marginLeft: 4 },
    changeText: { color: colors.alternativeTextColor, marginTop: -1 },
  });
  return <Badge value={loc.cc.change} badgeStyle={oStyles.change} textStyle={oStyles.changeText} />;
};

type TOutputListProps = {
  item: Utxo;
  balanceUnit: string;
  oMemo?: string;
  frozen: boolean;
  change: boolean;
  onOpen: () => void;
  selected: boolean;
  selectionStarted: boolean;
  onSelect: () => void;
  onDeSelect: () => void;
};

const OutputList: React.FC<TOutputListProps> = ({
  item: { address, txid, value },
  balanceUnit = BitcoinUnit.BTC,
  oMemo,
  frozen,
  change,
  onOpen,
  selected,
  selectionStarted,
  onSelect,
  onDeSelect,
}: TOutputListProps) => {
  const { colors } = useTheme();
  const { txMetadata } = useStorage();
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
    <RNElementsListItem bottomDivider onPress={onPress} containerStyle={selected ? oStyles.containerSelected : oStyles.container}>
      <Avatar
        rounded
        size={40}
        containerStyle={oStyles.avatar}
        onPress={selected ? onDeSelect : onSelect}
        icon={selected ? { name: 'check', type: 'font-awesome-6' } : undefined}
      />
      <RNElementsListItem.Content>
        <RNElementsListItem.Title style={oStyles.amount}>{amount}</RNElementsListItem.Title>
        <RNElementsListItem.Subtitle style={oStyles.memo} numberOfLines={1} ellipsizeMode="middle">
          {memo || address}
        </RNElementsListItem.Subtitle>
      </RNElementsListItem.Content>
      <View style={styles.badges}>
        {frozen && <FrozenBadge />}
        {change && <ChangeBadge />}
      </View>
    </RNElementsListItem>
  );
};

type TOutputModalProps = {
  item: Utxo;
  balanceUnit: string;
  oMemo?: string;
};

const OutputModal: React.FC<TOutputModalProps> = ({
  item: { address, txid, value, vout, confirmations = 0 },
  balanceUnit = BitcoinUnit.BTC,
  oMemo,
}) => {
  const { colors } = useTheme();
  const { txMetadata } = useStorage();
  const memo = oMemo || txMetadata[txid]?.memo || '';
  const fullId = `${txid}:${vout}`;
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalance(value, balanceUnit, true);

  const oStyles = StyleSheet.create({
    container: { paddingHorizontal: 0, borderBottomColor: colors.lightBorder, backgroundColor: 'transparent' },
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
    <RNElementsListItem bottomDivider containerStyle={oStyles.container}>
      <Avatar rounded size={40} containerStyle={oStyles.avatar} />
      <RNElementsListItem.Content>
        <RNElementsListItem.Title numberOfLines={1} adjustsFontSizeToFit style={oStyles.amount}>
          {amount}
          <View style={oStyles.tranContainer}>
            <Text style={oStyles.tranText}>{loc.formatString(loc.transactions.list_conf, { number: confirmationsFormatted })}</Text>
          </View>
        </RNElementsListItem.Title>
        {memo ? (
          <>
            <RNElementsListItem.Subtitle style={oStyles.memo}>{memo}</RNElementsListItem.Subtitle>
            <BlueSpacing10 />
          </>
        ) : null}
        <RNElementsListItem.Subtitle style={oStyles.memo}>{address}</RNElementsListItem.Subtitle>
        <BlueSpacing10 />
        <RNElementsListItem.Subtitle style={oStyles.memo}>{fullId}</RNElementsListItem.Subtitle>
      </RNElementsListItem.Content>
    </RNElementsListItem>
  );
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
    marginBottom: 36,
    marginHorizontal: 24,
  },
});

type TOutputModalContentProps = {
  output: Utxo;
  wallet: TWallet;
  onUseCoin: (u: Utxo[]) => void;
  frozen: boolean;
  setFrozen: (value: boolean) => void;
};

const transparentBackground = { backgroundColor: 'transparent' };
const OutputModalContent: React.FC<TOutputModalContentProps> = ({ output, wallet, onUseCoin, frozen, setFrozen }) => {
  const { colors } = useTheme();
  const { txMetadata, saveToDisk } = useStorage();
  const [memo, setMemo] = useState<string>(wallet.getUTXOMetadata(output.txid, output.vout).memo || txMetadata[output.txid]?.memo || '');
  const switchValue = useMemo(() => ({ value: frozen, onValueChange: (value: boolean) => setFrozen(value) }), [frozen, setFrozen]);

  const onMemoChange = (value: string) => setMemo(value);

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
    <View>
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
      <ListItem
        title={loc.cc.freezeLabel}
        containerStyle={transparentBackground}
        Component={TouchableWithoutFeedback}
        switch={switchValue}
      />
      <BlueSpacing20 />
    </View>
  );
};

enum ESortDirections {
  asc = 'asc',
  desc = 'desc',
}

enum ESortTypes {
  height = 'height',
  label = 'label',
  value = 'value',
  frozen = 'frozen',
}

const CoinControl: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useExtendedNavigation<NavigationProps>();
  const { width } = useWindowDimensions();
  const bottomModalRef = useRef<BottomModalHandle | null>(null);
  const { walletID } = useRoute<RouteProps>().params;
  const { wallets, saveToDisk, sleep } = useStorage();
  const [sortDirection, setSortDirection] = useState<ESortDirections>(ESortDirections.asc);
  const [sortType, setSortType] = useState<ESortTypes>(ESortTypes.height);
  const wallet = useMemo(() => wallets.find(w => w.getID() === walletID) as TWallet, [walletID, wallets]);
  const [frozen, setFrozen] = useState<string[]>(
    wallet
      .getUtxo(true)
      .filter(out => wallet.getUTXOMetadata(out.txid, out.vout).frozen)
      .map(({ txid, vout }) => `${txid}:${vout}`),
  );
  const utxos: Utxo[] = useMemo(() => {
    const res = wallet.getUtxo(true).sort((a, b) => {
      switch (sortType) {
        case ESortTypes.height:
          return a.height - b.height || a.txid.localeCompare(b.txid) || a.vout - b.vout;
        case ESortTypes.value:
          return a.value - b.value || a.txid.localeCompare(b.txid) || a.vout - b.vout;
        case ESortTypes.label: {
          const aMemo = wallet.getUTXOMetadata(a.txid, a.vout).memo || '';
          const bMemo = wallet.getUTXOMetadata(b.txid, b.vout).memo || '';
          return aMemo.localeCompare(bMemo) || a.txid.localeCompare(b.txid) || a.vout - b.vout;
        }
        case ESortTypes.frozen: {
          const aF = frozen.includes(`${a.txid}:${a.vout}`);
          const bF = frozen.includes(`${b.txid}:${b.vout}`);
          return aF !== bF ? (aF ? -1 : 1) : a.txid.localeCompare(b.txid) || a.vout - b.vout;
        }
        default:
          return 0;
      }
    });
    // invert if descending
    return sortDirection === ESortDirections.desc ? res.reverse() : res;
  }, [sortDirection, sortType, wallet, frozen]);
  const [output, setOutput] = useState<Utxo | undefined>();
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<string[]>([]);

  // save frozen status. Because effect called on each event, debounce it.
  const debouncedSaveFronen = useRef(
    debounce(async frzn => {
      utxos.forEach(({ txid, vout }) => {
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
    if (utxos.length === 0) return null;

    let text = loc.cc.tip;
    if (selected.length > 0) {
      // show summ of coins if any selected
      const summ = selected.reduce((prev, curr) => {
        return prev + (utxos.find(({ txid, vout }) => `${txid}:${vout}` === curr) as Utxo).value;
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

  const handleChoose = (item: Utxo) => setOutput(item);

  const handleUseCoin = async (u: Utxo[]) => {
    setOutput(undefined);
    // @ts-ignore navigation WTF
    navigation.navigate('SendDetailsRoot', {
      screen: 'SendDetails',
      params: {
        utxos: u,
      },
      merge: true,
    });
  };

  const handleMassFreeze = () => {
    if (allFrozen) {
      setFrozen(f => f.filter(i => !selected.includes(i))); // unfreeze
    } else {
      setFrozen(f => [...new Set([...f, ...selected])]); // freeze
    }
  };

  const handleMassUse = () => {
    const fUtxo = utxos.filter(({ txid, vout }) => selected.includes(`${txid}:${vout}`));
    handleUseCoin(fUtxo);
  };

  // check if any outputs are selected
  const selectionStarted = selected.length > 0;
  // check if all selected items are frozen
  const allFrozen = selectionStarted && selected.reduce((prev, curr) => (prev ? frozen.includes(curr) : false), true);
  const buttonFontSize = PixelRatio.roundToNearestPixel(width / 26) > 22 ? 22 : PixelRatio.roundToNearestPixel(width / 26);

  const renderItem = (p: { item: Utxo }) => {
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
          setSelected(s => {
            if (s.length === 0) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // animate buttons show
            }
            return [...s, `${p.item.txid}:${p.item.vout}`];
          });
        }}
        onDeSelect={() => {
          setSelected(s => {
            const newValue = s.filter(i => i !== `${p.item.txid}:${p.item.vout}`);
            if (newValue.length === 0) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // animate buttons show
            }
            return newValue;
          });
        }}
      />
    );
  };

  const renderOutputModalContent = (o: Utxo | undefined) => {
    if (!o) {
      return null;
    }
    const oFrozen = frozen.includes(`${o.txid}:${o.vout}`);
    const setOFrozen = (value: boolean) => {
      if (value) {
        setFrozen(f => [...f, `${o.txid}:${o.vout}`]);
      } else {
        setFrozen(f => f.filter(i => i !== `${o.txid}:${o.vout}`));
      }
    };
    return <OutputModalContent output={o} wallet={wallet} onUseCoin={handleUseCoin} frozen={oFrozen} setFrozen={setOFrozen} />;
  };

  useEffect(() => {
    if (output) {
      bottomModalRef.current?.present();
    }
  }, [output]);

  const toolTipActions = useMemo((): Action[] | Action[][] => {
    return [
      [sortDirection === ESortDirections.asc ? CommonToolTipActions.SortASC : CommonToolTipActions.SortDESC],
      [
        { ...CommonToolTipActions.SortHeight, menuState: sortType === ESortTypes.height },
        { ...CommonToolTipActions.SortValue, menuState: sortType === ESortTypes.value },
        { ...CommonToolTipActions.SortLabel, menuState: sortType === ESortTypes.label },
        { ...CommonToolTipActions.SortStatus, menuState: sortType === ESortTypes.frozen },
      ],
    ];
  }, [sortDirection, sortType]);

  const toolTipOnPressMenuItem = useCallback((menuItem: string) => {
    Keyboard.dismiss();
    if (menuItem === CommonToolTipActions.SortASC.id) {
      setSortDirection(ESortDirections.desc);
    } else if (menuItem === CommonToolTipActions.SortDESC.id) {
      setSortDirection(ESortDirections.asc);
    } else if (menuItem === CommonToolTipActions.SortHeight.id) {
      setSortType(ESortTypes.height);
    } else if (menuItem === CommonToolTipActions.SortValue.id) {
      setSortType(ESortTypes.value);
    } else if (menuItem === CommonToolTipActions.SortLabel.id) {
      setSortType(ESortTypes.label);
    } else if (menuItem === CommonToolTipActions.SortStatus.id) {
      setSortType(ESortTypes.frozen);
    }
  }, []);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton onPressMenuItem={toolTipOnPressMenuItem} actions={toolTipActions} title={loc.cc.sort_by} />,
    [toolTipOnPressMenuItem, toolTipActions],
  );

  // Adding the ToolTipMenu to the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => HeaderRight,
    });
  }, [HeaderRight, navigation]);

  if (loading) {
    return (
      <SafeArea style={[styles.center, { backgroundColor: colors.elevated }]}>
        <ActivityIndicator testID="Loading" />
      </SafeArea>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.elevated }]}>
      {utxos.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ color: colors.foregroundColor }}>{loc.cc.empty}</Text>
        </View>
      )}

      <BottomModal
        ref={bottomModalRef}
        onClose={() => {
          Keyboard.dismiss();
          setOutput(undefined);
        }}
        backgroundColor={colors.elevated}
        contentContainerStyle={styles.modalMinHeight}
        footer={
          <View style={mStyles.buttonContainer}>
            <Button
              testID="UseCoin"
              title={loc.cc.use_coin}
              onPress={async () => {
                if (!output) throw new Error('output is not set');
                await bottomModalRef.current?.dismiss();
                handleUseCoin([output]);
              }}
            />
          </View>
        }
      >
        {renderOutputModalContent(output)}
      </BottomModal>
      <FlatList
        ListHeaderComponent={tipCoins}
        data={utxos}
        renderItem={renderItem}
        keyExtractor={item => `${item.txid}:${item.vout}`}
        contentInset={styles.listContent}
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
  modalMinHeight: Platform.OS === 'android' ? { minHeight: 530 } : {},
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
  badges: {
    flexDirection: 'row',
  },
  listContent: {
    top: 0,
    left: 0,
    bottom: 70,
    right: 0,
  },
});

export default CoinControl;
