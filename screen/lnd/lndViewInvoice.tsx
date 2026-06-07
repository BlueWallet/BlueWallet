import React, { useEffect, useReducer, useRef, useState } from 'react';
import { RouteProp, useNavigation, useNavigationState, useRoute, useLocale } from '@react-navigation/native';
import { ActivityIndicator, BackHandler, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../../components/Icon';
import Share from 'react-native-share';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import BlueText from '../../components/BlueText';
import BlueTextCentered from '../../components/BlueTextCentered';
import Button from '../../components/Button';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCode from '../../components/QRCode';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { SuccessView } from '../send/success';
import LNDCreateInvoice from './lndCreateInvoice';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import BigNumber from 'bignumber.js';
import { LightningTransaction } from '../../class/wallets/types';
import dayjs from 'dayjs';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import presentAlert from '../../components/Alert';
import { isReverseSuccessStatus } from '@arkade-os/boltz-swap';
import type { BoltzSubmarineSwap } from '@arkade-os/boltz-swap';

type LNDViewInvoiceRouteParams = {
  walletID: string;
  invoice: LightningTransaction | string; // its first passed as string and then decoded and turned into object
};

const LNDViewInvoice = () => {
  const { invoice, walletID } = useRoute<RouteProp<{ params: LNDViewInvoiceRouteParams }, 'params'>>().params;
  const { wallets, fetchAndSaveWalletTransactions } = useStorage();
  const { colors, closeImage } = useTheme();
  const { direction } = useLocale();
  const { goBack, navigate, setParams, setOptions } = useExtendedNavigation();
  const navigation = useNavigation();

  const wallet = wallets.find(w => w.getID() === walletID) as LightningCustodianWallet | undefined;
  const arkWallet =
    wallet && (wallet as { type?: string }).type === LightningArkWallet.type ? (wallet as unknown as LightningArkWallet) : undefined;
  const [isFetchingInvoices, setIsFetchingInvoices] = useState<boolean>(true);
  const [invoiceStatusChanged, setInvoiceStatusChanged] = useState<boolean>(false);
  const [qrCodeSize, setQRCodeSize] = useState<number>(90);
  const fetchInvoiceInterval = useRef<any>(null);
  const isModal = useNavigationState(state => state.routeNames[0] === LNDCreateInvoice.routeName);

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
    if (updatedRow) setParams({ invoice: updatedRow });
    setInvoiceStatusChanged(true);
    fetchAndSaveWalletTransactions(walletID);
  };

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
    root: {
      backgroundColor: colors.background,
    },
    detailsText: {
      color: colors.alternativeTextColor,
    },
    expired: {
      backgroundColor: colors.success,
    },
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });

    return () => {
      subscription.remove();
      clearInterval(fetchInvoiceInterval.current);
      fetchInvoiceInterval.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOptions(
      isModal
        ? {
            headerStyle: {
              backgroundColor: colors.customHeader,
            },
            gestureEnabled: false,
            headerBackVisible: false,
            // eslint-disable-next-line react/no-unstable-nested-components
            headerRight: () => (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  // @ts-ignore: navigation
                  navigation?.getParent().pop();
                }}
                testID="NavigationCloseButton"
              >
                <Image source={closeImage} />
              </TouchableOpacity>
            ),
          }
        : {
            headerRight: () => {},
            headerStyle: {
              backgroundColor: colors.customHeader,
            },
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, isModal]);

  useEffect(() => {
    console.log('LNDViewInvoice - useEffect', { invoice });

    if (!wallet) {
      return;
    }
    if (!(invoice as LightningTransaction).ispaid) {
      fetchInvoiceInterval.current = setInterval(async () => {
        if (isFetchingInvoices) {
          try {
            // @ts-ignore - getUserInvoices is not set on TWallet
            const userInvoices: LightningTransaction[] = await wallet.getUserInvoices(20);
            // fetching only last 20 invoices
            // for invoice that was created just now - that should be enough (it is basically the last one, so limit=1 would be sufficient)
            // but that might not work as intended IF user creates 21 invoices, and then tries to check the status of invoice #0, it just wont be updated
            const updatedUserInvoice = userInvoices.filter((filteredInvoice: LightningTransaction) =>
              typeof invoice === 'object'
                ? filteredInvoice.payment_request === invoice.payment_request
                : filteredInvoice.payment_request === invoice,
            )[0];
            if (updatedUserInvoice) {
              setInvoiceStatusChanged(true);
              setParams({ invoice: updatedUserInvoice });
              if (updatedUserInvoice.ispaid) {
                // we fetched the invoice, and it is paid :-)
                setIsFetchingInvoices(false);
                clearInterval(fetchInvoiceInterval.current);
                triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
                fetchAndSaveWalletTransactions(walletID);
              } else {
                const currentDate = new Date();
                const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
                const invoiceExpiration = (updatedUserInvoice.timestamp ?? 0) + (updatedUserInvoice.expire_time ?? 0);
                if (invoiceExpiration < now && !updatedUserInvoice.ispaid) {
                  // invoice expired :-(
                  fetchAndSaveWalletTransactions(walletID);
                  setIsFetchingInvoices(false);
                  triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
                  clearInterval(fetchInvoiceInterval.current);
                  fetchInvoiceInterval.current = undefined;
                }
              }
            }
          } catch (error) {
            console.log(error);
          }
        }
      }, 3000);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToPreImageScreen = (preImageData: string) => {
    navigate('LNDViewAdditionalInvoicePreImage', { preImageData });
  };

  const handleOnSharePressed = () => {
    const paymentRequest = typeof invoice === 'string' ? invoice : invoice.payment_request;
    if (!paymentRequest) return;
    Share.open({ message: `lightning:${paymentRequest}` }).catch(error => console.log(error));
  };

  useEffect(() => {
    if (typeof invoice === 'string') return;
    if (invoice.ispaid && invoiceStatusChanged) {
      setInvoiceStatusChanged(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice]);

  useEffect(() => {
    if (invoiceStatusChanged) {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    }
  }, [invoiceStatusChanged]);

  const onLayout = (e: any) => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : e.nativeEvent.layout.width / 1.8);
  };

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
  const decodeForDisplay = (paymentRequest?: string): { amountSats?: number; description?: string } => {
    if (!paymentRequest) return {};
    try {
      const d = wallet?.decodeInvoice(paymentRequest);
      const description = d?.description && d.description !== 'Send to Arkade address' ? d.description : undefined;
      return { amountSats: d?.num_satoshis || undefined, description };
    } catch {
      return {};
    }
  };

  const render = () => {
    if (typeof invoice === 'object') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
      const invoiceExpiration = invoice?.timestamp && invoice?.expire_time ? invoice.timestamp + invoice.expire_time : undefined;

      // Settlement wins over any claim/refund CTA. The SDK auto-claims
      // reverse swaps as soon as Boltz funds the VHTLC, so a stale
      // route-param snapshot (`invoice.ispaid:false`) can race a live
      // `_swapHistory` already at `invoice.settled`; checking the live
      // swap status alongside the snapshot prevents Claim from rendering
      // (and failing) after the SDK has already claimed.
      if (invoice.ispaid || invoice.type === 'paid_invoice' || (swap && isReverseSuccessStatus(swap.status))) {
        let amount = 0;
        let description;
        let invoiceDate;
        if (invoice.type === 'paid_invoice' && invoice?.value) {
          amount = invoice.value;
        } else if (invoice.type === 'user_invoice' && invoice.amt) {
          amount = invoice.amt;
        } else if (invoice.value) {
          // Settled Arkade swap: an enriched native Ark leg (type 'bitcoind_tx')
          // has no `amt`; its magnitude lives in the signed `value`.
          amount = Math.abs(invoice.value);
        }
        if (invoice.description) {
          description = invoice.description;
        } else if (invoice.memo && invoice.memo.length > 0) {
          description = invoice.memo;
        }
        if (invoice.timestamp) {
          invoiceDate = dayjs(invoice.timestamp * (String(invoice.timestamp).length === 10 ? 1000 : 1)).format('LLL');
        }
        return (
          <View style={styles.root}>
            <SuccessView
              amount={amount}
              amountUnit={BitcoinUnit.SATS}
              invoiceDescription={description}
              fee={invoice.fee ? new BigNumber(invoice.fee).multipliedBy(-1).dividedBy(1e8).toNumber() : undefined}
              shouldAnimate={false}
            />
            <View style={styles.detailsRoot}>
              <Text style={[styles.detailsText, stylesHook.detailsText]}>
                {loc.lndViewInvoice.date_time}: {invoiceDate}
              </Text>
              {invoice.payment_preimage && typeof invoice.payment_preimage === 'string' ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.detailsTouch}
                  onPress={() => navigateToPreImageScreen(String(invoice.payment_preimage))}
                >
                  <Text style={[styles.detailsText, stylesHook.detailsText]}>{loc.send.create_details}</Text>
                  <Icon
                    name={direction === 'rtl' ? 'angle-left' : 'angle-right'}
                    size={18}
                    type="font-awesome"
                    color={colors.alternativeTextColor}
                  />
                </TouchableOpacity>
              ) : undefined}
            </View>
          </View>
        );
      }

      // Reverse swap mid-flight: Boltz funded the VHTLC and the SDK is
      // auto-claiming (SwapManager.executeAutonomousAction → claimVHTLC).
      // No manual CTA — the SDK owns claim reliability — so we just show
      // a "Receiving" indicator until the status transitions to
      // `invoice.settled` and the success branch above catches it.
      if (claimable) {
        return (
          <View style={[styles.activeRoot, stylesHook.root]}>
            <ActivityIndicator size="large" color={colors.foregroundColor} />
            <BlueSpacing20 />
            <BlueTextCentered>{loc.lndViewInvoice.receiving_payment}</BlueTextCentered>
          </View>
        );
      }
      if (refundable) {
        return (
          <View style={[styles.activeRoot, stylesHook.root]}>
            <BlueTextCentered>{invoice.description ?? invoice.memo ?? ''}</BlueTextCentered>
            <BlueSpacing20 />
            <Button
              onPress={onRefundPressed}
              title={loc.lndViewInvoice.refund_funds}
              disabled={isActioning}
              showActivityIndicator={isActioning}
            />
          </View>
        );
      }

      if (invoiceExpiration ? invoiceExpiration < now : undefined) {
        return (
          <View style={[styles.root, stylesHook.root, styles.justifyContentCenter]}>
            <View style={[styles.expired, stylesHook.expired]}>
              <Icon name="times" size={50} type="font-awesome" color={colors.successCheck} />
            </View>
            <BlueTextCentered>{loc.lndViewInvoice.wasnt_paid_and_expired}</BlueTextCentered>
          </View>
        );
      }
      // Invoice has not expired, nor has it been paid for.
      if (invoice.payment_request) {
        const { amountSats: bolt11Amount, description } = decodeForDisplay(invoice.payment_request);
        const amountSats = bolt11Amount ?? invoice.amt;
        return (
          <ScrollView>
            <View style={[styles.activeRoot, stylesHook.root]}>
              <View style={styles.activeQrcode}>
                <QRCode value={invoice.payment_request} size={qrCodeSize} />
              </View>
              <BlueSpacing20 />
              <BlueText>
                {loc.lndViewInvoice.please_pay} {amountSats} {loc.lndViewInvoice.sats}
              </BlueText>
              {description ? (
                <BlueText>
                  {loc.lndViewInvoice.for} {description}
                </BlueText>
              ) : null}
              <View style={styles.copyText}>
                <CopyTextToClipboard truncated text={invoice.payment_request} />
              </View>
              <Button onPress={handleOnSharePressed} title={loc.receive.details_share} />
            </View>
          </ScrollView>
        );
      }
    } else if (invoice) {
      // `invoice` is the raw BOLT11 string — the polling effect hasn't yet swapped
      // it for the decoded object. Don't make the amount/description wait for that
      // 3s round-trip: both are encoded in the string and decode synchronously
      // (offline, cached) via the same decodeForDisplay() the object branch uses,
      // so we render the full "please pay" block now and it doesn't change when
      // the object arrives. A malformed string just falls back to QR + copy.
      const { amountSats, description } = decodeForDisplay(invoice);
      return (
        <ScrollView>
          <View style={[styles.activeRoot, stylesHook.root]}>
            <View style={styles.activeQrcode}>
              <QRCode value={invoice} size={qrCodeSize} />
            </View>
            <BlueSpacing20 />
            {amountSats ? (
              <BlueText>
                {loc.lndViewInvoice.please_pay} {amountSats} {loc.lndViewInvoice.sats}
              </BlueText>
            ) : null}
            {description ? (
              <BlueText>
                {loc.lndViewInvoice.for} {description}
              </BlueText>
            ) : null}
            <View style={styles.copyText}>
              <CopyTextToClipboard truncated text={invoice} />
            </View>
            <Button onPress={handleOnSharePressed} title={loc.receive.details_share} />
          </View>
        </ScrollView>
      );
    } else {
      // something is not right
      return (
        <View style={[styles.root, stylesHook.root]}>
          <BlueTextCentered>Internal error: invoice is not provided</BlueTextCentered>
        </View>
      );
    }
  };

  return <SafeAreaScrollView onLayout={onLayout}>{render()}</SafeAreaScrollView>;
};

export default LNDViewInvoice;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  justifyContentCenter: {
    justifyContent: 'center',
  },
  detailsRoot: {
    justifyContent: 'flex-end',
    marginBottom: 24,
    alignItems: 'center',
  },
  detailsTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 14,
    marginRight: 8,
  },
  expired: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  activeRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeQrcode: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  copyText: {
    marginVertical: 32,
    paddingHorizontal: 16,
  },
});
