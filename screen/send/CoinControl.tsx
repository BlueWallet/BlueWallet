import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, StackActions, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, Badge, Icon, ListItem as RNElementsListItem } from '@rneui/themed';
import { ActivityIndicator, Animated, Keyboard, PixelRatio, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import debounce from '../../blue_modules/debounce';
import { TWallet, Utxo } from '../../class/wallets/types';
import { FButton, FContainer } from '../../components/FloatButtons';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import SafeArea from '../../components/SafeArea';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
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
  return (
    <Badge
      value={loc.cc.freeze}
      badgeStyle={[styles.badge, { backgroundColor: colors.redBG }]}
      textStyle={[styles.badgeText, { color: colors.redText }]}
    />
  );
};

const ChangeBadge: React.FC = () => {
  const { colors } = useTheme();
  return (
    <Badge
      value={loc.cc.change}
      badgeStyle={[styles.badge, { backgroundColor: colors.buttonDisabledBackgroundColor }]}
      textStyle={[styles.badgeText, { color: colors.alternativeTextColor }]}
    />
  );
};

const AnimatedTip: React.FC<{ text: string }> = ({ text }) => {
  const { colors } = useTheme();
  const heightAnim = useRef(new Animated.Value(0)).current;
  const currentHeight = useRef(0);
  const [measured, setMeasured] = useState(false);

  const onContentLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const newHeight = e.nativeEvent.layout.height;
      if (!measured) {
        currentHeight.current = newHeight;
        heightAnim.setValue(newHeight);
        setMeasured(true);
        return;
      }
      if (Math.abs(newHeight - currentHeight.current) < 1) return;
      currentHeight.current = newHeight;
      Animated.timing(heightAnim, { toValue: newHeight, duration: 250, useNativeDriver: false }).start();
    },
    [heightAnim, measured],
  );

  return (
    <Animated.View style={[styles.tipOuter, measured && styles.tipOverflow, measured && { height: heightAnim }]}>
      <View
        onLayout={onContentLayout}
        style={[styles.tipContainer, { backgroundColor: colors.ballOutgoingExpired }, measured && styles.tipAbsolute]}
      >
        <Text style={{ color: colors.foregroundColor }}>{text}</Text>
      </View>
    </Animated.View>
  );
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

  let onPress = onOpen;
  if (selectionStarted) {
    onPress = selected ? onDeSelect : onSelect;
  }

  return (
    <RNElementsListItem
      bottomDivider
      onPress={onPress}
      containerStyle={
        selected
          ? [styles.outputContainer, { backgroundColor: colors.ballOutgoingExpired }]
          : [styles.outputContainer, { borderBottomColor: colors.lightBorder, backgroundColor: colors.elevated }]
      }
    >
      <View style={styles.rowContent}>
        <Avatar
          rounded
          size={40}
          containerStyle={[styles.outputAvatar, { backgroundColor: color }]}
          onPress={selected ? onDeSelect : onSelect}
          icon={selected ? { name: 'check', type: 'font-awesome-6' } : undefined}
        />
        <RNElementsListItem.Content>
          <RNElementsListItem.Title style={[styles.outputAmount, { color: colors.foregroundColor }]}>{amount}</RNElementsListItem.Title>
          <RNElementsListItem.Subtitle
            style={[styles.outputMemo, { color: colors.alternativeTextColor }]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {memo || address}
          </RNElementsListItem.Subtitle>
        </RNElementsListItem.Content>
        <View style={styles.badges}>
          {frozen && <FrozenBadge />}
          {change && <ChangeBadge />}
        </View>
      </View>
    </RNElementsListItem>
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

  useFocusEffect(
    useCallback(() => {
      if (!wallet) return;
      const refreshedFrozen = wallet
        .getUtxo(true)
        .filter(out => wallet.getUTXOMetadata(out.txid, out.vout).frozen)
        .map(({ txid, vout }) => `${txid}:${vout}`);

      setFrozen(refreshedFrozen);
      // Clear any stale selection that might reference outdated frozen state.
      setSelected([]);
    }, [wallet]),
  );

  const tipText = useMemo(() => {
    if (utxos.length === 0) return '';
    if (selected.length === 0) return loc.cc.tip;
    const summ = selected.reduce((prev, curr) => {
      return prev + (utxos.find(({ txid, vout }) => `${txid}:${vout}` === curr) as Utxo).value;
    }, 0);
    const value = formatBalance(summ, wallet.getPreferredBalanceUnit(), true);
    return loc.formatString(loc.cc.selected_summ, { value });
  }, [selected, utxos, wallet]);

  const tipCoins = () => {
    if (utxos.length === 0) return null;
    return <AnimatedTip text={tipText} />;
  };

  const handleChoose = (item: Utxo) => navigation.navigate('CoinControlOutput', { walletID, utxo: item });

  const handleUseCoin = async (u: Utxo[]) => {
    const popToAction = StackActions.popTo('SendDetails', { walletID, utxos: u }, { merge: true });
    navigation.dispatch(popToAction);
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

  const renderItem = (item: Utxo) => {
    const key = `${item.txid}:${item.vout}`;
    const { memo } = wallet.getUTXOMetadata(item.txid, item.vout);
    const isChange = wallet.addressIsChange(item.address);
    const oFrozen = frozen.includes(key);
    return (
      <OutputList
        key={key}
        balanceUnit={wallet.getPreferredBalanceUnit()}
        item={item}
        oMemo={memo}
        frozen={oFrozen}
        change={isChange}
        onOpen={() => handleChoose(item)}
        selected={selected.includes(key)}
        selectionStarted={selectionStarted}
        onSelect={() => {
          setSelected(s => [...s, key]);
        }}
        onDeSelect={() => {
          setSelected(s => s.filter(i => i !== key));
        }}
      />
    );
  };

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
      headerRight: () => (utxos.length > 0 ? HeaderRight : null),
    });
  }, [HeaderRight, navigation, utxos.length]);

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
      <SafeAreaScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.listContent}>
        {tipCoins()}
        {utxos.map(renderItem)}
      </SafeAreaScrollView>

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
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sendIcon: {
    transform: [{ rotate: '225deg' }],
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  badges: {
    flexDirection: 'row',
  },
  listContent: {
    paddingBottom: 70,
  },
  badge: {
    borderWidth: 0,
    marginLeft: 4,
  },
  badgeText: {
    marginTop: -1,
  },
  tipOuter: {
    marginVertical: 24,
    marginHorizontal: 16,
  },
  tipOverflow: {
    overflow: 'hidden',
  },
  tipContainer: {
    borderRadius: 12,
    padding: 16,
  },
  tipAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  outputContainer: {
    borderBottomColor: 'rgba(0, 0, 0, 0)',
  },
  outputAvatar: {
    borderColor: 'white',
    borderWidth: 1,
  },
  outputAmount: {
    fontWeight: 'bold',
  },
  outputMemo: {
    fontSize: 13,
    marginTop: 3,
  },
});

export default CoinControl;
