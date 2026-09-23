import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import dayjs from 'dayjs';
import { calculateBlockTime } from '../../blue_modules/BlueElectrum';
import debounce from '../../blue_modules/debounce';
import Avatar from '../../components/Avatar';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import ListItem from '../../components/ListItem';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { goFromCoinControlToSendDetails } from '../../navigation/goFromCoinControlToSendDetails';
import { SendDetailsStackParamList } from '../../navigation/SendDetailsStackParamList';
import { useStorage } from '../../hooks/context/useStorage';
import { useKeyboard } from '../../hooks/useKeyboard';

type RouteProps = RouteProp<SendDetailsStackParamList, 'CoinControlOutput'>;
type NavigationProps = NativeStackNavigationProp<SendDetailsStackParamList, 'CoinControlOutput'>;

const CoinControlOutputSheet: React.FC = () => {
  const navigation = useNavigation<NavigationProps>();
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
      testID: 'FreezeSwitch',
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

  const addressTextStyle = useMemo(
    () => ({
      fontSize: 13,
      color: colors.alternativeTextColor,
      textAlign: 'left' as const,
    }),
    [colors.alternativeTextColor],
  );

  const amount = formatBalance(utxo.value, wallet?.getPreferredBalanceUnit?.() ?? BitcoinUnit.BTC, true);
  const color = `#${utxo.txid.substring(0, 6)}`;
  const receivedDate = useMemo(() => {
    let timestamp: number | undefined;
    try {
      const tx = wallet?.getTransactions().find(item => item.txid === utxo.txid || item.hash === utxo.txid);
      timestamp = tx?.timestamp || tx?.blocktime || tx?.time;
    } catch {
      timestamp = undefined;
    }
    if (timestamp && timestamp > 0) return dayjs(timestamp * 1000).format('LL');
    if (utxo.height > 0) return dayjs(calculateBlockTime(utxo.height) * 1000).format('LL');
    return loc.transactions.pending;
  }, [utxo.height, utxo.txid, wallet]);

  const handleUseCoin = useCallback(async () => {
    if (!wallet || frozen) return;
    debouncedSaveMemo.current.cancel();
    wallet.setUTXOMetadata(utxo.txid, utxo.vout, { memo });
    await saveToDisk();
    goFromCoinControlToSendDetails(navigation, walletID, [utxo]);
  }, [frozen, memo, navigation, saveToDisk, utxo, wallet, walletID]);

  if (!wallet) {
    return (
      <View style={[styles.center, { backgroundColor: colors.elevated }]}>
        <Text style={{ color: colors.foregroundColor }}>{loc.wallets.import_discovery_no_wallets}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.elevated }]}>
      <View style={styles.flex}>
        <View style={styles.headerContainer}>
          <View style={styles.rowContent}>
            <Avatar rounded size={40} containerStyle={[styles.avatar, { backgroundColor: color }]} />
            <View style={styles.listContent}>
              <Text numberOfLines={1} style={[styles.amount, { color: colors.foregroundColor }]}>
                {amount}
              </Text>
              <Text style={[styles.tranText, { color: colors.alternativeTextColor }]}>{receivedDate}</Text>
            </View>
          </View>
          <CopyTextToClipboard text={utxo.address} isAddress textAlign="left" style={addressTextStyle} />
        </View>

        <View style={styles.content}>
          <View
            style={[
              styles.memoInput,
              {
                borderColor: colors.formBorder,
                borderBottomColor: colors.formBorder,
                backgroundColor: colors.inputBackgroundColor,
              },
            ]}
          >
            <TextInput
              testID="OutputMemo"
              placeholder={loc.send.details_note_placeholder}
              value={memo}
              placeholderTextColor="#81868e"
              numberOfLines={1}
              editable={!loading}
              style={[styles.memoText, { color: colors.foregroundColor }]}
              onChangeText={onMemoChange}
            />
          </View>
          <ListItem title={loc.cc.freezeLabel} switch={switchValue} bottomDivider={false} containerStyle={styles.freezeRow} />
        </View>

        <View style={styles.buttonContainer}>
          {!isVisible && <Button testID="UseCoin" title={loc.cc.use_coin} onPress={handleUseCoin} disabled={loading || frozen} />}
        </View>
      </View>
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
    gap: 10,
  },
  listContent: {
    flex: 1,
  },
  avatar: { borderColor: 'white', borderWidth: 1 },
  amount: { fontWeight: 'bold', fontSize: 22 },
  tranText: { fontWeight: 'normal', fontSize: 13 },
  content: {
    paddingTop: 12,
    flex: 1,
  },
  freezeRow: {
    backgroundColor: 'transparent',
    marginHorizontal: -16,
    marginVertical: 16,
  },
  memoInput: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  memoText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    fontSize: 15,
    lineHeight: 19,
  },
  buttonContainer: {
    height: 45,
    marginBottom: 36,
  },
});

export default CoinControlOutputSheet;
