import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StatusBar,
  ScrollView,
  TouchableWithoutFeedback,
  BackHandler,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native';
import Share from 'react-native-share';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Icon } from 'react-native-elements';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

import {
  BlueLoading,
  BlueText,
  SafeBlueArea,
  BlueButton,
  BlueCopyTextToClipboard,
  BlueSpacing20,
  BlueTextCentered,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { SuccessView } from '../send/success';
import ToolTipMenu from '../../components/TooltipMenu';

const LNDViewInvoice = () => {
  const { invoice, walletID, isModal } = useRoute().params;
  const { wallets, setSelectedWallet, fetchAndSaveWalletTransactions } = useContext(BlueStorageContext);
  const wallet = wallets.find(w => w.getID() === walletID);
  const { colors } = useTheme();
  const { goBack, navigate, setParams, setOptions } = useNavigation();
  const [isLoading, setIsLoading] = useState(typeof invoice === 'string');
  const [isFetchingInvoices, setIsFetchingInvoices] = useState(true);
  const [invoiceStatusChanged, setInvoiceStatusChanged] = useState(false);
  const [qrCodeSize, setQRCodeSize] = useState(90);
  const fetchInvoiceInterval = useRef();
  const qrCode = useRef();
  const toolTip = useRef();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    valueText: {
      color: colors.alternativeTextColor2,
    },
    valueRoot: {
      backgroundColor: colors.background,
    },
    valueSats: {
      color: colors.alternativeTextColor2,
    },
    paidMark: {
      backgroundColor: colors.success,
    },
    detailsText: {
      color: colors.alternativeTextColor,
    },
    expired: {
      backgroundColor: colors.success,
    },
    additionalInfo: {
      backgroundColor: colors.brandingColor,
    },
  });

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
      clearInterval(fetchInvoiceInterval.current);
      fetchInvoiceInterval.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOptions(
      isModal === true
        ? {
            headerStyle: {
              backgroundColor: colors.customHeader,
              borderBottomWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
              shadowOffset: { height: 0, width: 0 },
            },
            gestureEnabled: false,
          }
        : {
            headerStyle: {
              backgroundColor: colors.customHeader,
              borderBottomWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
              shadowOffset: { height: 0, width: 0 },
            },
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  useEffect(() => {
    setSelectedWallet(walletID);
    console.log('LNDViewInvoice - useEffect');
    if (!invoice.ispaid) {
      fetchInvoiceInterval.current = setInterval(async () => {
        if (isFetchingInvoices) {
          try {
            const userInvoices = await wallet.getUserInvoices(20);
            // fetching only last 20 invoices
            // for invoice that was created just now - that should be enough (it is basically the last one, so limit=1 would be sufficient)
            // but that might not work as intended IF user creates 21 invoices, and then tries to check the status of invoice #0, it just wont be updated
            const updatedUserInvoice = userInvoices.filter(filteredInvoice =>
              typeof invoice === 'object'
                ? filteredInvoice.payment_request === invoice.payment_request
                : filteredInvoice.payment_request === invoice,
            )[0];
            if (typeof updatedUserInvoice !== 'undefined') {
              setInvoiceStatusChanged(true);
              setParams({ invoice: updatedUserInvoice });
              setIsLoading(false);
              if (updatedUserInvoice.ispaid) {
                // we fetched the invoice, and it is paid :-)
                setIsFetchingInvoices(false);
                fetchAndSaveWalletTransactions(walletID);
              } else {
                const currentDate = new Date();
                const now = (currentDate.getTime() / 1000) | 0;
                const invoiceExpiration = updatedUserInvoice.timestamp + updatedUserInvoice.expire_time;
                if (invoiceExpiration < now && !updatedUserInvoice.ispaid) {
                  // invoice expired :-(
                  fetchAndSaveWalletTransactions(walletID);
                  setIsFetchingInvoices(false);
                  ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
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
    } else {
      setIsFetchingInvoices(false);
      clearInterval(fetchInvoiceInterval.current);
      fetchInvoiceInterval.current = undefined;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackButton = () => {
    goBack(null);
    return true;
  };

  const navigateToPreImageScreen = () => {
    navigate('LNDViewAdditionalInvoicePreImage', {
      preImageData: invoice.payment_preimage && typeof invoice.payment_preimage === 'string' ? invoice.payment_preimage : 'none',
    });
  };

  const handleOnSharePressed = () => {
    Share.open({ message: `lightning:${invoice.payment_request}` }).catch(error => console.log(error));
  };

  const handleOnViewAdditionalInformationPressed = () => {
    navigate('LNDViewAdditionalInvoiceInformation', { walletID });
  };

  const showToolTipMenu = () => {
    toolTip.current.showMenu();
  };

  const handleShareQRCode = () => {
    qrCode.current.toDataURL(data => {
      const shareImageBase64 = {
        url: `data:image/png;base64,${data}`,
      };
      Share.open(shareImageBase64).catch(error => console.log(error));
    });
  };

  useEffect(() => {
    if (invoice.ispaid && invoiceStatusChanged) {
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      setInvoiceStatusChanged(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice]);

  const onLayout = e => {
    const { height, width } = e.nativeEvent.layout;
    setQRCodeSize(height > width ? width - 40 : e.nativeEvent.layout.width / 1.8);
  };

  const render = () => {
    if (isLoading) {
      return (
        <View style={[styles.root, stylesHook.root]}>
          <BlueLoading />
        </View>
      );
    }

    if (typeof invoice === 'object') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = invoice.timestamp + invoice.expire_time;
      if (invoice.ispaid || invoice.type === 'paid_invoice') {
        let amount = 0;
        if (invoice.type === 'paid_invoice' && invoice.value) {
          amount = invoice.value;
        } else if (invoice.type === 'user_invoice' && invoice.amt) {
          amount = invoice.amt;
        }
        let description = invoice.description;
        if (invoice.memo && invoice.memo.length > 0) {
          description = invoice.memo;
        }
        return (
          <View style={styles.root}>
            <SuccessView
              amount={amount}
              amountUnit={BitcoinUnit.SATS}
              invoiceDescription={description}
              shouldAnimate={invoiceStatusChanged}
            />
            <View style={styles.detailsRoot}>
              {invoice.payment_preimage && typeof invoice.payment_preimage === 'string' ? (
                <TouchableOpacity accessibilityRole="button" style={styles.detailsTouch} onPress={navigateToPreImageScreen}>
                  <Text style={[styles.detailsText, stylesHook.detailsText]}>{loc.send.create_details}</Text>
                  <Icon
                    name={I18nManager.isRTL ? 'angle-left' : 'angle-right'}
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
      if (invoiceExpiration < now) {
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
      return (
        <ScrollView>
          <View style={[styles.activeRoot, stylesHook.root]}>
            <TouchableWithoutFeedback onLongPress={showToolTipMenu}>
              <View style={styles.activeQrcode}>
                <ToolTipMenu
                  ref={toolTip}
                  anchorRef={qrCode}
                  actions={[
                    {
                      id: 'shareQRCode',
                      text: loc.receive.details_share,
                      onPress: handleShareQRCode,
                    },
                  ]}
                />

                <QRCode
                  value={invoice.payment_request}
                  logo={require('../../img/qr-code.png')}
                  size={qrCodeSize}
                  logoSize={90}
                  color="#000000"
                  logoBackgroundColor={colors.brandingColor}
                  backgroundColor="#FFFFFF"
                  getRef={qrCode}
                />
              </View>
            </TouchableWithoutFeedback>
            <BlueSpacing20 />
            <BlueText>
              {loc.lndViewInvoice.please_pay} {invoice.amt} {loc.lndViewInvoice.sats}
            </BlueText>
            {'description' in invoice && invoice.description.length > 0 && (
              <BlueText>
                {loc.lndViewInvoice.for} {invoice.description}
              </BlueText>
            )}
            <BlueCopyTextToClipboard text={invoice.payment_request} />

            <BlueButton onPress={handleOnSharePressed} title={loc.receive.details_share} />

            <BlueSpacing20 />
            <BlueButton
              style={stylesHook.additionalInfo}
              onPress={handleOnViewAdditionalInformationPressed}
              title={loc.lndViewInvoice.additional_info}
            />
          </View>
        </ScrollView>
      );
    }
  };

  return (
    <SafeBlueArea onLayout={onLayout}>
      <StatusBar barStyle="default" />
      {render()}
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  justifyContentCenter: {
    justifyContent: 'center',
  },
  qrCodeContainer: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
  valueAmount: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  valueText: {
    fontSize: 32,
    fontWeight: '600',
  },
  valueSats: {
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 3,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  memo: {
    color: '#9aa0aa',
    fontSize: 14,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '400',
    alignSelf: 'center',
  },
  paid: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidMark: {
    marginTop: -100,
    marginBottom: 16,
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
    borderWidth: 6,
    borderRadius: 8,
    borderColor: '#FFFFFF',
  },
});

LNDViewInvoice.navigationOptions = navigationStyle(
  {
    closeButton: true,
    closeButtonFunc: ({ navigation }) => navigation.dangerouslyGetParent().pop(),
  },
  (options, { theme, navigation, route }) => {
    const additionalOptions =
      route.params.isModal === true
        ? {
            headerLeft: null,
            gestureEnabled: false,
          }
        : {
            headerRight: null,
          };

    return {
      ...options,
      ...additionalOptions,
      title: loc.lndViewInvoice.lightning_invoice,
    };
  },
);

export default LNDViewInvoice;
