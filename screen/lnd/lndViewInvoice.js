import React, { Component } from 'react';
import { View, Text, Dimensions, ScrollView, BackHandler, InteractionManager, TouchableOpacity } from 'react-native';
import Share from 'react-native-share';
import {
  BlueLoading,
  BlueText,
  SafeBlueArea,
  BlueButton,
  BlueCopyTextToClipboard,
  BlueNavigationStyle,
  BlueSpacing20,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Icon } from 'react-native-elements';
import QRCode from 'react-native-qrcode-svg';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
const loc = require('../../loc');
const EV = require('../../events');
const { width, height } = Dimensions.get('window');

export default class LNDViewInvoice extends Component {
  static navigationOptions = ({ navigation }) =>
    navigation.getParam('isModal') === true
      ? {
          ...BlueNavigationStyle(navigation, true, () => navigation.dismiss()),
          title: 'Lightning Invoice',
          headerLeft: null,
        }
      : { ...BlueNavigationStyle(), title: 'Lightning Invoice' };

  constructor(props) {
    super(props);
    const invoice = props.navigation.getParam('invoice');
    const fromWallet = props.navigation.getParam('fromWallet');
    this.state = {
      invoice,
      fromWallet,
      isLoading: typeof invoice === 'string',
      addressText: typeof invoice === 'object' && invoice.hasOwnProperty('payment_request') ? invoice.payment_request : invoice,
      isFetchingInvoices: true,
      qrCodeHeight: height > width ? width - 20 : width / 2,
    };
    this.fetchInvoiceInterval = undefined;
    BackHandler.addEventListener('hardwareBackPress', this.handleBackButton);
  }

  componentDidMount() {
    this.fetchInvoiceInterval = setInterval(async () => {
      if (this.state.isFetchingInvoices) {
        try {
          const userInvoices = await this.state.fromWallet.getUserInvoices(20);
          // fetching only last 20 invoices
          // for invoice that was created just now - that should be enough (it is basically the last one, so limit=1 would be sufficient)
          // but that might not work as intended IF user creates 21 invoices, and then tries to check the status of invoice #0, it just wont be updated
          const updatedUserInvoice = userInvoices.filter(invoice =>
            typeof this.state.invoice === 'object'
              ? invoice.payment_request === this.state.invoice.payment_request
              : invoice.payment_request === this.state.invoice,
          )[0];

          if (typeof updatedUserInvoice !== 'undefined') {
            this.setState({ invoice: updatedUserInvoice, isLoading: false, addressText: updatedUserInvoice.payment_request });
            if (updatedUserInvoice.ispaid) {
              // we fetched the invoice, and it is paid :-)
              this.setState({ isFetchingInvoices: false });
              ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
              clearInterval(this.fetchInvoiceInterval);
              this.fetchInvoiceInterval = undefined;
              EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // remote because we want to refetch from server tx list and balance
            } else {
              const currentDate = new Date();
              const now = (currentDate.getTime() / 1000) | 0;
              const invoiceExpiration = updatedUserInvoice.timestamp + updatedUserInvoice.expire_time;
              if (invoiceExpiration < now && !updatedUserInvoice.ispaid) {
                // invoice expired :-(
                this.setState({ isFetchingInvoices: false });
                ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
                clearInterval(this.fetchInvoiceInterval);
                this.fetchInvoiceInterval = undefined;
                EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
              }
            }
          }
        } catch (error) {
          console.log(error);
        }
      }
    }, 3000);
  }

  async componentWillUnmount() {
    clearInterval(this.fetchInvoiceInterval);
    this.fetchInvoiceInterval = undefined;
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackButton);
  }

  handleBackButton = () => {
    this.props.navigation.goBack(null);
    return true;
  };

  onLayout = () => {
    const { height } = Dimensions.get('window');
    this.setState({ qrCodeHeight: height > width ? width - 20 : width / 2 });
  };

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    const { invoice } = this.state;
    if (typeof invoice === 'object') {
      const currentDate = new Date();
      const now = (currentDate.getTime() / 1000) | 0;
      const invoiceExpiration = invoice.timestamp + invoice.expire_time;

      if (this.state.showPreimageQr) {
        return (
          <SafeBlueArea style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <BlueText>Preimage:</BlueText>
              <BlueSpacing20 />
              <QRCode
                value={(invoice.payment_preimage && typeof invoice.payment_preimage === 'string' && invoice.payment_preimage) || 'none'}
                logo={require('../../img/qr-code.png')}
                size={this.state.qrCodeHeight}
                logoSize={90}
                getRef={c => (this.qrCodeSVG = c)}
                color={BlueApp.settings.foregroundColor}
                logoBackgroundColor={BlueApp.settings.brandingColor}
              />
              <BlueSpacing20 />
              <BlueCopyTextToClipboard text={invoice.payment_preimage} />
            </View>
          </SafeBlueArea>
        );
      }

      if (invoice.ispaid || invoice.type === 'paid_invoice') {
        return (
          <SafeBlueArea style={{ flex: 1 }}>
            <View style={{ flex: 2, flexDirection: 'column', justifyContent: 'center' }}>
              {invoice.type === 'paid_invoice' && invoice.value && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 8 }}>
                  <Text style={{ color: '#0f5cc0', fontSize: 32, fontWeight: '600' }}>{invoice.value}</Text>
                  <Text
                    style={{
                      color: '#0f5cc0',
                      fontSize: 16,
                      marginHorizontal: 4,
                      paddingBottom: 3,
                      fontWeight: '600',
                      alignSelf: 'flex-end',
                    }}
                  >
                    {loc.lndViewInvoice.sats}
                  </Text>
                </View>
              )}
              {invoice.type === 'user_invoice' && invoice.amt && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 8 }}>
                  <Text style={{ color: '#0f5cc0', fontSize: 32, fontWeight: '600' }}>{invoice.amt}</Text>
                  <Text
                    style={{
                      color: '#0f5cc0',
                      fontSize: 16,
                      marginHorizontal: 4,
                      paddingBottom: 3,
                      fontWeight: '600',
                      alignSelf: 'flex-end',
                    }}
                  >
                    {loc.lndViewInvoice.sats}
                  </Text>
                </View>
              )}
              {!invoice.ispaid && invoice.memo && invoice.memo.length > 0 && (
                <Text
                  style={{ color: '#9aa0aa', fontSize: 14, marginHorizontal: 4, paddingBottom: 6, fontWeight: '400', alignSelf: 'center' }}
                >
                  {invoice.memo}
                </Text>
              )}
            </View>

            <View style={{ flex: 3, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  backgroundColor: '#ccddf9',
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  alignSelf: 'center',
                  justifyContent: 'center',
                  marginTop: -100,
                  marginBottom: 16,
                }}
              >
                <Icon name="check" size={50} type="font-awesome" color="#0f5cc0" />
              </View>
              <BlueText>{loc.lndViewInvoice.has_been_paid}</BlueText>
            </View>
            <View style={{ flex: 1, justifyContent: 'flex-end', marginBottom: 24, alignItems: 'center' }}>
              {invoice.payment_preimage && typeof invoice.payment_preimage === 'string' && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => this.setState({ showPreimageQr: true })}
                >
                  <Text style={{ color: '#9aa0aa', fontSize: 14, marginRight: 8 }}>{loc.send.create.details}</Text>
                  <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
                </TouchableOpacity>
              )}
            </View>
          </SafeBlueArea>
        );
      }
      if (invoiceExpiration < now && !invoice.ispaid) {
        return (
          <SafeBlueArea style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <View
                style={{
                  backgroundColor: '#ccddf9',
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  alignSelf: 'center',
                  justifyContent: 'center',
                  marginTop: -100,
                  marginBottom: 30,
                }}
              >
                <Icon name="times" size={50} type="font-awesome" color="#0f5cc0" />
              </View>
              <BlueText>{loc.lndViewInvoice.wasnt_paid_and_expired}</BlueText>
            </View>
          </SafeBlueArea>
        );
      } else if (invoiceExpiration > now && invoice.ispaid) {
        if (invoice.ispaid) {
          return (
            <SafeBlueArea style={{ flex: 1 }}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
        <ScrollView>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              marginTop: 8,
              justifyContent: 'space-between',
            }}
            onLayout={this.onLayout}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
              <QRCode
                value={typeof this.state.invoice === 'object' ? invoice.payment_request : invoice}
                logo={require('../../img/qr-code.png')}
                size={this.state.qrCodeHeight}
                logoSize={90}
                getRef={c => (this.qrCodeSVG = c)}
                color={BlueApp.settings.foregroundColor}
                logoBackgroundColor={BlueApp.settings.brandingColor}
              />
            </View>

            <BlueSpacing20 />
            <BlueText>
              {loc.lndViewInvoice.please_pay} {invoice.amt} {loc.lndViewInvoice.sats}
            </BlueText>
            {invoice && invoice.hasOwnProperty('description') && invoice.description.length > 0 && (
              <BlueText>
                {loc.lndViewInvoice.for} {invoice.description}
              </BlueText>
            )}
            <BlueCopyTextToClipboard text={this.state.invoice.payment_request} />

            <BlueButton
              icon={{
                name: 'share-alternative',
                type: 'entypo',
                size: 10,
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={async () => {
                if (this.qrCodeSVG === undefined) {
                  Share.open({ message: `lightning:${invoice.payment_request}` }).catch(error => console.log(error));
                } else {
                  InteractionManager.runAfterInteractions(async () => {
                    this.qrCodeSVG.toDataURL(data => {
                      let shareImageBase64 = {
                        message: `lightning:${invoice.payment_request}`,
                        url: `data:image/png;base64,${data}`,
                      };
                      Share.open(shareImageBase64).catch(error => console.log(error));
                    });
                  });
                }
              }}
              title={loc.receive.details.share}
            />
            <BlueSpacing20 />
            <BlueButton
              style={{
                backgroundColor: BlueApp.settings.brandingColor,
              }}
              onPress={() => this.props.navigation.navigate('LNDViewAdditionalInvoiceInformation', { fromWallet: this.state.fromWallet })}
              title={loc.lndViewInvoice.additional_info}
            />
          </View>
          <BlueSpacing20 />
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

LNDViewInvoice.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    getParam: PropTypes.func,
    popToTop: PropTypes.func,
  }),
};
