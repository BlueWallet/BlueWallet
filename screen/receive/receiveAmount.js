import React, { Component } from 'react';
import {
  StyleSheet,
  View,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Clipboard,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { QRCode as QRSlow } from 'react-native-custom-qr-codes';
import QRFast from 'react-native-qrcode';
import bip21 from 'bip21';
import { SafeBlueArea, BlueButton, BlueNavigationStyle, BlueBitcoinAmount, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { width } = Dimensions.get('window');

export default class ReceiveAmount extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.receive.header,
    headerLeft: null,
  });

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          address: PropTypes.string,
        }),
      }),
    }),
  };

  constructor(props) {
    super(props);
    let address = props.navigation.state.params.address;

    this.state = {
      address: address,
      addressText: address,
      amount: undefined,
      label: undefined,
      amountSet: false,
    };
  }

  copyToClipboard = () => {
    this.setState({ addressText: loc.receive.details.copiedToClipboard }, () => {
      Clipboard.setString(this.state.bip21);
      setTimeout(() => this.setState({ addressText: this.state.address }), 1000);
    });
  };

  determineSize = () => {
    if (width > 312) {
      return width - 48;
    }
    return 312;
  };

  renderDefault() {
    return (
      <View>
        <View
          style={{
            flexDirection: 'row',
            borderColor: '#d2d2d2',
            borderBottomColor: '#d2d2d2',
            borderWidth: 1.0,
            borderBottomWidth: 0.5,
            backgroundColor: '#f5f5f5',
            minHeight: 44,
            height: 44,
            marginHorizontal: 20,
            alignItems: 'center',
            marginVertical: 8,
            borderRadius: 4,
          }}
        >
          <TextInput
            onChangeText={text => this.setState({ label: text })}
            placeholder={loc.receive.details.label}
            value={this.state.label || ''}
            numberOfLines={1}
            style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
            editable={!this.state.isLoading}
          />
        </View>
        <BlueButton
          title="Create"
          onPress={() => {
            this.setState({
              amountSet: true,
              bip21: bip21.encode(this.state.address, { amount: this.state.amount, label: this.state.label }),
            });
          }}
        />
      </View>
    );
  }

  renderWithSetAmount() {
    return (
      <View style={{ justifyContent: 'space-between' }}>
        <BlueText style={{ color: '#0c2550', fontWeight: '600', textAlign: 'center', paddingBottom: 24 }} numberOfLines={1}>
          {this.state.label}
        </BlueText>
        <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
          {Platform.OS === 'ios' || this.state.bip21.length < 54 ? (
            <QRSlow
              content={this.state.bip21}
              size={this.determineSize()}
              color={BlueApp.settings.foregroundColor}
              backgroundColor={BlueApp.settings.brandingColor}
              logo={require('../../img/qr-code.png')}
              ecl={'Q'}
            />
          ) : (
            <QRFast
              value={this.state.bip21}
              size={this.determineSize()}
              fgColor={BlueApp.settings.brandingColor}
              bgColor={BlueApp.settings.foregroundColor}
            />
          )}
        </View>
        <View style={{ marginBottom: 24, alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={this.copyToClipboard}>
            <Animated.Text style={styles.address} numberOfLines={0}>
              {this.state.bip21}
            </Animated.Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  render() {
    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <ScrollView>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'space-between' }}>
            <KeyboardAvoidingView behavior="position">
              <BlueBitcoinAmount
                amount={this.state.amount || ''}
                onChangeText={text => this.setState({ amount: text })}
                disabled={this.state.amountSet}
              />
              {this.state.amountSet ? this.renderWithSetAmount() : this.renderDefault()}
            </KeyboardAvoidingView>
            {this.state.amountSet && (
              <BlueButton
                buttonStyle={{
                  alignSelf: 'center',
                  marginBottom: 24,
                }}
                icon={{
                  name: 'share-alternative',
                  type: 'entypo',
                  color: BlueApp.settings.buttonTextColor,
                }}
                onPress={async () => {
                  Share.share({
                    message: this.state.bip21,
                  });
                }}
                title={loc.receive.details.share}
              />
            )}
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
