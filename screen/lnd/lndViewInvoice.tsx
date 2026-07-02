import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ActivityIndicator, BackHandler, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Icon from '../../components/Icon';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { isLightningInvoiceModalParent, shouldOpenLightningReceiveScreen } from '../../blue_modules/lightningInvoiceNavigation';
import BlueText from '../../components/BlueText';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import { useTheme } from '../../components/themes';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { LightningTransaction } from '../../class/wallets/types';
import dayjs from 'dayjs';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import presentAlert from '../../components/Alert';
import { isReverseSuccessStatus } from '@arkade-os/boltz-swap';
import type { BoltzSubmarineSwap } from '@arkade-os/boltz-swap';
import prompt from '../../helpers/prompt';
import { satoshiToLocalCurrency } from '../../blue_modules/currency';
import TransactionIncomingIcon from '../../components/icons/TransactionIncomingIcon';
import TransactionOutgoingIcon from '../../components/icons/TransactionOutgoingIcon';
import TransactionPendingIcon from '../../components/icons/TransactionPendingIcon';
import TransactionExpiredIcon from '../../components/icons/TransactionExpiredIcon';

type HeaderTitleProps = {
  title: string;
  subtitle: string;
  titleStyle: any;
  subtitleStyle: any;
};

type StatusKind = 'pending' | 'sent' | 'received' | 'expired';

type LightningViewModel = {
  amountSats?: number;
  description?: string;
  dateText: string;
  statusKind: StatusKind;
  statusTitle: string;
  statusDetail?: string;
  paymentRequest?: string;
  paymentHash?: string;
  preimage?: string;
  expiryText?: string;
  swapId?: string;
  swapStatus?: string;
  txid?: string;
  isRefundable: boolean;
};

const HeaderTitle: React.FC<HeaderTitleProps> = ({ title, subtitle, titleStyle, subtitleStyle }) => (
  <View style={styles.headerTitleContainer}>
    <BlueText style={titleStyle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
      {title}
    </BlueText>
    <BlueText style={subtitleStyle} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
      {subtitle}
    </BlueText>
  </View>
);

const resolveLightningDirection = (invoice: LightningTransaction | string, swapSuccess: boolean): 'sent' | 'received' | 'pending' => {
  if (typeof invoice === 'string') return 'pending';
  if (typeof invoice.value === 'number' && Number.isFinite(invoice.value) && invoice.value !== 0) {
    return invoice.value < 0 ? 'sent' : 'received';
  }
  if (invoice.type === 'paid_invoice' || invoice.type === 'payment_request') return 'sent';
  if (invoice.type === 'user_invoice' || swapSuccess || invoice.ispaid) return 'received';
  return 'pending';
};

type LNDViewInvoiceRouteParams = {
  walletID: string;
  invoice: LightningTransaction | string; // its first passed as string and then decoded and turned into object
};

const LNDViewInvoice = () => {
  const { invoice, walletID } = useRoute<RouteProp<{ params: LNDViewInvoiceRouteParams }, 'params'>>().params;
  const { wallets, fetchAndSaveWalletTransactions, txMetadata, saveToDisk } = useStorage();
  const { colors, closeImage } = useTheme();
  const { goBack, setParams, setOptions } = useExtendedNavigation();
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const canGoBack = navigation.canGoBack();

  const wallet = wallets.find(w => w.getID() === walletID);
  const arkWallet = wallet?.type === LightningArkWallet.type ? (wallet as LightningArkWallet) : undefined;
  const lightningWallet = wallet?.chain === Chain.OFFCHAIN ? (wallet as LightningCustodianWallet) : undefined;
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const isInInvoiceModal = useMemo(() => {
    const parentState = navigation.getParent()?.getState();
    const parentRouteName = parentState?.routes[parentState.index ?? 0]?.name;
    return isLightningInvoiceModalParent(parentRouteName);
  }, [navigation]);

  // Per-swap claim/refund lookup, by the `swap-${id}` prefix mapped onto
  // the row's `txid` field by lightning-ark-wallet getTransactions(). The
  // route param is typed as LightningTransaction (which doesn't declare
  // txid) but at runtime carries the merged `Transaction & LightningTransaction`
  // shape, so we read txid through a narrow local cast. For non-Ark wallets
  // and non-swap rows this resolves to undefined and the UI falls through
  // to the existing branches.
  const invoiceTxid = typeof invoice === 'object' ? (invoice as { txid?: unknown }).txid : undefined;
  const swapId = typeof invoiceTxid === 'string' && invoiceTxid.startsWith('swap-') ? invoiceTxid.slice('swap-'.length) : undefined;
  // Force-render token: bumped by the swap-event subscription below so live
  // `swap.status` lookups (via getSwapById → _swapHistory) re-evaluate the
  // moment the SDK observes a status transition, without waiting for the
  // 3s polling tick to update the route-param snapshot.
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const swap = swapId && arkWallet ? arkWallet.getSwapById(swapId) : undefined;
  const [isActioning, setIsActioning] = useState<boolean>(false);
  const claimable = arkWallet && swap ? arkWallet.isSwapClaimable(swap) : false;
  const refundable = arkWallet && swap ? arkWallet.isSwapRefundable(swap) : false;
  const detailValueMaxWidth = useMemo(() => Math.max(0, Math.floor((windowWidth - 48) / 2)), [windowWidth]);
  const detailValueWidthStyle = useMemo(() => ({ width: detailValueMaxWidth }), [detailValueMaxWidth]);

  // Subscribe to SwapManager status transitions for our swap so the spinner
  // → success transition is driven by SDK events, not the 3s polling lag.
  // The SDK mutates `swap.status` in place before invoking listeners, so by
  // the time we force a render `getSwapById(swapId).status` reflects the
  // new state and the success/refund branches re-evaluate correctly.
  useEffect(() => {
    if (!arkWallet || !swapId) return;
    return arkWallet.subscribeToSwapEvents(updatedSwap => {
      if (updatedSwap.id === swapId) forceRender();
    });
  }, [arkWallet, swapId]);

  const refreshAfterAction = async () => {
    if (!arkWallet || !swapId) return;
    const updatedRow = arkWallet.getTransactions().find(tx => tx.txid === `swap-${swapId}`);
    if (updatedRow && navigation.isFocused()) setParams({ invoice: updatedRow });
    fetchAndSaveWalletTransactions(walletID);
  };

  const handleDismiss = useCallback(() => {
    const parent = navigation.getParent();
    const parentState = parent?.getState();
    const parentRouteName = parentState?.routes[parentState.index ?? 0]?.name;

    if (isLightningInvoiceModalParent(parentRouteName)) {
      parent?.goBack();
      return;
    }

    if (navigation.canGoBack()) {
      goBack();
    }
  }, [goBack, navigation]);

  const onRefundPressed = async () => {
    if (!arkWallet || !swap || isActioning) return;
    setIsActioning(true);
    try {
      const outcome = await arkWallet.refundSwap(swap as BoltzSubmarineSwap);
      if (outcome.swept === 0) {
        // Lockup not yet refundable (CLTV not reached / Boltz declined to
        // co-sign). Surface as info, not an error: the row stays refundable
        // and the user can retry later.
        presentAlert({ message: loc.lndViewInvoice.refund_deferred });
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      }
      await refreshAfterAction();
    } catch (e: any) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: e?.message ?? String(e) });
    } finally {
      setIsActioning(false);
    }
  };

  const stylesHook = StyleSheet.create({
    headerTitleDirection: { color: colors.foregroundColor },
    headerTitleDate: { color: colors.alternativeTextColor },
    value: { color: colors.foregroundColor },
    valueUnit: { color: colors.foregroundColor },
    localCurrency: { color: colors.alternativeTextColor },
    stateLabelPending: { color: colors.transactionPendingColor },
    stateLabelSent: { color: colors.transactionSentColor },
    stateLabelReceived: { color: colors.transactionReceivedColor },
    stateLabelExpired: { color: colors.transactionSentColor },
    stateValuePending: { color: colors.transactionPendingColor },
    stateValueSent: { color: colors.transactionSentColor },
    stateValueReceived: { color: colors.transactionReceivedColor },
    stateValueExpired: { color: colors.transactionSentColor },
    stateCardPending: { backgroundColor: colors.transactionPendingBackgroundColor },
    stateCardSent: { backgroundColor: colors.outgoingBackgroundColor },
    stateCardReceived: { backgroundColor: colors.incomingBackgroundColor },
    stateCardExpired: { backgroundColor: colors.outgoingBackgroundColor },
    sectionTitle: { backgroundColor: colors.cardSectionHeaderBackground },
    sectionTitleText: { color: colors.foregroundColor },
    detailsCard: { borderColor: colors.cardBorderColor },
    detailRow: {
      backgroundColor: colors.cardSectionBackground,
      borderBottomColor: colors.cardBorderColor,
    },
    advancedHeader: { borderColor: colors.cardBorderColor },
    advancedContent: { borderTopColor: colors.cardBorderColor },
    detailLabel: { color: colors.alternativeTextColor },
    detailValue: { color: colors.foregroundColor },
    memoText: { color: colors.foregroundColor },
    addButton: { backgroundColor: colors.lightButton },
    addButtonText: { color: colors.buttonTextColor },
    refundButton: { backgroundColor: colors.transactionStateBumpButtonBackground },
    refundButtonText: { color: colors.transactionPendingColor },
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isInInvoiceModal && !navigation.canGoBack()) {
        handleDismiss();
      } else if (navigation.canGoBack()) {
        goBack();
      }
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [goBack, handleDismiss, isInInvoiceModal, navigation]);

  useEffect(() => {
    if (!isInInvoiceModal) return;
    if (typeof invoice === 'object' && shouldOpenLightningReceiveScreen(invoice)) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'LNDReceiveInvoice' as never, params: { invoice, walletID } }],
      });
    }
  }, [invoice, isInInvoiceModal, navigation, walletID]);

  useEffect(() => {
    const currentInvoice = typeof invoice === 'object' ? invoice : undefined;
    const swapSuccess = Boolean(swap && isReverseSuccessStatus(swap.status));
    const txDirection = resolveLightningDirection(invoice, swapSuccess);
    const headerDate = currentInvoice?.timestamp
      ? dayjs(currentInvoice.timestamp * (String(currentInvoice.timestamp).length === 10 ? 1000 : 1)).format('LLL')
      : '';
    let headerTitle = loc.transactions.pending;
    if (currentInvoice?.ispaid || currentInvoice?.type === 'paid_invoice' || swapSuccess) {
      headerTitle = txDirection === 'sent' ? loc.transactions.details_sent : loc.transactions.details_received;
    } else if (refundable) {
      headerTitle = loc.lndViewInvoice.status_refundable;
    } else if (claimable) {
      headerTitle = loc.lndViewInvoice.status_receiving;
    } else if (
      currentInvoice?.timestamp &&
      currentInvoice?.expire_time &&
      currentInvoice.timestamp + currentInvoice.expire_time < Math.floor(Date.now() / 1000)
    ) {
      headerTitle = loc.lnd.expired;
    }

    const shouldShowCloseButton = isInInvoiceModal && !canGoBack;

    setOptions({
      headerStyle: {
        backgroundColor: colors.customHeader,
      },
      headerTitle: () => (
        <HeaderTitle
          title={headerTitle}
          subtitle={headerDate}
          titleStyle={[styles.headerTitleDirection, stylesHook.headerTitleDirection]}
          subtitleStyle={[styles.headerTitleDate, stylesHook.headerTitleDate]}
        />
      ),
      ...(shouldShowCloseButton
        ? {
            headerBackVisible: false,
            gestureEnabled: false,
            // eslint-disable-next-line react/no-unstable-nested-components
            headerRight: () => (
              <TouchableOpacity accessibilityRole="button" onPress={handleDismiss} testID="NavigationCloseButton">
                <Image source={closeImage} />
              </TouchableOpacity>
            ),
          }
        : {
            headerBackVisible: true,
            headerRight: () => {},
          }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGoBack, colors, handleDismiss, isInInvoiceModal, invoice, swap, claimable, refundable]);

  const metadataKey = useMemo(() => {
    if (typeof invoice === 'string') return invoice;
    const txid = (invoice as { txid?: string }).txid;
    if (typeof txid === 'string' && txid.length > 0) return txid;
    const hash = invoice.payment_hash;
    if (typeof hash === 'string') return hash;
    if (hash && typeof hash === 'object' && 'data' in hash && typeof hash.data === 'string') return hash.data;
    return invoice.payment_request;
  }, [invoice]);

  const handleNotePress = useCallback(async () => {
    const currentMemo = ((metadataKey && txMetadata[metadataKey]?.memo) || (typeof invoice === 'object' ? invoice.memo : '') || '').trim();
    try {
      const newMemo = await prompt(loc.send.details_note_placeholder, '', { type: 'plain-text', defaultValue: currentMemo });
      if (newMemo !== undefined && metadataKey) {
        txMetadata[metadataKey] = { memo: newMemo };
        await saveToDisk();
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      }
    } catch {}
  }, [invoice, metadataKey, saveToDisk, txMetadata]);

  // Drive both the amount and the description straight off the BOLT11 — the
  // source of truth, and the one thing identical whether the route param is
  // still the raw string or the polled-in object, so both render phases agree
  // and nothing changes after the page first paints. Decode is sync + cached.
  // "Please pay" deliberately shows the invoice-encoded amount (what the payer
  // is actually charged), not invoice.amt — which getTransactions() resolves to
  // the post-fee on-chain amount and so differs from the BOLT11 by the swap fee.
  // Likewise we ignore the row's synthesized description/memo: getTransactions()
  // backfills a "BlueWallet" label there for memo-less reverse swaps (so the tx
  // list isn't blank) and that placeholder must never surface here as
  // "For: BlueWallet". "Send to Arkade address" is the SDK's hardcoded default
  // for a memo-less reverse swap, so it counts as "no description" too.
  const decodeForDisplay = useCallback((paymentRequest?: string): { amountSats?: number; description?: string } => {
    if (!paymentRequest) return {};
    try {
      const d = lightningWallet?.decodeInvoice(paymentRequest);
      const description = d?.description && d.description !== 'Send to Arkade address' ? d.description : undefined;
      return { amountSats: d?.num_satoshis || undefined, description };
    } catch {
      return {};
    }
  }, [lightningWallet]);

  const viewModel = useMemo<LightningViewModel | null>(() => {
    if (!invoice) return null;
    const paymentRequest = typeof invoice === 'string' ? invoice : invoice.payment_request;
    const decoded = decodeForDisplay(paymentRequest);
    const currentDate = new Date();
    const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
    const invoiceExpiration =
      typeof invoice === 'object' && invoice.timestamp && invoice.expire_time ? invoice.timestamp + invoice.expire_time : undefined;
    const isExpired = typeof invoice === 'object' ? Boolean(invoiceExpiration && invoiceExpiration < now && !invoice.ispaid) : false;
    const swapSuccess = Boolean(swap && isReverseSuccessStatus(swap.status));
    const isPaid = typeof invoice === 'object' && (invoice.ispaid || invoice.type === 'paid_invoice' || swapSuccess);
    const txDirection = resolveLightningDirection(invoice, swapSuccess);

    let amountSats: number | undefined;
    let description: string | undefined;
    let paymentHash: string | undefined;
    let preimage: string | undefined;
    let dateText = '';
    let expiryText: string | undefined;
    let txid: string | undefined;

    if (typeof invoice === 'object') {
      if (invoice.type === 'paid_invoice' && invoice.value) amountSats = Math.abs(invoice.value);
      else if (invoice.type === 'user_invoice' && invoice.amt) amountSats = invoice.amt;
      else if (invoice.value) amountSats = Math.abs(invoice.value);
      else amountSats = decoded.amountSats;

      description = invoice.description || (invoice.memo && invoice.memo.length > 0 ? invoice.memo : decoded.description);
      paymentHash = typeof invoice.payment_hash === 'string' ? invoice.payment_hash : invoice.payment_hash?.data;
      preimage = typeof invoice.payment_preimage === 'string' ? invoice.payment_preimage : undefined;
      dateText = invoice.timestamp ? dayjs(invoice.timestamp * (String(invoice.timestamp).length === 10 ? 1000 : 1)).format('LLL') : '-';
      expiryText = invoice.expire_time ? `${invoice.expire_time}s` : undefined;
      txid = (invoice as { txid?: string }).txid;
    } else {
      amountSats = decoded.amountSats;
      description = decoded.description;
      paymentHash = lightningWallet?.decodeInvoice(invoice)?.payment_hash;
      dateText = '-';
    }

    let statusKind: StatusKind = 'pending';
    let statusTitle = loc.transactions.pending;
    let statusDetail: string | undefined = paymentRequest ? loc.lndViewInvoice.please_pay : undefined;

    if (isExpired) {
      statusKind = 'expired';
      statusTitle = loc.lnd.expired;
      statusDetail = loc.lndViewInvoice.wasnt_paid_and_expired;
    } else if (refundable) {
      statusKind = 'pending';
      statusTitle = loc.lndViewInvoice.status_refundable;
      statusDetail = loc.lndViewInvoice.refundable_detail;
    } else if (claimable) {
      statusKind = 'pending';
      statusTitle = loc.lndViewInvoice.status_receiving;
      statusDetail = loc.lndViewInvoice.receiving_payment;
    } else if (isPaid) {
      statusKind = txDirection === 'sent' ? 'sent' : 'received';
      statusTitle = statusKind === 'sent' ? loc.transactions.details_sent : loc.transactions.details_received;
      statusDetail = undefined;
    }

    return {
      amountSats,
      description,
      dateText,
      statusKind,
      statusTitle,
      statusDetail,
      paymentRequest,
      paymentHash,
      preimage,
      expiryText,
      swapId,
      swapStatus: swap?.status,
      txid,
      isRefundable: refundable,
    };
  }, [claimable, decodeForDisplay, invoice, lightningWallet, refundable, swap, swapId]);

  if (!viewModel) {
    return (
      <SafeAreaScrollView>
        <BlueText>{loc.lndViewInvoice.internal_error}</BlueText>
      </SafeAreaScrollView>
    );
  }

  const memo = ((metadataKey && txMetadata[metadataKey]?.memo) || (typeof invoice === 'object' ? invoice.memo : '') || '').trim();
  const preferredBalanceUnit = wallet?.preferredBalanceUnit ?? BitcoinUnit.BTC;
  const signedAmount =
    viewModel.amountSats === undefined ? null : viewModel.statusKind === 'sent' ? -Math.abs(viewModel.amountSats) : Math.abs(viewModel.amountSats);
  const statusIcon =
    viewModel.statusKind === 'expired' ? (
      <TransactionExpiredIcon />
    ) : viewModel.statusKind === 'sent' ? (
      <TransactionOutgoingIcon />
    ) : viewModel.statusKind === 'received' ? (
      <TransactionIncomingIcon />
    ) : (
      <TransactionPendingIcon />
    );
  const stateCardStyle =
    viewModel.statusKind === 'expired'
      ? stylesHook.stateCardExpired
      : viewModel.statusKind === 'sent'
        ? stylesHook.stateCardSent
        : viewModel.statusKind === 'received'
          ? stylesHook.stateCardReceived
          : stylesHook.stateCardPending;
  const stateLabelStyle =
    viewModel.statusKind === 'expired'
      ? stylesHook.stateLabelExpired
      : viewModel.statusKind === 'sent'
        ? stylesHook.stateLabelSent
        : viewModel.statusKind === 'received'
          ? stylesHook.stateLabelReceived
          : stylesHook.stateLabelPending;
  const stateValueStyle =
    viewModel.statusKind === 'expired'
      ? stylesHook.stateValueExpired
      : viewModel.statusKind === 'sent'
        ? stylesHook.stateValueSent
        : viewModel.statusKind === 'received'
          ? stylesHook.stateValueReceived
          : stylesHook.stateValuePending;

  return (
    <SafeAreaScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.valueCard}>
        <View style={styles.valueContent}>
          <Text style={[styles.value, stylesHook.value, styles.valueFullWidth]} selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
            {signedAmount !== null ? formatBalanceWithoutSuffix(signedAmount, preferredBalanceUnit, true) : '-'}
            {preferredBalanceUnit !== BitcoinUnit.LOCAL_CURRENCY && <Text style={[styles.valueUnit, stylesHook.valueUnit]}>{` ${preferredBalanceUnit}`}</Text>}
          </Text>
          {signedAmount !== null && (
            <Text style={[styles.localCurrency, stylesHook.localCurrency]}>
              {preferredBalanceUnit === BitcoinUnit.LOCAL_CURRENCY
                ? `${formatBalanceWithoutSuffix(Math.abs(signedAmount), BitcoinUnit.BTC, true)} ${BitcoinUnit.BTC}`
                : satoshiToLocalCurrency(Math.abs(signedAmount))}
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.stateCard, stateCardStyle]}>
        <View style={styles.stateSection}>
          <View style={styles.stateIndicator}>
            {statusIcon}
            <View style={styles.stateLabelContainer}>
              <BlueText style={[styles.stateLabel, stateLabelStyle]}>{viewModel.statusTitle}</BlueText>
              {viewModel.statusDetail ? <BlueText style={[styles.stateValue, stateValueStyle]}>{viewModel.statusDetail}</BlueText> : null}
            </View>
          </View>
          {viewModel.isRefundable && (
            <TouchableOpacity
              onPress={onRefundPressed}
              style={[styles.refundButton, stylesHook.refundButton]}
              accessibilityRole="button"
              disabled={isActioning}
            >
              {isActioning ? (
                <ActivityIndicator color={colors.transactionPendingColor} />
              ) : (
                <BlueText style={[styles.refundButtonText, stylesHook.refundButtonText]}>{loc.lndViewInvoice.refund_funds}</BlueText>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.detailsCard, stylesHook.detailsCard]}>
        <View style={[styles.sectionTitle, styles.sectionTitleWithButton, stylesHook.sectionTitle]}>
          <BlueText style={[styles.sectionTitleText, stylesHook.sectionTitleText, styles.sectionTitleTextFlexible]}>
            {loc.transactions.details_section}
          </BlueText>
        </View>

        <View style={[styles.detailRow, stylesHook.detailRow]}>
          <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.lndViewInvoice.amount}</BlueText>
          <View style={styles.detailValueContainer}>
            <CopyTextToClipboard
              text={viewModel.amountSats !== undefined ? `${formatBalanceWithoutSuffix(viewModel.amountSats, BitcoinUnit.SATS, true)} ${BitcoinUnit.SATS}` : '-'}
              style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])}
              textAlign="right"
            />
          </View>
        </View>

        <View style={[styles.detailRow, styles.detailRowLast, stylesHook.detailRow]}>
          <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_note}</BlueText>
          <View style={styles.detailValueContainer}>
            {memo ? (
              <TouchableOpacity onPress={handleNotePress} activeOpacity={0.7} style={styles.memoContainer}>
                <BlueText style={[styles.memoText, stylesHook.memoText]} numberOfLines={0}>
                  {memo}
                </BlueText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleNotePress} style={[styles.addButton, stylesHook.addButton]} activeOpacity={0.7}>
                <BlueText style={[styles.addButtonText, stylesHook.addButtonText]}>{loc.transactions.details_add_note}</BlueText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={[styles.detailsCard, stylesHook.detailsCard]}>
        <TouchableOpacity onPress={() => setIsAdvancedExpanded(!isAdvancedExpanded)} style={[styles.advancedHeader, stylesHook.advancedHeader]} activeOpacity={0.85}>
          <View style={[styles.sectionTitle, stylesHook.sectionTitle, styles.sectionTitleRow]}>
            <BlueText style={[styles.sectionTitleText, stylesHook.sectionTitleText, styles.sectionTitleTextFlexible]} numberOfLines={2}>
              {loc.transactions.details_advanced}
            </BlueText>
            <Icon name={isAdvancedExpanded ? 'chevron-up' : 'chevron-down'} type="font-awesome" size={16} color={colors.alternativeTextColor} />
          </View>
        </TouchableOpacity>
        {isAdvancedExpanded && (
          <View style={[styles.advancedContent, stylesHook.advancedContent]}>
            {viewModel.paymentHash ? (
              <View style={[styles.detailRow, stylesHook.detailRow]}>
                <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.lndViewInvoice.payment_hash}</BlueText>
                <View style={styles.detailValueContainer}>
                  <View style={styles.detailValueCopyContainer}>
                    <CopyTextToClipboard
                      containerStyle={StyleSheet.flatten([styles.detailValueEllipsisContainer, detailValueWidthStyle])}
                      text={viewModel.paymentHash}
                      displayText={viewModel.paymentHash}
                      style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue, styles.detailValueEllipsisText, detailValueWidthStyle])}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                      textAlign="right"
                    />
                  </View>
                </View>
              </View>
            ) : null}
            {viewModel.preimage ? (
              <View style={[styles.detailRow, stylesHook.detailRow]}>
                <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.lndViewInvoice.preimage}</BlueText>
                <View style={styles.detailValueContainer}>
                  <View style={styles.detailValueCopyContainer}>
                    <CopyTextToClipboard
                      containerStyle={StyleSheet.flatten([styles.detailValueEllipsisContainer, detailValueWidthStyle])}
                      text={viewModel.preimage}
                      displayText={viewModel.preimage}
                      style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue, styles.detailValueEllipsisText, detailValueWidthStyle])}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                      textAlign="right"
                    />
                  </View>
                </View>
              </View>
            ) : null}
            {viewModel.expiryText ? (
              <View style={[styles.detailRow, stylesHook.detailRow]}>
                <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.lndViewInvoice.expiry}</BlueText>
                <View style={styles.detailValueContainer}>
                  <CopyTextToClipboard text={viewModel.expiryText} style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])} textAlign="right" />
                </View>
              </View>
            ) : null}
            {viewModel.swapId ? (
              <View style={[styles.detailRow, stylesHook.detailRow]}>
                <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.lndViewInvoice.swap_id}</BlueText>
                <View style={styles.detailValueContainer}>
                  <CopyTextToClipboard text={viewModel.swapId} style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])} textAlign="right" />
                </View>
              </View>
            ) : null}
            {viewModel.swapStatus ? (
              <View style={[styles.detailRow, stylesHook.detailRow]}>
                <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.lndViewInvoice.swap_status}</BlueText>
                <View style={styles.detailValueContainer}>
                  <CopyTextToClipboard text={viewModel.swapStatus} style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue])} textAlign="right" />
                </View>
              </View>
            ) : null}
            {viewModel.txid ? (
              <View style={[styles.detailRow, styles.detailRowLast, stylesHook.detailRow]}>
                <BlueText style={[styles.detailLabel, stylesHook.detailLabel]}>{loc.transactions.details_id}</BlueText>
                <View style={styles.detailValueContainer}>
                  <View style={styles.detailValueCopyContainer}>
                    <CopyTextToClipboard
                      containerStyle={StyleSheet.flatten([styles.detailValueEllipsisContainer, detailValueWidthStyle])}
                      text={viewModel.txid}
                      displayText={viewModel.txid}
                      style={StyleSheet.flatten([styles.detailValue, stylesHook.detailValue, styles.detailValueEllipsisText, detailValueWidthStyle])}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                      textAlign="right"
                    />
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </SafeAreaScrollView>
  );
};

export default LNDViewInvoice;

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 42,
    paddingBottom: 42,
  },
  headerTitleContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
  },
  headerTitleDirection: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.15,
  },
  headerTitleDate: {
    fontSize: 13,
    lineHeight: 18,
  },
  valueCard: {
    marginHorizontal: 24,
    marginBottom: 42,
  },
  valueContent: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 48,
    paddingTop: 8,
    minHeight: 38,
  },
  valueFullWidth: {
    width: '100%',
    flexShrink: 1,
  },
  valueUnit: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  localCurrency: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 20,
  },
  stateCard: {
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 42,
  },
  stateSection: {
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  stateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stateLabelContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginLeft: 8,
    flex: 1,
    minWidth: 0,
  },
  stateLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  stateValue: {
    fontSize: 13,
  },
  refundButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    width: '100%',
  },
  refundButtonText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailsCard: {
    marginHorizontal: 24,
    marginBottom: 42,
    padding: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionTitleRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '600',
  },
  sectionTitleTextFlexible: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  detailRowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    lineHeight: 22,
    paddingRight: 12,
  },
  detailValueContainer: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  detailValueCopyContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  detailValueEllipsisContainer: {
    flex: 1,
    minWidth: 0,
  },
  detailValueEllipsisText: {
    flex: 1,
    minWidth: 0,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'right',
    flexShrink: 1,
    minWidth: 0,
  },
  memoContainer: {
    flex: 1,
    alignItems: 'flex-end',
    maxWidth: '100%',
    flexShrink: 1,
  },
  memoText: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'right',
    flexShrink: 1,
  },
  addButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-end',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  advancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  advancedContent: {
    borderTopWidth: 1,
  },
});
