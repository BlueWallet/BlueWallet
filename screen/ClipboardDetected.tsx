import React, { useCallback, useMemo } from 'react';
import { InteractionManager, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { CLIPBOARD_SHEET_VISIBLE_MIN_HEIGHT, setClipboardSheetFocused, setLastSeenClipboardHash } from '../blue_modules/clipboard';
import { ClipboardPaymentKind } from '../blue_modules/clipboardPayment';
import Button from '../components/Button';
import ClipboardDetectedItem from '../components/ClipboardDetectedItem';
import { useTheme } from '../components/themes';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import { useStorage } from '../hooks/context/useStorage';
import loc from '../loc';
import { navigationRef } from '../NavigationService';
import { DetailViewStackParamList } from '../navigation/DetailViewStackParamList';

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'ClipboardDetected'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'ClipboardDetected'>;

const copyForKind = (kind: ClipboardPaymentKind) => {
  switch (kind) {
    case ClipboardPaymentKind.Lnurl:
      return { kindMessage: loc.wallets.clipboard_lnurl, actionTitle: loc.wallets.use_lnurl };
    case ClipboardPaymentKind.Lightning:
      return { kindMessage: loc.wallets.clipboard_lightning, actionTitle: loc.wallets.use_invoice };
    default:
      return { kindMessage: loc.wallets.clipboard_bitcoin, actionTitle: loc.wallets.use_address };
  }
};

const ClipboardDetected = () => {
  const navigation = useNavigation<NavigationProps>();
  const { payload, kind, contentHash } = useRoute<RouteProps>().params;
  const { colors } = useTheme();
  const { wallets, addWallet, saveToDisk, setSharedCosigner } = useStorage();

  const stylesHook = useMemo(
    () => ({
      safeArea: {
        backgroundColor: colors.elevated,
      },
    }),
    [colors.elevated],
  );

  const { kindMessage, actionTitle } = copyForKind(kind);
  const accessibilityHint = `${actionTitle}. ${kindMessage}`;

  useFocusEffect(
    useCallback(() => {
      return () => setClipboardSheetFocused(false);
    }, []),
  );

  const persistIfVisible = useCallback(
    (event: LayoutChangeEvent) => {
      if (event.nativeEvent.layout.height < CLIPBOARD_SHEET_VISIBLE_MIN_HEIGHT) return;
      setClipboardSheetFocused(true);
      if (contentHash) setLastSeenClipboardHash(contentHash).catch(() => {});
    },
    [contentHash],
  );

  const handleUseClipboard = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
    if (contentHash) setLastSeenClipboardHash(contentHash).catch(() => {});
    navigation.goBack();
    InteractionManager.runAfterInteractions(() => {
      DeeplinkSchemaMatch.navigationRouteFor({ url: payload }, (value: [string, any]) => navigationRef.navigate(...value), {
        wallets,
        addWallet,
        saveToDisk,
        setSharedCosigner,
      });
    });
  }, [addWallet, contentHash, navigation, payload, saveToDisk, setSharedCosigner, wallets]);

  return (
    <SafeAreaView
      style={[styles.safeArea, stylesHook.safeArea]}
      edges={['bottom', 'left', 'right']}
      testID="ClipboardDetectedScreen"
      accessibilityLabel={loc._.clipboard}
      onLayout={persistIfVisible}
    >
      <View style={styles.content}>
        <ClipboardDetectedItem value={payload} onPress={handleUseClipboard} accessibilityHint={accessibilityHint} />
      </View>
      <View style={styles.footer}>
        <Button testID="ClipboardDetectedUse" title={actionTitle} accessibilityHint={accessibilityHint} onPress={handleUseClipboard} />
      </View>
    </SafeAreaView>
  );
};

export default ClipboardDetected;

const styles = StyleSheet.create({
  safeArea: {
    minHeight: 280,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
});
