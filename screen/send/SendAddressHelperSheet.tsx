import { sha256 } from '@noble/hashes/sha256';
import { StackActions, useNavigation, useRoute, RouteProp, useLocale } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { readClipboardForDetection } from '../../blue_modules/clipboard';
import { classifyClipboardPayment, ClipboardPaymentKind } from '../../blue_modules/clipboardPayment';
import { recentSendDestinations } from '../../blue_modules/recentSendDestinations';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import { TWallet } from '../../class/wallets/types';
import presentAlert from '../../components/Alert';
import ClipboardDetectedItem from '../../components/ClipboardDetectedItem';
import Icon from '../../components/Icon';
import ScalePressable, { usePressScale } from '../../components/ScalePressable';
import { useTheme } from '../../components/themes';
import WalletListItem from '../../components/WalletListItem';
import { getWalletIconImage } from '../../components/ManageWalletsListItem';
import { errorMessage } from '../../helpers/errorMessage';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';

type RouteProps = RouteProp<SendDetailsStackParamList, 'SendAddressHelper'>;
type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'SendAddressHelper'>;

const AddressHelperTab = {
  Wallets: 'wallets',
  Latest: 'latest',
  Paycodes: 'paycodes',
} as const;
type AddressHelperTab = (typeof AddressHelperTab)[keyof typeof AddressHelperTab];

const shortenName = (name: string): string => {
  if (name.length < 20) return name;
  return name.substring(0, 10) + '...' + name.substring(name.length - 10);
};

const paycodesForWallet = (wallet: TWallet | undefined, hidden: (pc: string) => boolean): string[] => {
  if (!(wallet instanceof AbstractHDElectrumWallet)) return [];
  const codes = [...(wallet.getBIP47SenderPaymentCodes() ?? []), ...(wallet.getBIP47ReceiverPaymentCodes() ?? [])];
  return codes.filter((pc, index) => codes.indexOf(pc) === index && !hidden(pc));
};

const SendAddressHelperSheet = () => {
  const navigation = useNavigation<NavigationProps>();
  const { walletID } = useRoute<RouteProps>().params;
  const { wallets, counterpartyMetadata } = useStorage();
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const wallet = useMemo(() => wallets.find(item => item.getID() === walletID), [wallets, walletID]);
  const [clipboardPayload, setClipboardPayload] = useState<string | undefined>();
  const [clipboardReady, setClipboardReady] = useState(false);
  const [tab, setTab] = useState<AddressHelperTab>(AddressHelperTab.Wallets);
  const [loadingWalletId, setLoadingWalletId] = useState<string | null>(null);
  const loadingWalletIdRef = useRef<string | null>(null);

  const destinationWallets = useMemo(
    () => wallets.filter(item => item.chain === Chain.ONCHAIN && item.getID() !== walletID),
    [wallets, walletID],
  );
  const latest = useMemo(() => {
    if (!wallet) return [];
    return recentSendDestinations(wallet.getTransactions(), address => wallet.weOwnAddress(address));
  }, [wallet]);
  const paycodes = useMemo(
    () => paycodesForWallet(wallet, pc => Boolean(counterpartyMetadata[pc]?.hidden)),
    [wallet, counterpartyMetadata],
  );

  const tabs = useMemo(() => {
    const available: AddressHelperTab[] = [];
    if (destinationWallets.length > 0) available.push(AddressHelperTab.Wallets);
    if (latest.length > 0) available.push(AddressHelperTab.Latest);
    if (paycodes.length > 0) available.push(AddressHelperTab.Paycodes);
    return available;
  }, [destinationWallets.length, latest.length, paycodes.length]);

  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { content } = await readClipboardForDetection();
      if (cancelled) return;
      const classified = classifyClipboardPayment(content);
      if (classified?.kind === ClipboardPaymentKind.Bitcoin) setClipboardPayload(classified.payload);
      setClipboardReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stylesHook = StyleSheet.create({
    title: { color: colors.alternativeTextColor },
    screen: { backgroundColor: colors.modal },
    iconButton: { backgroundColor: colors.lightButton },
    icon: { color: colors.foregroundColor },
    tabSelected: { backgroundColor: dark ? colors.buttonBackgroundColor : colors.buttonGrayBackgroundColor },
    tabLabel: { color: colors.alternativeTextColor },
    tabLabelSelected: { color: colors.foregroundColor },
    address: { color: colors.foregroundColor },
    used: { color: colors.alternativeTextColor },
    empty: { color: colors.alternativeTextColor },
    content: { paddingBottom: insets.bottom + 24 },
  });

  const applySelection = useCallback(
    (payload: string) => {
      const decoded = DeeplinkSchemaMatch.decodeBitcoinUri(payload.trim());
      const address = decoded.address || payload.trim();
      const hasPositiveAmount = Number(decoded.amount) > 0;
      navigation.dispatch(
        StackActions.popTo(
          'SendDetails',
          {
            walletID,
            uri: undefined,
            address: undefined,
            addRecipientParams: {
              address,
              ...(hasPositiveAmount ? { amount: decoded.amount } : {}),
              ...(decoded.memo ? { memo: decoded.memo } : {}),
              ...(decoded.payjoinUrl
                ? {
                    payjoinUrl: decoded.payjoinUrl,
                    payjoinDisableOutputSubstitution: decoded.disableOutputSubstitution,
                  }
                : {}),
            },
          },
          { merge: true },
        ),
      );
    },
    [navigation, walletID],
  );

  const onKeyboard = useCallback(() => {
    navigation.dispatch(StackActions.popTo('SendDetails', { focusAddressInput: true }, { merge: true }));
  }, [navigation]);

  const onPickWallet = useCallback(
    async (item: TWallet) => {
      if (loadingWalletIdRef.current) return;
      loadingWalletIdRef.current = item.getID();
      setLoadingWalletId(item.getID());
      try {
        const address = await item.getAddressAsync();
        if (!address) {
          presentAlert({ message: loc.send.details_address_field_is_not_valid });
          return;
        }
        applySelection(String(address));
      } catch (error) {
        presentAlert({ message: errorMessage(error) || loc.errors.network });
      } finally {
        loadingWalletIdRef.current = null;
        setLoadingWalletId(null);
      }
    },
    [applySelection],
  );

  const tabLabel = (value: AddressHelperTab): string => {
    if (value === AddressHelperTab.Wallets) return loc.wallets.wallets;
    if (value === AddressHelperTab.Latest) return loc.send.address_helper_latest;
    return loc.send.address_helper_paycodes;
  };

  const showEmpty = clipboardReady && !clipboardPayload && tabs.length === 0;

  return (
    <ScrollView
      style={[styles.list, stylesHook.screen]}
      contentContainerStyle={[styles.content, stylesHook.content]}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, stylesHook.title]}>
          {loc.send.address_helper}
        </Text>
        <ScalePressable
          accessibilityLabel={loc.send.address_helper_keyboard}
          onPress={onKeyboard}
          style={[styles.iconButton, stylesHook.iconButton]}
          testID="AddressHelperKeyboard"
        >
          <Icon name="keyboard" type="material" size={22} color={colors.alternativeTextColor} />
        </ScalePressable>
        {Platform.OS === 'android' ? (
          <ScalePressable
            accessibilityLabel={loc._.close}
            onPress={() => navigation.goBack()}
            style={[styles.iconButton, stylesHook.iconButton]}
          >
            <Icon name="close" type="ionicons" size={22} color={stylesHook.icon.color} />
          </ScalePressable>
        ) : null}
      </View>
      {clipboardPayload ? (
        <View style={styles.inset}>
          <ClipboardDetectedItem largeLabel value={clipboardPayload} onPress={() => applySelection(clipboardPayload)} />
        </View>
      ) : null}
      {tabs.length > 1 && activeTab ? (
        <View style={styles.tabs}>
          {tabs.map(value => {
            const selected = value === activeTab;
            return (
              <ScalePressable
                key={value}
                accessibilityState={{ selected }}
                onPress={() => setTab(value)}
                style={[styles.tab, selected && stylesHook.tabSelected]}
              >
                <Text style={[styles.tabLabel, selected ? stylesHook.tabLabelSelected : stylesHook.tabLabel]}>{tabLabel(value)}</Text>
              </ScalePressable>
            );
          })}
        </View>
      ) : null}
      {activeTab === AddressHelperTab.Wallets
        ? destinationWallets.map(item => (
            <DestinationWalletRow
              key={item.getID()}
              item={item}
              loading={loadingWalletId === item.getID()}
              disabled={Boolean(loadingWalletId)}
              onPress={() => onPickWallet(item)}
            />
          ))
        : null}
      {activeTab === AddressHelperTab.Latest
        ? latest.map(item => (
            <ScalePressable key={item.address} onPress={() => applySelection(item.address)} style={styles.latestRow}>
              <Text style={[styles.latestAddress, stylesHook.address]}>{item.address}</Text>
              <Text style={[styles.latestUsed, stylesHook.used]}>
                {loc.formatString(loc.send.address_helper_used, { count: item.count })}
              </Text>
            </ScalePressable>
          ))
        : null}
      {activeTab === AddressHelperTab.Paycodes
        ? paycodes.map(pc => (
            <PaycodeRow key={pc} paymentCode={pc} label={counterpartyMetadata[pc]?.label} onPress={() => applySelection(pc)} />
          ))
        : null}
      {showEmpty ? <Text style={[styles.empty, stylesHook.empty]}>{loc.send.address_helper_empty}</Text> : null}
    </ScrollView>
  );
};

const PaycodeRow = ({ paymentCode, label, onPress }: { paymentCode: string; label?: string; onPress: () => void }) => {
  const { colors } = useTheme();
  const color = uint8ArrayToHex(sha256(paymentCode)).substring(0, 6);
  const stylesHook = StyleSheet.create({
    circle: { backgroundColor: '#' + color },
    name: { color: colors.labelText },
  });
  return (
    <ScalePressable onPress={onPress} style={styles.paycodeRow}>
      <View style={[styles.circle, stylesHook.circle]} />
      <Text numberOfLines={1} style={[styles.paycodeName, stylesHook.name]}>
        {shortenName(label || paymentCode)}
      </Text>
    </ScalePressable>
  );
};

const DestinationWalletRow = ({
  item,
  loading,
  disabled,
  onPress,
}: {
  item: TWallet;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) => {
  const { colors, dark } = useTheme();
  const { direction } = useLocale();
  const { scaleStyle, onPressIn, onPressOut, pressHaptic } = usePressScale();
  const titleColor = dark ? colors.foregroundColor : colors.darkGray;
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={styles.walletRow}>
      <Animated.View style={scaleStyle}>
        <WalletListItem
          wallet={item}
          iconImage={getWalletIconImage(item.type, direction)}
          onPress={() => {
            pressHaptic();
            onPress();
          }}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          searchQuery=""
          borderBottomColor={colors.lightBorder}
          backgroundColor={colors.modal}
          titleColor={titleColor}
        />
      </Animated.View>
      {loading ? <ActivityIndicator style={styles.walletSpinner} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  content: {
    paddingTop: 4,
  },
  inset: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 4,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  walletRow: {
    justifyContent: 'center',
  },
  walletSpinner: {
    position: 'absolute',
    right: 16,
  },
  latestRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  latestAddress: {
    fontSize: 15,
    fontWeight: '600',
  },
  latestUsed: {
    fontSize: 13,
    marginTop: 2,
  },
  paycodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  circle: {
    width: 35,
    height: 35,
    borderRadius: 18,
  },
  paycodeName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  empty: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
});

export default SendAddressHelperSheet;
