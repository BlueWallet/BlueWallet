/**
 * Every transaction of one wallet, opened from "See all" next to the home's
 * Transactions heading. Same day cards as the home, loaded a page at a time.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isDesktop } from '../../blue_modules/environment';
import { isTestnetChain } from '../../blue_modules/neurai/networkConfig';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { useHomePalette } from '../../components/home/homeTheme';
import { TransactionDayCard, transactionDayKey, useSortedTransactions, useTransactionDays } from '../../components/home/TransactionDayList';
import { SettingsScreenHeader } from '../../components/settings/SettingsUI';
import { TransactionDay } from '../../helpers/group-transactions-by-day';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useWalletRefresh } from '../../hooks/useWalletRefresh';
import useWalletSubscribe from '../../hooks/useWalletSubscribe';
import loc from '../../loc';
import { XnaUnit } from '../../models/xnaUnits';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const PAGE_SIZE = 30;

const WalletTransactionHistory: React.FC = () => {
  const { walletID } = useRoute<RouteProp<DetailViewStackParamList, 'WalletTransactionHistory'>>().params;
  const wallet = useWalletSubscribe(walletID);
  const navigation = useExtendedNavigation();
  const p = useHomePalette();
  const insets = useSafeAreaInsets();
  const { refreshing, refresh } = useWalletRefresh(wallet);

  // The unit the home shows; testnet coins have no fiat value.
  const preferred = wallet.getPreferredBalanceUnit();
  const testnet = isNeuraiWallet(wallet) && isTestnetChain(wallet.network);
  const unit = testnet && preferred === XnaUnit.LOCAL_CURRENCY ? XnaUnit.XNA : preferred;

  const sorted = useSortedTransactions(wallet);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const days = useTransactionDays(sorted, limit);
  const loadMore = useCallback(() => {
    if (sorted.length > limit) setLimit(prev => prev + PAGE_SIZE);
  }, [sorted.length, limit]);

  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: TransactionDay }) => <TransactionDayCard day={item} unit={unit} walletID={walletID} />,
    [unit, walletID],
  );

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="WalletTransactionHistory">
      <SettingsScreenHeader title={loc.home.transactions} onBack={() => navigation.goBack()} />
      <FlatList<TransactionDay>
        data={days}
        keyExtractor={transactionDayKey}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={[styles.empty, { color: p.muted }]}>{loc.wallets.list_empty_txs1}</Text>}
        ListFooterComponent={sorted.length > limit ? <ActivityIndicator style={styles.more} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={11}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={!isDesktop ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={p.muted} /> : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  empty: { fontSize: 16, textAlign: 'center', marginTop: 32, marginHorizontal: 24 },
  more: { marginVertical: 20 },
});

export default WalletTransactionHistory;
