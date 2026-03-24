import React, { useEffect, useRef, useState } from "react";
import {
  RouteProp,
  useNavigation,
  useNavigationState,
  useRoute,
  useLocale,
} from "@react-navigation/native";
import {
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "../../components/Icon";
import Share from "react-native-share";
import triggerHapticFeedback, {
  HapticFeedbackTypes,
} from "../../blue_modules/hapticFeedback";
import { BlueText, BlueTextCentered } from "../../BlueComponents";
import Button from "../../components/Button";
import CopyTextToClipboard from "../../components/CopyTextToClipboard";
import QRCodeComponent from "../../components/QRCodeComponent";
import { useTheme } from "../../components/themes";
import loc from "../../loc";
import { BitcoinUnit } from "../../models/bitcoinUnits";
import { SuccessView } from "../send/success";
import LNDCreateInvoice from "./lndCreateInvoice";
import { useStorage } from "../../hooks/context/useStorage";
import { useExtendedNavigation } from "../../hooks/useExtendedNavigation";
import BigNumber from "bignumber.js";
import { LightningTransaction } from "../../class/wallets/types";
import dayjs from "dayjs";
import SafeAreaScrollView from "../../components/SafeAreaScrollView";
import { BlueSpacing20 } from "../../components/BlueSpacing";
import { LightningArkWallet, LightningCustodianWallet } from "../../class";

type LNDViewInvoiceRouteParams = {
  walletID: string;
  invoice: LightningTransaction | string; // its first passed as string and then decoded and turned into object
};

const LNDViewInvoice = () => {
  const { invoice, walletID } =
    useRoute<RouteProp<{ params: LNDViewInvoiceRouteParams }, "params">>()
      .params;
  const { wallets, fetchAndSaveWalletTransactions } = useStorage();
  const { colors, closeImage } = useTheme();
  const { direction } = useLocale();
  const { goBack, navigate, setParams, setOptions } = useExtendedNavigation();
  const navigation = useNavigation();

  const wallet = wallets.find((w) => w.getID() === walletID) as
    | LightningCustodianWallet
    | LightningArkWallet
    | undefined;
  const [isFetchingInvoices, setIsFetchingInvoices] = useState<boolean>(true);
  const [invoiceStatusChanged, setInvoiceStatusChanged] =
    useState<boolean>(false);
  const [qrCodeSize, setQRCodeSize] = useState<number>(90);
  const [arkAddress, setArkAddress] = useState<string>("");
  const fetchInvoiceInterval = useRef<any>(null);
  const isModal = useNavigationState(
    (state) => state.routeNames[0] === LNDCreateInvoice.routeName,
  );

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
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        goBack();
        return true;
      },
    );

    return () => {
      subscription.remove();
      clearInterval(fetchInvoiceInterval.current);
      fetchInvoiceInterval.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isArkOnly = typeof invoice === "object" && !invoice.payment_request;

  useEffect(() => {
    const options: Record<string, any> = isModal
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
        };
    if (isArkOnly) {
      options.headerTitle = loc.receive.header;
    }
    setOptions(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, isModal, isArkOnly]);

  // LN invoice polling for non-Ark wallets (LNDHub custodian wallets)
  useEffect(() => {
    if (!wallet || wallet.type === LightningArkWallet.type) return;
    if ((invoice as LightningTransaction).ispaid) return;

    fetchInvoiceInterval.current = setInterval(async () => {
      if (isFetchingInvoices) {
        try {
          // @ts-ignore - getUserInvoices is not set on TWallet
          const userInvoices: LightningTransaction[] =
            await wallet.getUserInvoices(20);
          const updatedUserInvoice = userInvoices.filter(
            (filteredInvoice: LightningTransaction) =>
              typeof invoice === "object"
                ? filteredInvoice.payment_request === invoice.payment_request
                : filteredInvoice.payment_request === invoice,
          )[0];
          if (updatedUserInvoice) {
            setInvoiceStatusChanged(true);
            setParams({ invoice: updatedUserInvoice });
            if (updatedUserInvoice.ispaid) {
              setIsFetchingInvoices(false);
              clearInterval(fetchInvoiceInterval.current);
              triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
              fetchAndSaveWalletTransactions(walletID);
            } else {
              const currentDate = new Date();
              const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
              const invoiceExpiration =
                (updatedUserInvoice.timestamp ?? 0) +
                (updatedUserInvoice.expire_time ?? 0);
              if (invoiceExpiration < now && !updatedUserInvoice.ispaid) {
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

    return () => {
      clearInterval(fetchInvoiceInterval.current);
      fetchInvoiceInterval.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wallet && wallet.type === LightningArkWallet.type) {
      (wallet as LightningArkWallet)
        .getArkAddress()
        .then(setArkAddress)
        .catch((e) => console.log("Failed to fetch Ark address:", e));
    }
  }, [wallet]);

  // Real-time Ark payment detection via SDK's notifyIncomingFunds + LN swap polling
  useEffect(() => {
    if (!wallet || wallet.type !== LightningArkWallet.type) return;
    if ((invoice as LightningTransaction).ispaid) return;

    const arkWallet = wallet as LightningArkWallet;
    let stopNotify: (() => void) | undefined;

    const onPaymentReceived = () => {
      setIsFetchingInvoices(false);
      clearInterval(fetchInvoiceInterval.current);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      // Force refresh to get accurate balance
      arkWallet._lastBalanceFetch = 0;
      arkWallet._lastTxFetch = 0;
      arkWallet
        .fetchBalance()
        .then(() => arkWallet.fetchTransactions())
        .then(() => {
          const txs = arkWallet.getTransactions();
          const latest = txs.filter((tx) => tx.value! > 0)[0];
          setParams({
            invoice: {
              ispaid: true,
              value: latest?.value ?? 0,
              amt: latest?.amt ?? 0,
              type: "user_invoice",
              timestamp: Math.floor(Date.now() / 1000),
              description: latest?.description ?? "Received",
              payment_request: latest?.payment_request,
            },
          });
          setInvoiceStatusChanged(true);
          fetchAndSaveWalletTransactions(walletID);
        })
        .catch((e) => console.log("[ARK] Post-receive refresh error:", e));
    };

    // Subscribe to real-time VTXO notifications for direct Ark payments
    arkWallet
      .notifyIncomingFunds((event) => {
        if (
          (event.type === "vtxo" && event.newVtxos?.length) ||
          (event.type === "utxo" && event.coins?.length)
        ) {
          stopNotify?.();
          onPaymentReceived();
        }
      })
      .then((stop) => {
        stopNotify = stop;
      })
      .catch((e) => console.log("[ARK] notifyIncomingFunds error:", e));

    // Wait for LN invoice payment via waitAndClaim (WebSocket-based, no polling)
    const paymentRequest =
      typeof invoice === "string"
        ? invoice
        : (invoice as LightningTransaction).payment_request;
    if (paymentRequest) {
      arkWallet
        .waitForInvoicePayment(paymentRequest)
        .then(() => {
          stopNotify?.();
          onPaymentReceived();
        })
        .catch((e) => console.log("[ARK] waitForInvoicePayment error:", e));
    }

    return () => {
      stopNotify?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToPreImageScreen = (preImageData: string) => {
    navigate("LNDViewAdditionalInvoicePreImage", { preImageData });
  };

  const getQrValue = (paymentRequest?: string): string => {
    if (arkAddress && paymentRequest) {
      return `bitcoin:?ark=${arkAddress}&lightning=${paymentRequest}`;
    }
    if (arkAddress) {
      return `bitcoin:?ark=${arkAddress}`;
    }
    return paymentRequest ?? "";
  };

  const handleOnSharePressed = () => {
    const qr =
      typeof invoice === "string"
        ? getQrValue(invoice)
        : getQrValue(invoice.payment_request);
    if (!qr) return;
    Share.open({ message: qr }).catch((error) => console.log(error));
  };

  useEffect(() => {
    if (typeof invoice === "string") return;
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
    setQRCodeSize(
      height > width ? width - 40 : e.nativeEvent.layout.width / 1.8,
    );
  };

  const render = () => {
    if (typeof invoice === "object") {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
      const invoiceExpiration =
        invoice?.timestamp && invoice?.expire_time
          ? invoice.timestamp + invoice.expire_time
          : undefined;
      if (invoice.ispaid || invoice.type === "paid_invoice") {
        let amount = 0;
        let description;
        let invoiceDate;
        if (invoice.type === "paid_invoice" && invoice?.value) {
          amount = invoice.value;
        } else if (invoice.type === "user_invoice" && invoice.amt) {
          amount = invoice.amt;
        }
        if (invoice.description) {
          description = invoice.description;
        } else if (invoice.memo && invoice.memo.length > 0) {
          description = invoice.memo;
        }
        if (invoice.timestamp) {
          invoiceDate = dayjs(
            invoice.timestamp *
              (String(invoice.timestamp).length === 10 ? 1000 : 1),
          ).format("LLL");
        }
        return (
          <View style={styles.root}>
            <SuccessView
              amount={amount}
              amountUnit={BitcoinUnit.SATS}
              invoiceDescription={description}
              fee={
                invoice.fee
                  ? new BigNumber(invoice.fee)
                      .multipliedBy(-1)
                      .dividedBy(1e8)
                      .toNumber()
                  : undefined
              }
              shouldAnimate={false}
            />
            <View style={styles.detailsRoot}>
              <Text style={[styles.detailsText, stylesHook.detailsText]}>
                {loc.lndViewInvoice.date_time}: {invoiceDate}
              </Text>
              {invoice.payment_preimage &&
              typeof invoice.payment_preimage === "string" ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.detailsTouch}
                  onPress={() =>
                    navigateToPreImageScreen(String(invoice.payment_preimage))
                  }
                >
                  <Text style={[styles.detailsText, stylesHook.detailsText]}>
                    {loc.send.create_details}
                  </Text>
                  <Icon
                    name={direction === "rtl" ? "angle-left" : "angle-right"}
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
      if (invoiceExpiration ? invoiceExpiration < now : undefined) {
        return (
          <View
            style={[styles.root, stylesHook.root, styles.justifyContentCenter]}
          >
            <View style={[styles.expired, stylesHook.expired]}>
              <Icon
                name="times"
                size={50}
                type="font-awesome"
                color={colors.successCheck}
              />
            </View>
            <BlueTextCentered>
              {loc.lndViewInvoice.wasnt_paid_and_expired}
            </BlueTextCentered>
          </View>
        );
      }
      // Invoice has not expired, nor has it been paid for.
      if (invoice.payment_request || arkAddress) {
        return (
          <ScrollView>
            <View style={[styles.activeRoot, stylesHook.root]}>
              <View style={styles.activeQrcode}>
                <QRCodeComponent
                  value={getQrValue(invoice.payment_request)}
                  size={qrCodeSize}
                />
              </View>
              <BlueSpacing20 />
              {invoice.amt ? (
                <BlueText>
                  {loc.lndViewInvoice.please_pay} {invoice.amt}{" "}
                  {loc.lndViewInvoice.sats}
                </BlueText>
              ) : null}
              {"description" in invoice &&
                (invoice.description?.length ?? 0) > 0 && (
                  <BlueText>
                    {loc.lndViewInvoice.for} {invoice.description ?? ""}
                  </BlueText>
                )}
              {invoice.payment_request ? (
                <CopyTextToClipboard truncated text={invoice.payment_request} />
              ) : null}
              {isArkOnly && arkAddress ? (
                <CopyTextToClipboard truncated text={arkAddress} />
              ) : null}
              <Button
                onPress={handleOnSharePressed}
                title={loc.receive.details_share}
              />
            </View>
          </ScrollView>
        );
      }
    } else if (invoice) {
      // `invoice` is string, just not decoded yet. Display QR code + copyable invoice text.
      return (
        <ScrollView>
          <View style={[styles.activeRoot, stylesHook.root]}>
            <View style={styles.activeQrcode}>
              <QRCodeComponent value={getQrValue(invoice)} size={qrCodeSize} />
            </View>
            <BlueSpacing20 />
            <CopyTextToClipboard truncated text={invoice} />
            <Button
              onPress={handleOnSharePressed}
              title={loc.receive.details_share}
            />
          </View>
        </ScrollView>
      );
    } else {
      // something is not right
      return (
        <View style={[styles.root, stylesHook.root]}>
          <BlueTextCentered>
            Internal error: invoice is not provided
          </BlueTextCentered>
        </View>
      );
    }
  };

  return (
    <SafeAreaScrollView onLayout={onLayout}>{render()}</SafeAreaScrollView>
  );
};

export default LNDViewInvoice;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "space-between",
  },
  justifyContentCenter: {
    justifyContent: "center",
  },
  detailsRoot: {
    justifyContent: "flex-end",
    marginBottom: 24,
    alignItems: "center",
  },
  detailsTouch: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsText: {
    fontSize: 14,
    marginRight: 8,
  },
  expired: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  activeRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeQrcode: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
});
