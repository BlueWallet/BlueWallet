import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';
import { Animated, ActivityIndicator, PixelRatio, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { TWallet, Utxo } from '../../class/wallets/types';
import { FButton, FContainer } from '../../components/FloatButtons';
import SafeArea from '../../components/SafeArea';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { goFromCoinControlToSendDetails } from '../../navigation/goFromCoinControlToSendDetails';
import { CoinControlSortDirection, CoinControlSortType, SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import useWalletUtxos, { useWalletUtxoMutations, useWalletUtxoSelection } from '../../hooks/useWalletUtxos';
import type { RealmUtxo } from '../../blue_modules/realm/appDataRepository';
import { useTransactionMemo } from '../../hooks/useRealmMetadata';

type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'CoinControl'>;
type RouteProps = RouteProp<SendDetailsStackParamList, 'CoinControl'>;

const FrozenBadge: React.FC = () => {
  const { colors } = useTheme();
  return (
    <Badge
      testID="FrozenBadge"
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
      testID="ChangeBadge"
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
      Animated.timing(heightAnim, {
        toValue: newHeight,
        duration: 250,
        useNativeDriver: false,
      }).start();
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
  const transactionMemo = useTransactionMemo(txid);
  const memo = oMemo || transactionMemo;
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalance(value, balanceUnit, true);

  let onPress = onOpen;
  if (selectionStarted) {
    onPress = selected ? onDeSelect : onSelect;
  }

  const oStyles = StyleSheet.create({
    container: {
      borderBottomColor: colors.lightBorder,
      backgroundColor: 'transparent',
    },
    avatar: { borderColor: 'white', borderWidth: 1, backgroundColor: color },
    avatarSelected: {
      borderColor: 'white',
      borderWidth: 1,
      backgroundColor: colors.successColor,
    },
    amount: { fontWeight: 'bold', color: colors.foregroundColor },
    memo: { fontSize: 13, marginTop: 3, color: colors.alternativeTextColor },
    containerSelected: {
      backgroundColor: colors.ballOutgoingExpired,
      borderBottomColor: 'rgba(0, 0, 0, 0)',
    },
  });

  return (
    <Pressable onPress={onPress} style={[styles.listRow, selected ? oStyles.containerSelected : oStyles.container]}>
      <Avatar
        rounded
        size={40}
        containerStyle={selected ? oStyles.avatarSelected : oStyles.avatar}
        onPress={selected ? onDeSelect : onSelect}
        icon={
          selected
            ? {
                name: 'check',
                type: 'font-awesome-6',
                color: 'white',
                size: 18,
              }
            : undefined
        }
      />
      <View style={styles.itemContent}>
        <Text style={oStyles.amount}>{amount}</Text>
        <Text testID="OutputMemoLabel" style={oStyles.memo} numberOfLines={1} ellipsizeMode="middle">
          {memo || address}
        </Text>
      </View>
      <View style={styles.badges}>
        {frozen && <FrozenBadge />}
        {change && <ChangeBadge />}
      </View>
    </Pressable>
  );
};

const CoinControl: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProps>();
  const { width } = useWindowDimensions();
  const route = useRoute<RouteProps>();
  const { walletID } = route.params;
  const { wallets, fetchWalletUtxos, sleep } = useStorage();
  const sortDirection = route.params?.sortDirection ?? CoinControlSortDirection.ASC;
  const sortType = route.params?.sortType ?? CoinControlSortType.HEIGHT;
  const wallet = useMemo(() => wallets.find(w => w.getID() === walletID) as TWallet, [walletID, wallets]);
  const utxos = useWalletUtxos(walletID, { sortType, sortDirection });
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<string[]>([]);
  const { utxos: selectedUtxos, totalValue: selectedValue, allFrozen } = useWalletUtxoSelection(walletID, selected);
  const { setOutpointsFrozen } = useWalletUtxoMutations(walletID);

  useEffect(() => {
    (async () => {
      try {
        await Promise.race([fetchWalletUtxos(wallet.getID()), sleep(10000)]);
      } catch (e) {
        console.log('coincontrol wallet.fetchUtxo() failed'); // either sleep expired or fetchUtxo threw an exception
      }
      setLoading(false);
    })();
  }, [fetchWalletUtxos, wallet, setLoading, sleep]);

  useEffect(() => {
    setSelected([]);
  }, [walletID]);

  useEffect(() => {
    const hasUtxos = utxos.length > 0;
    const nextParams: Partial<SendDetailsStackParamList['CoinControl']> = {};
    if (route.params?.hasUtxos !== hasUtxos) {
      nextParams.hasUtxos = hasUtxos;
    }

    if (Object.keys(nextParams).length > 0) {
      navigation.setParams(nextParams);
    }
  }, [navigation, route.params?.hasUtxos, utxos.length]);

  const tipText = useMemo(() => {
    if (utxos.length === 0) return '';
    if (selected.length === 0) return loc.cc.tip;
    const value = formatBalance(selectedValue, wallet.getPreferredBalanceUnit(), true);
    return loc.formatString(loc.cc.selected_summ, { value });
  }, [selected.length, selectedValue, utxos.length, wallet]);

  const tipCoins = () => {
    if (utxos.length === 0) return null;
    return <AnimatedTip text={tipText} />;
  };

  const handleChoose = (item: Utxo) => navigation.navigate('CoinControlOutput', { walletID, utxo: item });

  const handleUseCoin = (u: Utxo[]) => {
    goFromCoinControlToSendDetails(navigation, walletID, u);
  };

  const handleMassFreeze = () => setOutpointsFrozen(selected, !allFrozen);

  const handleMassUse = () => {
    handleUseCoin(selectedUtxos);
  };

  // check if any outputs are selected
  const selectionStarted = selected.length > 0;
  const buttonFontSize = PixelRatio.roundToNearestPixel(width / 26) > 22 ? 22 : PixelRatio.roundToNearestPixel(width / 26);

  const renderItem = (item: RealmUtxo) => {
    const key = `${item.txid}:${item.vout}`;
    const { memo } = item;
    const isChange = wallet.addressIsChange(item.address);
    return (
      <OutputList
        key={key}
        balanceUnit={wallet.getPreferredBalanceUnit()}
        item={item}
        oMemo={memo}
        frozen={item.frozen}
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
            icon={<Icon name="snowflake" size={buttonFontSize} type="font-awesome-6" color={colors.buttonAlternativeTextColor} />}
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
  badges: {
    flexDirection: 'row',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
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
});

export default CoinControl;
