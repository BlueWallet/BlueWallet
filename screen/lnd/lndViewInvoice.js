import React, { Component } from 'react';
import { View, Dimensions, Share, ScrollView, BackHandler } from 'react-native';
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
import { ACINQStrikeLightningWallet, LightningCustodianWallet } from '../../class/';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
const loc = require('../../loc');
const EV = require('../../events');
const QRFast = require('react-native-qrcode');
const { width, height } = Dimensions.get('window');
const dayjs = require('dayjs');

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

  async componentDidMount() {
    this.fetchInvoiceInterval = setInterval(async () => {
      if (this.state.isFetchingInvoices) {
        try {
          let updatedUserInvoice;
          if (this.state.fromWallet.type === ACINQStrikeLightningWallet.type) {
            updatedUserInvoice = await this.state.fromWallet.getCharge(this.state.invoice.id);
            console.warn(updatedUserInvoice);
          } else {
            const userInvoices = await this.state.fromWallet.getUserInvoices(20);
            // fetching only last 20 invoices
            // for invoice that was created just now - that should be enough (it is basically the last one, so limit=1 would be sufficient)
            // but that might not work as intended IF user creates 21 invoices, and then tries to check the status of invoice #0, it just wont be updated
            updatedUserInvoice = userInvoices.filter(invoice =>
              typeof this.state.invoice === 'object'
                ? invoice.payment_request === this.state.invoice.payment_request
                : invoice.payment_request === this.state.invoice,
            )[0];
          }

          if (typeof updatedUserInvoice !== 'undefined') {
            this.setState({ invoice: updatedUserInvoice, isLoading: false, addressText: updatedUserInvoice.payment_request });
            if (updatedUserInvoice.ispaid || updatedUserInvoice.paid) {
              // we fetched the invoice, and it is paid :-)
              this.setState({ isFetchingInvoices: false });
              ReactNativeHapticFeedback.trigger('notificationSuccess', false);
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
                ReactNativeHapticFeedback.trigger('notificationError', false);
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

  componentWillUnmount() {
    clearInterval(this.fetchInvoiceInterval);
    this.fetchInvoiceInterval = undefined;
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackButton);
  }

  handleBackButton() {
    this.props.navigation.dismiss();
    return true;
  }

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

      if (invoice.ispaid || invoice.type === 'paid_invoice' || (invoice.paid && invoice.object === 'charge')) {
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
                  marginTop: 43,
                  marginBottom: 53,
                }}
              >
                <Icon name="check" size={50} type="font-awesome" color="#0f5cc0" />
              </View>
              <BlueText>This invoice has been paid for</BlueText>
            </View>
          </SafeBlueArea>
        );
      }
      const expectedExpiration = dayjs(invoice.updated + 86400000);
      let chargeInvoiceExpired = false;
      if (expectedExpiration.isBefore(dayjs())) {
        chargeInvoiceExpired = true;
      }
      if ((invoiceExpiration < now && !invoice.ispaid) || chargeInvoiceExpired) {
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
                  marginTop: 43,
                  marginBottom: 53,
                }}
              >
                <Icon name="times" size={50} type="font-awesome" color="#0f5cc0" />
              </View>
              <BlueText>This invoice was not paid for and has expired</BlueText>
            </View>
          </SafeBlueArea>
        );
      } else if (invoiceExpiration > now && invoice.ispaid) {
        if (invoice.ispaid) {
          return (
            <SafeBlueArea style={{ flex: 1 }}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <BlueText>'This invoice has been paid for.'</BlueText>
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
              <QRFast
                value={typeof this.state.invoice === 'object' ? invoice.payment_request : invoice}
                fgColor={BlueApp.settings.brandingColor}
                bgColor={BlueApp.settings.foregroundColor}
                size={this.state.qrCodeHeight}
              />
            </View>

            <BlueSpacing20 />
            {invoice && invoice.amt && <BlueText>Please pay {invoice.amt} sats</BlueText>}
            {invoice && invoice.hasOwnProperty('description') && invoice.description.length > 0 && (
              <BlueText>For: {invoice.description}</BlueText>
            )}
            <BlueCopyTextToClipboard text={this.state.invoice.payment_request} />

            <BlueButton
              icon={{
                name: 'share-alternative',
                type: 'entypo',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={async () => {
                Share.share({
                  message: 'lightning:' + invoice.payment_request,
                });
              }}
              title={loc.receive.details.share}
            />
            <BlueSpacing20 />
            {this.state.fromWallet.type === LightningCustodianWallet.type && (
              <BlueButton
                icon={{
                  name: 'info',
                  type: 'entypo',
                  color: BlueApp.settings.buttonTextColor,
                }}
                onPress={() => this.props.navigation.navigate('LNDViewAdditionalInvoiceInformation', { fromWallet: this.state.fromWallet })}
                title="Additional Information"
                style={{ backgroundColor: '#FFFFFF' }}
              />
            )}
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
    dismiss: PropTypes.func,
  }),
};
