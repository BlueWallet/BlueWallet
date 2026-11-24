/**
 * Minimal transaction status screen.
 *
 * The original Bitcoin-era version offered RBF/CPFP fee bumping plus full
 * confirmation tracking via Electrum. None of that maps onto Neurai today, so
 * this is a stripped-down view that shows confirmations from the cached
 * wallet transaction list and lets the user copy the txid or open it in the
 * configured block explorer.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';

import { BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import type { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import type { Transaction } from '../../class/wallets/types';
import { getBlockExplorerUrl, getBlockExplorerUrlForWallet, getTestnetBlockExplorerUrl } from '../../models/blockExplorer';
import NeuraiLoader from '../../components/NeuraiLoader';

type RouteProps = RouteProp<DetailViewStackParamList, 'TransactionStatus'>;

const TransactionStatus: React.FC = () => {
  const { colors } = useTheme();
  const { params } = useRoute<RouteProps>();
  const { wallets } = useStorage();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const wallet = params.walletID ? wallets.find(w => w.getID() === params.walletID) : undefined;
    Promise.all([getBlockExplorerUrl(), getTestnetBlockExplorerUrl()])
      .then(([mainnetUrl, testnetUrl]) => setExplorerUrl(getBlockExplorerUrlForWallet(wallet as any, mainnetUrl, testnetUrl)))
      .catch(() => setExplorerUrl(''));
  }, [params.walletID, wallets]);

  useFocusEffect(
    useCallback(() => {
      const wallet = params.walletID ? wallets.find(w => w.getID() === params.walletID) : undefined;
      const candidate =
        (wallet ? wallet.getTransactions() : wallets.flatMap(w => w.getTransactions())).find(
          (t: Transaction) => t.hash === params.hash || t.txid === params.hash,
        ) ?? null;
      setTx(candidate);
      setIsLoading(false);
    }, [params.hash, params.walletID, wallets]),
  );

  const themed = useMemo(
    () => ({
      root: { flex: 1, backgroundColor: colors.elevated },
      title: { color: colors.foregroundColor },
      rowLabel: { color: colors.foregroundColor },
      rowValue: { color: colors.foregroundColor },
    }),
    [colors],
  );

  const copyTxid = () => {
    if (!tx?.hash) return;
    Clipboard.setString(tx.hash);
    presentAlert({ message: loc._.clipboard });
  };

  const openInExplorer = () => {
    if (!tx?.hash || !explorerUrl) return;
    Linking.openURL(`${explorerUrl}/tx/${tx.hash}`).catch(err => console.warn('Failed to open explorer:', err));
  };

  if (isLoading) {
    return (
      <SafeArea>
        <View style={[styles.flex, themed.root]}>
          <NeuraiLoader />
        </View>
      </SafeArea>
    );
  }

  if (!tx) {
    return (
      <SafeArea>
        <View style={[styles.flex, themed.root]}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <BlueText>{loc.errors.error}</BlueText>
            <Text style={[styles.rowValue, themed.rowValue]}>{params.hash}</Text>
          </ScrollView>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <View style={[styles.flex, themed.root]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, themed.title]}>
            {tx.confirmations > 0
              ? loc.transactions.confirmations_lowercase.replace('{confirmations}', String(tx.confirmations))
              : loc.transactions.pending}
          </Text>
          <Text style={[styles.rowLabel, themed.rowLabel]}>{loc.transactions.txid}</Text>
          <Text style={[styles.rowValue, themed.rowValue]} selectable>
            {tx.hash}
          </Text>
          <Text style={[styles.rowLabel, themed.rowLabel]}>{loc.transactions.list_conf.replace('{number}', String(tx.confirmations))}</Text>
          <BlueSpacing20 />
          <Button title={loc.transactions.details_copy} onPress={copyTxid} />
          <BlueSpacing20 />
          {explorerUrl ? <Button title={loc.transactions.details_view_in_browser} onPress={openInExplorer} /> : null}
        </ScrollView>
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 20 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  rowLabel: { fontSize: 12, opacity: 0.6, marginTop: 12 },
  rowValue: { fontSize: 14, fontWeight: '500' },
});

export default TransactionStatus;
