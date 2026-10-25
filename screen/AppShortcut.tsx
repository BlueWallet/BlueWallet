import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import presentAlert from '../components/Alert';
import { useTheme } from '../components/themes';
import { useStorage } from '../hooks/context/useStorage';
import loc from '../loc';
import { navigationRef } from '../NavigationService';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';
import { getCompatibleShortcutWallets, getShortcutWalletDestination } from '../navigation/linking';

type AppShortcutNavigation = NativeStackNavigationProp<DetailViewStackParamList, 'AppShortcut'>;
type AppShortcutRoute = RouteProp<DetailViewStackParamList, 'AppShortcut'>;

const AppShortcut = () => {
  const navigation = useNavigation<AppShortcutNavigation>();
  const { params } = useRoute<AppShortcutRoute>();
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const wallet = getCompatibleShortcutWallets(params.selectionMode, wallets)[0];
    navigation.replace('WalletsList', {});

    if (!wallet) {
      presentAlert({
        title: loc.errors.error,
        message: params.selectionMode === 'receive' ? loc.wallets.select_no_bitcoin : loc.send.details_wallet_before_tx,
        hapticFeedback: HapticFeedbackTypes.NotificationError,
      });
      return;
    }

    const destination = getShortcutWalletDestination(params.selectionMode, wallet.chain, wallet.getID());
    navigationRef.navigate(destination.name, destination.params);
  }, [navigation, params.selectionMode, wallets]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator />
    </View>
  );
};

export default AppShortcut;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
