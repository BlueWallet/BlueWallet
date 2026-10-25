import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import presentAlert from '../components/Alert';
import { useTheme } from '../components/themes';
import { useStorage } from '../hooks/context/useStorage';
import loc from '../loc';
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

    if (!wallet) {
      presentAlert({
        title: loc.errors.error,
        message: params.selectionMode === 'receive' ? loc.wallets.select_no_bitcoin : loc.send.details_wallet_before_tx,
        hapticFeedback: HapticFeedbackTypes.NotificationError,
        buttons: [
          {
            text: loc.wallets.add_title,
            onPress: () => navigation.replace('AddWalletRoot'),
          },
          {
            text: loc._.ok,
            onPress: () => navigation.dispatch(StackActions.popTo('DrawerRoot')),
            style: 'cancel',
          },
        ],
      });
      return;
    }

    const destination = getShortcutWalletDestination(params.selectionMode, wallet.chain, wallet.getID());
    navigation.dispatch(StackActions.replace(destination.name, destination.params));
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
