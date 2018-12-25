import React, { Component } from 'react';
import { Animated, StyleSheet, View, TouchableOpacity, Clipboard, Share } from 'react-native';
// import { QRCode } from 'react-native-custom-qr-codes';
import { BlueLoading, SafeBlueArea, BlueButton, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const QRFast = require('react-native-qrcode');

export default class LNDViewInvoice extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true, () => navigation.dismiss()),
    title: loc.receive.header,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    const invoice = props.navigation.getParam('invoice').toString();
    this.state = {
      isLoading: false,
      invoice,
      addressText: invoice,
    };
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

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
            {/* <QRCode
              content={this.state.invoice}
              size={(is.ipad() && 300) || 300}
              color={BlueApp.settings.foregroundColor}
              backgroundColor={BlueApp.settings.brandingColor}
              logo={require('../../img/qr-code.png')}
            /> */}
            <QRFast
              value={this.state.invoice}
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
                  message: this.state.invoice,
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
