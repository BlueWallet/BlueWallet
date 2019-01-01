/* global alert */
import React, { Component } from 'react';
import { Animated, ScrollView, StyleSheet, View, TouchableOpacity, Clipboard, Share } from 'react-native';
import { BlueLoading, BlueText, SafeBlueArea, BlueButton, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Icon } from 'react-native-elements';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
const loc = require('../../loc');
const EV = require('../../events');
const QRFast = require('react-native-qrcode');

export default class LNDViewInvoice extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true, () => navigation.dismiss()),
    title: loc.receive.header,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    const invoice = props.navigation.getParam('invoice');
    const fromWallet = props.navigation.getParam('fromWallet');
    this.state = {
      invoice,
      fromWallet,
      isLoading: typeof invoice === 'string',
      addressText: typeof invoice === 'object' ? invoice.payment_request : invoice,
      isFetchingInvoices: true,
    };
    this.fetchInvoiceInterval = undefined;
  }

  async componentDidMount() {
    this.fetchInvoiceInterval = setInterval(async () => {
      if (this.state.isFetchingInvoices) {
        try {
          const userInvoices = JSON.stringify(await this.state.fromWallet.getUserInvoices());
          const updatedUserInvoice = JSON.parse(userInvoices).filter(invoice =>
            typeof this.state.invoice === 'object'
              ? invoice.payment_request === this.state.invoice.payment_request
              : invoice.payment_request === this.state.invoice,
          )[0];

          this.setState({ invoice: updatedUserInvoice, isLoading: false, addressText: updatedUserInvoice.payment_request });
          if (updatedUserInvoice.ispaid) {
            // we fetched the invoice, and it is paid :-)
            this.setState({ isFetchingInvoices: false });
            ReactNativeHapticFeedback.trigger('notificationSuccess', false);
            clearInterval(this.fetchInvoiceInterval);
            this.fetchInvoiceInterval = undefined;
            EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
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
        } catch (error) {
          console.log(error);
          alert(error);
          this.props.navigation.dismiss();
        }
      }
    }, 3000);
  }

  componentWillUnmount() {
    clearInterval(this.fetchInvoiceInterval);
    this.fetchInvoiceInterval = undefined;
  }

  copyToClipboard = () => {
    this.setState({ addressText: loc.receive.details.copiedToClipboard }, () => {
      Clipboard.setString(this.state.invoice.payment_request);
      setTimeout(() => this.setState({ addressText: this.state.invoice.payment_request }), 1000);
    });
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

      if (invoice.ispaid) {
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
      if (invoiceExpiration < now && !invoice.ispaid) {
        return (
          <SafeBlueArea style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
      <SafeBlueArea style={{ flex: 1 }}>
        <ScrollView>
          <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
              <QRFast
                value={typeof this.state.invoice === 'object' ? invoice.payment_request : invoice}
                size={300}
                fgColor={BlueApp.settings.brandingColor}
                bgColor={BlueApp.settings.foregroundColor}
              />
              {invoice && invoice.amt && <BlueText>Please pay {invoice.amt} sats</BlueText>}
              {invoice && invoice.description && <BlueText>For: {invoice.description}</BlueText>}
              <TouchableOpacity onPress={this.copyToClipboard}>
                <Animated.Text style={styles.address} numberOfLines={0}>
                  {this.state.addressText}
                </Animated.Text>
              </TouchableOpacity>

              <BlueButton
                icon={{
                  name: 'share-alternative',
                  type: 'entypo',
                  color: BlueApp.settings.buttonTextColor,
                }}
                onPress={async () => {
                  Share.share({
                    message: invoice.payment_request,
                  });
                }}
                title={loc.receive.details.share}
              />
              <BlueButton
                buttonStyle={{ backgroundColor: 'white' }}
                icon={{
                  name: 'info',
                  type: 'entypo',
                  color: BlueApp.settings.buttonTextColor,
                }}
                onPress={() => this.props.navigation.navigate('LNDViewAdditionalInvoiceInformation', { fromWallet: this.state.fromWallet })}
                title="Additional Information"
              />
            </View>
            <View style={{ marginBottom: 24 }} />
          </View>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

const styles = StyleSheet.create({
  address: {
    marginVertical: 32,
    fontSize: 15,
    color: '#9aa0aa',
    textAlign: 'center',
  },
});

LNDViewInvoice.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    navigate: PropTypes.function,
    getParam: PropTypes.function,
    dismiss: PropTypes.function,
  }),
};
