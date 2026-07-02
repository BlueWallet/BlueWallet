import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { BackHandler, Image, Platform, Pressable, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Share from 'react-native-share';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { isLightningInvoiceModalParent, shouldOpenLightningReceiveScreen } from '../../blue_modules/lightningInvoiceNavigation';
import BlueCard from '../../components/BlueCard';
import BlueText from '../../components/BlueText';
import Button from '../../components/Button';
import CopyTextToClipboard, { CopyTextToClipboardHandle } from '../../components/CopyTextToClipboard';
import QRCode from '../../components/QRCode';
import { QrStaggerReveal } from '../../components/receive/ReceiveQrPresentation';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalance } from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { LightningTransaction } from '../../class/wallets/types';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';

const CARD_HORIZONTAL_MARGIN = 24;
const CARD_INTERNAL_PADDING = 6;
const QR_CARD_PADDING = 6;
const MAX_QR_SIZE = 500;
const MIN_QR_SIZE = 120;
const QR_SCROLL_RESERVED_WIDTH = (CARD_HORIZONTAL_MARGIN + CARD_INTERNAL_PADDING + QR_CARD_PADDING) * 2;
const QR_PORTRAIT_HEIGHT_FRACTION = 0.44;
const QR_LANDSCAPE_HEIGHT_FRACTION = 0.52;
const QR_WIDTH_USE_FRACTION = 0.92;

type LNDReceiveInvoiceRouteParams = {
  walletID: string;
  invoice: LightningTransaction | string;
};

const LNDReceiveInvoice = () => {
  const { invoice, walletID } = useRoute<RouteProp<{ params: LNDReceiveInvoiceRouteParams }, 'params'>>().params;
  const { wallets, fetchAndSaveWalletTransactions } = useStorage();
  const { colors, closeImage } = useTheme();
  const isDarkTheme = useColorScheme() === 'dark';
  const { setOptions } = useExtendedNavigation();
  const navigation = useNavigation();

  const isInInvoiceModal = useMemo(() => {
    const parentState = navigation.getParent()?.getState();
    const parentRouteName = parentState?.routes[parentState.index ?? 0]?.name;
    return isLightningInvoiceModalParent(parentRouteName);
  }, [navigation]);

  const handleDismiss = useCallback(() => {
    const parent = navigation.getParent();
    const parentState = parent?.getState();
    const parentRouteName = parentState?.routes[parentState.index ?? 0]?.name;

    if (isLightningInvoiceModalParent(parentRouteName)) {
      parent?.goBack();
    }
  }, [navigation]);

  const wallet = wallets.find(w => w.getID() === walletID) as LightningCustodianWallet | undefined;
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const scrollLayoutRef = useRef({ width: 0, height: 0 });
  const fetchInvoiceInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isMountedRef = useRef(true);
  const copyRef = useRef<CopyTextToClipboardHandle>(null);
  const pressScale = useSharedValue(1);
  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const cardBackgroundColor = isDarkTheme ? colors.inputBackgroundColor : '#F2F2F7';

  const stylesHook = StyleSheet.create({
    root: { backgroundColor: colors.elevated },
    amount: { color: colors.foregroundColor },
    label: { color: colors.foregroundColor },
    receiveCard: { backgroundColor: cardBackgroundColor },
    receiveCardColumn: {
      width: qrCodeSize + QR_CARD_PADDING * 2 + CARD_INTERNAL_PADDING * 2,
    },
    invoiceText: {
      color: colors.alternativeTextColor,
      fontSize: 15,
      textAlign: 'center',
      marginVertical: 0,
      width: '100%',
    },
  });

  const paymentRequest = typeof invoice === 'string' ? invoice : invoice.payment_request;
  const decoded = useMemo(() => {
    if (!paymentRequest || !wallet) return {};
    try {
      const d = wallet.decodeInvoice(paymentRequest);
      const description = d?.description && d.description !== 'Send to Arkade address' ? d.description : undefined;
      return { amountSats: d?.num_satoshis || undefined, description };
    } catch {
      return {};
    }
  }, [paymentRequest, wallet]);

  const amountSats = useMemo(() => {
    if (typeof invoice === 'object') {
      if (invoice.amt) return Math.abs(invoice.amt);
      if (invoice.value) return Math.abs(invoice.value);
    }
    return decoded.amountSats;
  }, [decoded.amountSats, invoice]);

  const description = useMemo(() => {
    if (typeof invoice === 'object') {
      return invoice.description || (invoice.memo && invoice.memo.length > 0 ? invoice.memo : undefined) || decoded.description;
    }
    return decoded.description;
  }, [decoded.description, invoice]);

  const preferredBalanceUnit = wallet?.preferredBalanceUnit ?? BitcoinUnit.SATS;
  const displayAmount = amountSats !== undefined ? formatBalance(amountSats, preferredBalanceUnit, true).toString() : null;

  const recomputeQrCodeSize = useCallback(() => {
    const { width: sw, height: sh } = scrollLayoutRef.current;
    if (sw <= 0 || sh <= 0) return;

    const isPortrait = sh > sw;
    const heightCap = Math.min(isPortrait ? sh * QR_PORTRAIT_HEIGHT_FRACTION : sh * QR_LANDSCAPE_HEIGHT_FRACTION, MAX_QR_SIZE);
    const widthBudget = sw - QR_SCROLL_RESERVED_WIDTH;
    const innerWidthCap = Math.max(MIN_QR_SIZE, Math.floor(widthBudget * QR_WIDTH_USE_FRACTION));
    const size = Math.max(MIN_QR_SIZE, Math.min(innerWidthCap, heightCap, MAX_QR_SIZE));
    setQRCodeSize(Math.round(size));
  }, []);

  const onScrollViewLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number; width: number } } }) => {
      const { height, width } = e.nativeEvent.layout;
      scrollLayoutRef.current = { width, height };
      recomputeQrCodeSize();
    },
    [recomputeQrCodeSize],
  );

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(0.97, { duration: 110, easing: Easing.out(Easing.quad) });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
  }, [pressScale]);

  const handleCardPress = useCallback(() => {
    if (!paymentRequest) return;
    triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
    copyRef.current?.copy({ suppressHaptic: true });
  }, [paymentRequest]);

  const handleShareButtonPressed = useCallback(() => {
    if (!paymentRequest) return;
    Share.open({ message: `lightning:${paymentRequest}` }).catch(error => console.debug('Error sharing:', error));
  }, [paymentRequest]);

  const openExpiredStatusScreen = useCallback(
    (updatedInvoice: LightningTransaction) => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'LNDViewInvoice' as never, params: { invoice: updatedInvoice, walletID } }],
      });
    },
    [navigation, walletID],
  );

  const buildSuccessParams = useCallback(
    (paidInvoice: LightningTransaction) => {
      let amount: number | undefined;
      if (paidInvoice.amt) amount = Math.abs(paidInvoice.amt);
      else if (paidInvoice.value) amount = Math.abs(paidInvoice.value);
      else amount = decoded.amountSats;

      const invoiceDescription =
        paidInvoice.description ||
        (paidInvoice.memo && paidInvoice.memo.length > 0 ? paidInvoice.memo : undefined) ||
        decoded.description;

      return {
        amount,
        amountUnit: preferredBalanceUnit,
        invoiceDescription,
      };
    },
    [decoded.amountSats, decoded.description, preferredBalanceUnit],
  );

  const openPaidSuccessScreen = useCallback(
    (paidInvoice: LightningTransaction) => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Success' as never, params: buildSuccessParams(paidInvoice) }],
      });
    },
    [buildSuccessParams, navigation],
  );

  useEffect(() => {
    if (!isInInvoiceModal) return;

    setOptions({
      headerBackVisible: false,
      gestureEnabled: false,
      ...(Platform.OS === 'android' ? { headerLeft: () => null } : {}),
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity accessibilityRole="button" onPress={handleDismiss} testID="NavigationCloseButton">
          <Image source={closeImage} />
        </TouchableOpacity>
      ),
    });
  }, [closeImage, handleDismiss, isInInvoiceModal, setOptions]);

  useEffect(() => {
    if (!isInInvoiceModal) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDismiss();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [handleDismiss, isInInvoiceModal]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!wallet || !paymentRequest) return;

    const currentInvoice = typeof invoice === 'object' ? invoice : undefined;
    if (currentInvoice && !shouldOpenLightningReceiveScreen(currentInvoice)) {
      if (currentInvoice.ispaid) {
        openPaidSuccessScreen(currentInvoice);
      } else {
        openExpiredStatusScreen(currentInvoice);
      }
      return;
    }

    fetchInvoiceInterval.current = setInterval(async () => {
      try {
        const userInvoices: LightningTransaction[] = await wallet.getUserInvoices(20);
        if (!isMountedRef.current) return;

        const updatedUserInvoice = userInvoices.find(filteredInvoice =>
          typeof invoice === 'object'
            ? filteredInvoice.payment_request === invoice.payment_request
            : filteredInvoice.payment_request === invoice,
        );
        if (!updatedUserInvoice) return;

        if (updatedUserInvoice.ispaid) {
          clearInterval(fetchInvoiceInterval.current);
          fetchInvoiceInterval.current = undefined;
          if (!isMountedRef.current) return;
          triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
          fetchAndSaveWalletTransactions(walletID);
          openPaidSuccessScreen(updatedUserInvoice);
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        const invoiceExpiration = (updatedUserInvoice.timestamp ?? 0) + (updatedUserInvoice.expire_time ?? 0);
        if (invoiceExpiration < now) {
          clearInterval(fetchInvoiceInterval.current);
          fetchInvoiceInterval.current = undefined;
          if (!isMountedRef.current) return;
          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
          fetchAndSaveWalletTransactions(walletID);
          openExpiredStatusScreen(updatedUserInvoice);
        }
      } catch (error) {
        console.log(error);
      }
    }, 3000);

    return () => {
      isMountedRef.current = false;
      clearInterval(fetchInvoiceInterval.current);
      fetchInvoiceInterval.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!paymentRequest) {
    return (
      <SafeAreaScrollView>
        <BlueText>Internal error: invoice is not provided</BlueText>
      </SafeAreaScrollView>
    );
  }

  return (
    <SafeAreaScrollView
      centerContent
      contentInsetAdjustmentBehavior="automatic"
      testID="LNDReceiveInvoiceScrollView"
      style={stylesHook.root}
      contentContainerStyle={[styles.root, stylesHook.root]}
      keyboardShouldPersistTaps="always"
      onLayout={onScrollViewLayout}
    >
      <Pressable
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardPressable}
        accessibilityRole="button"
        accessibilityLabel={loc.transactions.details_copy}
        testID="LightningReceiveCard"
      >
        <Animated.View style={[styles.receiveCard, stylesHook.receiveCard, stylesHook.receiveCardColumn, pressAnimatedStyle]}>
          {(displayAmount || description) && (
            <View style={styles.customAmountWrapper}>
              {displayAmount ? (
                <BlueText testID="LightningAmountText" style={[styles.amount, stylesHook.amount]} numberOfLines={1}>
                  {displayAmount}
                </BlueText>
              ) : null}
              {description ? (
                <BlueText testID="LightningDescriptionText" style={[styles.label, stylesHook.label]} numberOfLines={2}>
                  {description}
                </BlueText>
              ) : null}
            </View>
          )}

          <View style={styles.qrCardWrapper}>
            <QrStaggerReveal size={qrCodeSize} maskColor="#FFFFFF" runKey={paymentRequest}>
              <QRCode value={paymentRequest} size={qrCodeSize} />
            </QrStaggerReveal>
          </View>

          <View style={styles.cardSpacer} />
          <View style={styles.invoiceRow}>
            <CopyTextToClipboard
              ref={copyRef}
              text={paymentRequest}
              truncated
              interactive={false}
              containerStyle={styles.invoiceCopyContainer}
              style={stylesHook.invoiceText}
              textTestID="LightningInvoiceText"
            />
          </View>
        </Animated.View>
      </Pressable>

      <View style={styles.share}>
        <BlueCard>
          <Button onPress={handleShareButtonPressed} title={loc.receive.details_share} />
        </BlueCard>
      </View>
    </SafeAreaScrollView>
  );
};

export default LNDReceiveInvoice;

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  cardPressable: {
    alignSelf: 'center',
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
    marginTop: 56,
    marginBottom: 8,
  },
  receiveCard: {
    borderRadius: 26,
    paddingHorizontal: CARD_INTERNAL_PADDING,
    paddingTop: CARD_INTERNAL_PADDING,
    paddingBottom: 16,
    alignItems: 'center',
  },
  customAmountWrapper: {
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  amount: {
    fontWeight: '600',
    fontSize: 36,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 12,
  },
  qrCardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: QR_CARD_PADDING,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardSpacer: {
    height: 24,
  },
  invoiceCopyContainer: {
    width: '100%',
    maxWidth: '100%',
  },
  invoiceRow: {
    alignSelf: 'stretch',
    marginHorizontal: -CARD_INTERNAL_PADDING,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  share: {
    width: '100%',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
});
