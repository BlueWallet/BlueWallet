import React, { Component } from 'react';
import { Animated, StyleSheet, View, TouchableOpacity, Clipboard, Share } from 'react-native';
// import { QRCode } from 'react-native-custom-qr-codes';
import { BlueLoading, BlueText, SafeBlueArea, BlueButton, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
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
      isLoading: true,
      addressText: typeof invoice === 'object' ? invoice.payment_request : invoice,
    };
    this.fetchInvoiceInterval = undefined;
  }

  async componentDidMount() {
    this.fetchInvoiceInterval = setInterval(async () => {
      const userInvoices = JSON.stringify(await this.state.fromWallet.getUserInvoices());
      const updatedUserInvoice = JSON.parse(userInvoices).filter(invoice =>
        typeof this.state.invoice === 'object'
          ? invoice.payment_request === this.state.invoice.payment_request
          : invoice.payment_request === this.state.invoice,
      )[0];
      this.setState({ invoice: updatedUserInvoice, isLoading: false });
      if (updatedUserInvoice.ispaid) {
        ReactNativeHapticFeedback.trigger('notificationSuccess', false);
        clearInterval(this.fetchInvoiceInterval);
        this.fetchInvoiceInterval = undefined;
        EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
      }
    }, 5000);
  }

  componentWillUnmount() {
    clearInterval(this.fetchInvoiceInterval);
    this.fetchInvoiceInterval = undefined;
  }

  copyToClipboard = () => {
    this.setState({ addressText: loc.receive.details.copiedToClipboard }, () => {
      Clipboard.setString(this.state.invoice);
      setTimeout(() => this.setState({ addressText: this.state.invoice }), 1000);
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
              <BlueText>This invoice has been paid for.</BlueText>
            </View>
          </SafeBlueArea>
        );
      }
      if (invoiceExpiration < now && !invoice.ispaid) {
        return (
          <SafeBlueArea style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <BlueText>This invoice was not paid for and has expired.</BlueText>
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
        <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
            <QRFast
              value={typeof this.state.invoice === 'object' ? invoice.payment_request : invoice}
              size={300}
              fgColor={BlueApp.settings.brandingColor}
              bgColor={BlueApp.settings.foregroundColor}
            />
            <TouchableOpacity onPress={this.copyToClipboard}>
              <Animated.Text style={styles.address} numberOfLines={0}>
                {this.state.addressText}
              </Animated.Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: 24 }}>
            <BlueButton
              icon={{
                name: 'share-alternative',
                type: 'entypo',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={async () => {
                Share.share({
                  message: invoice,
                });
              }}
              title={loc.receive.details.share}
            />
          </View>
        </View>
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
    getParam: PropTypes.function,
  }),
};
