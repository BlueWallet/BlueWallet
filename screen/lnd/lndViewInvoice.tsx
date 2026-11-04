import React, { useEffect, useRef, useState } from 'react';
import { useNavigation, RouteProp, useRoute, useLocale } from '@react-navigation/native';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View, LayoutChangeEvent } from 'react-native';
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
import { useStorage } from '../../hooks/context/useStorage';
import BigNumber from 'bignumber.js';
import { LightningTransaction } from '../../class/wallets/types';
import dayjs from 'dayjs';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const LNDViewInvoice = () => {
  const { invoice, walletID } = useRoute<RouteProp<DetailViewStackParamList, 'LNDViewInvoice'>>().params;
  const { wallets, fetchAndSaveWalletTransactions } = useStorage();
  const { colors } = useTheme();
  const { direction } = useLocale();
  const { goBack, navigate, setParams } = useNavigation();

  const wallet = wallets.find(w => w.getID() === walletID) as LightningCustodianWallet | undefined;
  const [isFetchingInvoices, setIsFetchingInvoices] = useState<boolean>(true);
  const [invoiceStatusChanged, setInvoiceStatusChanged] = useState<boolean>(false);
  const [qrCodeSize, setQRCodeSize] = useState<number>(90);
  const fetchInvoiceInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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
    console.log('LNDViewInvoice - useEffect', { invoice });

    if (!wallet) {
      return;
    }
    if (!(invoice as LightningTransaction).ispaid) {
      fetchInvoiceInterval.current = setInterval(async () => {
        if (isFetchingInvoices) {
          try {
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

  const onLayout = (e: LayoutChangeEvent) => {
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

      if (invoice.ispaid || invoice.type === 'paid_invoice') {
        let amount = 0;
        let description;
        let invoiceDate;
        if (invoice.type === 'paid_invoice' && invoice?.value) {
          amount = invoice.value;
        } else if (invoice.type === 'user_invoice' && invoice.amt) {
          amount = invoice.amt;
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
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.detailsTouch, pressed && styles.detailsTouchPressed]}
                  onPress={() => navigateToPreImageScreen(String(invoice.payment_preimage))}
                >
                  <Text style={[styles.detailsText, stylesHook.detailsText]}>{loc.send.create_details}</Text>
                  <Icon
                    name={direction === 'rtl' ? 'angle-left' : 'angle-right'}
                    size={18}
                    type="font-awesome"
                    color={colors.alternativeTextColor}
                  />
                </Pressable>
              ) : undefined}
            </View>
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
  detailsTouchPressed: {
    opacity: 0.7,
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
