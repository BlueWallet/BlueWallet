/**
 * Where links to the old per-wallet screen land now that the home shows one
 * wallet at a time: the wallet becomes the one on the home and the stack goes
 * back to it. Every `navigate('WalletTransactions', …)` in the app (after a
 * send, from a notification, Manage Wallets, the tablet drawer…) keeps working
 * without touching each caller.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../../components/themes';
import { useHomeWallet } from '../../hooks/useHomeWallet';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

type Props = NativeStackScreenProps<DetailViewStackParamList, 'WalletTransactions'>;

const WalletTransactionsRedirect: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { select } = useHomeWallet();
  const done = useRef(false);
  const { walletID, onBarScanned } = route.params;

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    select(walletID);
    if (onBarScanned) {
      // A scan aimed at this wallet: straight to its send screen.
      navigation.replace('SendNeurai', { walletID, address: onBarScanned });
      return;
    }
    navigation.popTo('WalletsList', {});
  }, [navigation, onBarScanned, select, walletID]);

  return <View style={[styles.root, { backgroundColor: colors.background }]} />;
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default WalletTransactionsRedirect;
