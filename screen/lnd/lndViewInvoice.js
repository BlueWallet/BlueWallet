import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StatusBar, ScrollView, BackHandler, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Share from 'react-native-share';
import {
  BlueLoading,
  BlueText,
  SafeBlueArea,
  BlueButton,
  SecondButton,
  BlueCopyTextToClipboard,
  BlueNavigationStyle,
  BlueSpacing20,
  BlueBigCheckmark,
} from '../../BlueComponents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Icon } from 'react-native-elements';
import QRCode from 'react-native-qrcode-svg';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';

const LNDViewInvoice = () => {
  const { invoice, fromWallet, isModal } = useRoute().params;
  const { setSelectedWallet, fetchAndSaveWalletTransactions } = useContext(BlueStorageContext);
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const { goBack, navigation, navigate, setParams, setOptions, dangerouslyGetParent } = useNavigation();
  const [isLoading, setIsLoading] = useState(typeof invoice === 'string');
  const [isFetchingInvoices, setIsFetchingInvoices] = useState(true);
  const [showPreimageQr, setShowPreimageQr] = useState(false);
  const qrCodeHeight = height > width ? width - 20 : width / 2;
  const fetchInvoiceInterval = useRef();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    valueText: {
      color: colors.alternativeTextColor2,
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
            ...BlueNavigationStyle(navigation, true, () => dangerouslyGetParent().pop()),
            title: loc.lnd.lightning_invoice,
            headerLeft: null,
            headerStyle: {
              ...BlueNavigationStyle().headerStyle,
              backgroundColor: colors.customHeader,
            },
            gestureEnabled: false,
          }
        : {
            ...BlueNavigationStyle(),
            title: loc.lnd.lightning_invoice,
            headerStyle: {
              ...BlueNavigationStyle().headerStyle,
              backgroundColor: colors.customHeader,
            },
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  useEffect(() => {
    setSelectedWallet(fromWallet.getID());
    console.log('LNDViewInvoice - useEffect');
    fetchInvoiceInterval.current = setInterval(async () => {
      if (isFetchingInvoices) {
        try {
          const userInvoices = await fromWallet.getUserInvoices(20);
          // fetching only last 20 invoices
          // for invoice that was created just now - that should be enough (it is basically the last one, so limit=1 would be sufficient)
          // but that might not work as intended IF user creates 21 invoices, and then tries to check the status of invoice #0, it just wont be updated
          const updatedUserInvoice = userInvoices.filter(filteredInvoice =>
            typeof invoice === 'object'
              ? filteredInvoice.payment_request === invoice.payment_request
              : filteredInvoice.payment_request === invoice,
          )[0];
          if (typeof updatedUserInvoice !== 'undefined') {
            setParams({ invoice: updatedUserInvoice });
            setIsLoading(true);
            if (updatedUserInvoice.ispaid) {
              // we fetched the invoice, and it is paid :-)
              setIsFetchingInvoices(false);
              ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
              clearInterval(fetchInvoiceInterval.current);
              fetchInvoiceInterval.current = undefined;
              fetchAndSaveWalletTransactions(fromWallet.getID());
            } else {
              const currentDate = new Date();
              const now = (currentDate.getTime() / 1000) | 0;
              const invoiceExpiration = updatedUserInvoice.timestamp + updatedUserInvoice.expire_time;
              if (invoiceExpiration < now && !updatedUserInvoice.ispaid) {
                // invoice expired :-(
                fetchAndSaveWalletTransactions(fromWallet.getID());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackButton = () => {
    goBack(null);
    return true;
  };

  const setShowPreimageQrTrue = () => {
    setShowPreimageQr(true);
  };

  const handleOnSharePressed = () => {
    Share.open({ message: `lightning:${invoice.payment_request}` }).catch(error => console.log(error));
  };

  const handleOnViewAdditionalInformationPressed = () => {
    navigate('LNDViewAdditionalInvoiceInformation', { fromWallet });
  };

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

    if (showPreimageQr) {
      return (
        <SafeBlueArea style={[styles.root, stylesHook.root]}>
          <StatusBar barStyle="default" />
          <View style={styles.center}>
            <BlueText>{loc.lndViewInvoice.preimage}:</BlueText>
            <BlueSpacing20 />
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={invoice.payment_preimage && typeof invoice.payment_preimage === 'string' ? invoice.payment_preimage : 'none'}
                logo={require('../../img/qr-code.png')}
                size={qrCodeHeight}
                logoSize={90}
                color="#000000"
                logoBackgroundColor={colors.brandingColor}
                backgroundColor="#FFFFFF"
              />
            </View>
            <BlueSpacing20 />
            <BlueCopyTextToClipboard
              text={invoice.payment_preimage && typeof invoice.payment_preimage === 'string' ? invoice.payment_preimage : 'none'}
            />
          </View>
        </SafeBlueArea>
      );
    }

    if (invoice.ispaid || invoice.type === 'paid_invoice') {
      return (
        <SafeBlueArea style={[styles.root, stylesHook.root]}>
          <StatusBar barStyle="default" />
          <View style={styles.valueRoot}>
            {invoice.type === 'paid_invoice' && invoice.value && (
              <View style={styles.valueAmount}>
                <Text style={[styles.valueText, stylesHook.valueText]}>{invoice.value}</Text>
                <Text style={[styles.valueSats, stylesHook.valueSats]}>{loc.lndViewInvoice.sats}</Text>
              </View>
            )}
            {invoice.type === 'user_invoice' && invoice.amt && (
              <View style={styles.valueAmount}>
                <Text style={[styles.valueText, stylesHook.valueText]}>{invoice.amt}</Text>
                <Text style={[styles.valueSats, stylesHook.valueSats]}>{loc.lndViewInvoice.sats}</Text>
              </View>
            )}
            {!invoice.ispaid && invoice.memo && invoice.memo.length > 0 && <Text style={styles.memo}>{invoice.memo}</Text>}
          </View>

          <View style={styles.paid}>
            <BlueBigCheckmark style={styles.paidMark} />
            <BlueText>{loc.lndViewInvoice.has_been_paid}</BlueText>
          </View>
          <View style={styles.detailsRoot}>
            {invoice.payment_preimage && typeof invoice.payment_preimage === 'string' ? (
              <TouchableOpacity style={styles.detailsTouch} onPress={setShowPreimageQrTrue}>
                <Text style={[styles.detailsText, stylesHook.detailsText]}>{loc.send.create_details}</Text>
                <Icon name="angle-right" size={18} type="font-awesome" color={colors.alternativeTextColor} />
              </TouchableOpacity>
            ) : (
              <View />
            )}
          </View>
        </SafeBlueArea>
      );
    }
    if (invoiceExpiration < now && !invoice.ispaid) {
      return (
        <SafeBlueArea style={[styles.root, stylesHook.root]}>
          <StatusBar barStyle="default" />
          <View style={styles.center}>
            <View style={[styles.expired, stylesHook.expired]}>
              <Icon name="times" size={50} type="font-awesome" color={colors.successCheck} />
            </View>
            <BlueText>{loc.lndViewInvoice.wasnt_paid_and_expired}</BlueText>
          </View>
        </SafeBlueArea>
      );
    } else if (invoiceExpiration > now && invoice.ispaid) {
      if (invoice.ispaid) {
        return (
          <SafeBlueArea style={[styles.root, stylesHook.root]}>
            <View style={styles.center}>
              <BlueText>{loc.lndViewInvoice.has_been_paid}</BlueText>
            </View>
          </SafeBlueArea>
        );
      }
    }
  }
  // Invoice has not expired, nor has it been paid for.
  return (
    <SafeBlueArea>
      <StatusBar barStyle="default" />
      <ScrollView>
        <View style={styles.activeRoot}>
          <View style={styles.activeQrcode}>
            <QRCode
              value={typeof invoice === 'object' ? invoice.payment_request : invoice}
              logo={require('../../img/qr-code.png')}
              size={qrCodeHeight}
              logoSize={90}
              color="#000000"
              logoBackgroundColor={colors.brandingColor}
              backgroundColor="#FFFFFF"
            />
          </View>

          <BlueSpacing20 />
          <BlueText>
            {loc.lndViewInvoice.please_pay} {invoice.amt} {loc.lndViewInvoice.sats}
          </BlueText>
          {invoice && 'description' in invoice && invoice.description.length > 0 && (
            <BlueText>
              {loc.lndViewInvoice.for} {invoice.description}
            </BlueText>
          )}
          <BlueCopyTextToClipboard text={invoice.payment_request} />

          <SecondButton onPress={handleOnSharePressed} title={loc.receive.details_share} />
          <BlueSpacing20 />
          <BlueButton
            style={stylesHook.additionalInfo}
            onPress={handleOnViewAdditionalInformationPressed}
            title={loc.lndViewInvoice.additional_info}
          />
        </View>
        <BlueSpacing20 />
      </ScrollView>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeContainer: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
  valueRoot: {
    flex: 2,
    flexDirection: 'column',
    justifyContent: 'center',
  },
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
    flex: 1,
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
    marginTop: -100,
    marginBottom: 30,
  },
  activeRoot: {
    flex: 1,
    alignItems: 'center',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  activeQrcode: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    borderWidth: 6,
    borderRadius: 8,
    borderColor: '#FFFFFF',
  },
});

export default LNDViewInvoice;
