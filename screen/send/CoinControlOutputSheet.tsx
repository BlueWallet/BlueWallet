import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, StackActions, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import debounce from '../../blue_modules/debounce';
import ListItem from '../../components/ListItem';
import { BlueSpacing10 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import { Avatar, ListItem as RNElementsListItem } from '@rneui/themed';
import * as RNLocalize from 'react-native-localize';
import { useKeyboard } from '../../hooks/useKeyboard';
import HeaderRightButton from '../../components/HeaderRightButton';

type RouteProps = RouteProp<SendDetailsStackParamList, 'CoinControlOutput'>;
type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'CoinControlOutput'>;

const CoinControlOutputSheet: React.FC = () => {
  const navigation = useExtendedNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { walletID, utxo } = route.params;
  const { wallets, txMetadata, saveToDisk } = useStorage();
  const wallet = useMemo(() => wallets.find(w => w.getID() === walletID), [walletID, wallets]);
  const { colors } = useTheme();
  const { isVisible } = useKeyboard();

  const [memo, setMemo] = useState<string>('');
  const [frozen, setFrozen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!wallet) return;
    const meta = wallet.getUTXOMetadata(utxo.txid, utxo.vout);
    setMemo(meta.memo || txMetadata[utxo.txid]?.memo || '');
    setFrozen(Boolean(meta.frozen));
    setLoading(false);
  }, [txMetadata, utxo.txid, utxo.vout, wallet]);

  const switchValue = useMemo(
    () => ({
      value: frozen,
      onValueChange: async (value: boolean) => {
        if (!wallet) return;
        setFrozen(value);
        wallet.setUTXOMetadata(utxo.txid, utxo.vout, { frozen: value });
        await saveToDisk();
      },
    }),
    [frozen, saveToDisk, utxo.txid, utxo.vout, wallet],
  );

  const onMemoChange = (value: string) => setMemo(value);

  const debouncedSaveMemo = useRef(
    debounce(async m => {
      if (!wallet) return;
      wallet.setUTXOMetadata(utxo.txid, utxo.vout, { memo: m });
      await saveToDisk();
    }, 500),
  );

  useEffect(() => {
    debouncedSaveMemo.current(memo);
  }, [memo]);

  const amount = formatBalance(utxo.value, wallet?.getPreferredBalanceUnit?.() ?? BitcoinUnit.BTC, true);
  const color = `#${utxo.txid.substring(0, 6)}`;
  const confirmationsFormatted = useMemo(
    () => new Intl.NumberFormat(RNLocalize.getLocales()[0].languageCode, { maximumSignificantDigits: 3 }).format(utxo.confirmations ?? 0),
    [utxo.confirmations],
  );

  const handleUseCoin = useCallback(async () => {
    if (!wallet) return;
    debouncedSaveMemo.current.cancel();
    wallet.setUTXOMetadata(utxo.txid, utxo.vout, { memo });
    await saveToDisk();
    const popToAction = StackActions.popTo('SendDetails', { walletID, utxos: [utxo] }, { merge: true });
    navigation.dispatch(popToAction);
  }, [memo, navigation, saveToDisk, utxo, wallet, walletID]);

  const applyChangesAndClose = useCallback(async () => {
    if (!wallet) return;
    debouncedSaveMemo.current.cancel();
    wallet.setUTXOMetadata(utxo.txid, utxo.vout, { memo });
    await saveToDisk();
    navigation.goBack();
  }, [memo, navigation, saveToDisk, utxo.txid, utxo.vout, wallet]);

  const renderDoneButton = useCallback(
    () => (
      <HeaderRightButton
        title={loc.send.input_done}
        onPress={applyChangesAndClose}
        disabled={loading || !wallet}
        testID="ModalDoneButton"
      />
    ),
    [applyChangesAndClose, loading, wallet],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: renderDoneButton,
    });
  }, [navigation, renderDoneButton]);

  if (!wallet) {
    return (
      <View style={[styles.center, { backgroundColor: colors.elevated }]}>
        <Text style={{ color: colors.foregroundColor }}>{loc.wallets.import_discovery_no_wallets}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.elevated }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={12}>
        <RNElementsListItem bottomDivider containerStyle={styles.headerContainer}>
          <View style={styles.rowContent}>
            <Avatar rounded size={40} containerStyle={[styles.avatar, { backgroundColor: color }]} />
            <RNElementsListItem.Content>
              <RNElementsListItem.Title numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, { color: colors.foregroundColor }]}>
                {amount}
                <View style={styles.tranContainer}>
                  <Text style={[styles.tranText, { color: colors.alternativeTextColor }]}>
                    {loc.formatString(loc.transactions.list_conf, { number: confirmationsFormatted })}
                  </Text>
                </View>
              </RNElementsListItem.Title>
              {memo ? (
                <>
                  <RNElementsListItem.Subtitle style={[styles.memo, { color: colors.alternativeTextColor }]}>
                    {memo}
                  </RNElementsListItem.Subtitle>
                  <BlueSpacing10 />
                </>
              ) : null}
              <RNElementsListItem.Subtitle style={[styles.memo, { color: colors.alternativeTextColor }]}>
                {utxo.address}
              </RNElementsListItem.Subtitle>
              <BlueSpacing10 />
              <RNElementsListItem.Subtitle
                style={[styles.memo, { color: colors.alternativeTextColor }]}
              >{`${utxo.txid}:${utxo.vout}`}</RNElementsListItem.Subtitle>
            </RNElementsListItem.Content>
          </View>
        </RNElementsListItem>

        <View style={styles.content}>
          <TextInput
            testID="OutputMemo"
            placeholder={loc.send.details_note_placeholder}
            value={memo}
            placeholderTextColor="#81868e"
            editable={!loading}
            style={[
              styles.memoTextInput,
              {
                borderColor: colors.formBorder,
                borderBottomColor: colors.formBorder,
                backgroundColor: colors.inputBackgroundColor,
                color: colors.foregroundColor,
              },
            ]}
            onChangeText={onMemoChange}
          />
          <ListItem
            title={loc.cc.freezeLabel}
            containerStyle={styles.transparentBackground}
            Component={TouchableWithoutFeedback}
            switch={switchValue}
          />
        </View>

        <View style={styles.buttonContainer}>
          {!isVisible && <Button testID="UseCoin" title={loc.cc.use_coin} onPress={handleUseCoin} disabled={loading} />}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingHorizontal: 0,
    borderBottomColor: 'transparent',
    backgroundColor: 'transparent',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: { borderColor: 'white', borderWidth: 1 },
  amount: { fontWeight: 'bold' },
  tranContainer: { paddingLeft: 20 },
  tranText: { fontWeight: 'normal', fontSize: 13 },
  memo: { fontSize: 13, marginTop: 3 },
  content: {
    paddingTop: 12,
    flex: 1,
  },
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
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    height: 45,
    marginBottom: 36,
  },
});

export default CoinControlOutputSheet;
