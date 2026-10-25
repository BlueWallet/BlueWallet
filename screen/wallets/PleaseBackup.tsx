import { RouteProp, useFocusEffect, useLocale, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import SeedWords from '../../components/SeedWords';
import { useScreenProtect } from '../../hooks/useScreenProtect';

const CLOSE_TRANSITION_FALLBACK_MS = 5000;

type RouteProps = RouteProp<AddWalletStackParamList, 'PleaseBackup'>;
type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'PleaseBackup'>;

const PleaseBackup: React.FC = () => {
  const { wallets } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const wallet = wallets.find(w => w.getID() === walletID)!;
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { direction } = useLocale();
  const { lockScreenProtect, unlockScreenProtect } = useScreenProtect();
  const [isScreenProtectionReady, setIsScreenProtectionReady] = useState(false);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isProtectionReleased = useRef(false);
  const isScreenFocused = useRef(false);
  const isScreenMounted = useRef(false);

  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.elevated,
    },
    pleaseText: {
      color: colors.foregroundColor,
      writingDirection: direction,
    },
  });

  const handleBackButton = useCallback(() => {
    navigation.getParent()?.goBack();
    return true;
  }, [navigation]);

  const releaseProtection = useCallback(() => {
    if (isProtectionReleased.current) return;
    isProtectionReleased.current = true;
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    void unlockScreenProtect().catch(error => console.warn('Failed to disable seed phrase screen protection:', error));
  }, [unlockScreenProtect]);

  const scheduleProtectionFallback = useCallback(() => {
    if (isProtectionReleased.current || fallbackTimer.current) return;
    fallbackTimer.current = setTimeout(() => {
      fallbackTimer.current = undefined;
      if (!isScreenFocused.current || !isScreenMounted.current) releaseProtection();
    }, CLOSE_TRANSITION_FALLBACK_MS);
  }, [releaseProtection]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      subscription.remove();
    };
  }, [handleBackButton]);

  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;
      isProtectionReleased.current = false;
      if (fallbackTimer.current) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = undefined;
      }
      let isFocused = true;
      setIsScreenProtectionReady(false);
      void lockScreenProtect()
        .then(() => {
          if (isFocused) setIsScreenProtectionReady(true);
        })
        .catch(error => console.warn('Failed to enable seed phrase screen protection:', error));

      return () => {
        isScreenFocused.current = false;
        isFocused = false;
      };
    }, [lockScreenProtect]),
  );

  useEffect(() => {
    isScreenMounted.current = true;
    const parentNavigation = navigation.getParent<NativeStackNavigationProp<DetailViewStackParamList>>();
    const addWalletRouteKey = parentNavigation?.getState().routes.find(route => route.name === 'AddWalletRoot')?.key;
    const isClosingAddWallet = (event: { data: { closing: boolean }; target?: string }) =>
      Boolean(addWalletRouteKey && event.data.closing && event.target === addWalletRouteKey);
    const unsubscribeStart = parentNavigation?.addListener('transitionStart', event => {
      if (isClosingAddWallet(event)) scheduleProtectionFallback();
    });
    const unsubscribeEnd = parentNavigation?.addListener('transitionEnd', event => {
      if (isClosingAddWallet(event)) releaseProtection();
    });

    return () => {
      isScreenMounted.current = false;
      unsubscribeStart?.();
      unsubscribeEnd?.();
      scheduleProtectionFallback();
    };
  }, [navigation, releaseProtection, scheduleProtectionFallback]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.flex, stylesHook.flex]}
      testID="PleaseBackupScrollView"
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.please}>
        <Text style={[styles.pleaseText, stylesHook.pleaseText]}>{loc.pleasebackup.text}</Text>
      </View>
      <View style={styles.list}>
        {isScreenProtectionReady ? <SeedWords seed={wallet.getSecret()} /> : <ActivityIndicator color={colors.foregroundColor} />}
      </View>
      <View style={styles.bottom}>
        <Button testID="PleasebackupOk" onPress={handleBackButton} title={loc.pleasebackup.ok} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
    justifyContent: 'space-around',
  },
  please: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  list: {
    flexGrow: 8,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  bottom: {
    flexGrow: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pleaseText: {
    marginVertical: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PleaseBackup;
