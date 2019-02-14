import React, { Component } from 'react';
import { View, Share, TextInput, KeyboardAvoidingView, Dimensions, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import bip21 from 'bip21';
import {
  SafeBlueArea,
  BlueCard,
  BlueButton,
  BlueNavigationStyle,
  BlueBitcoinAmount,
  BlueText,
  BlueCopyTextToClipboard,
} from '../../BlueComponents';
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
        <BlueCard>
          <BlueButton
            title={loc.receive.details.create}
            onPress={() => {
              this.setState({
                amountSet: true,
                bip21: bip21.encode(this.state.address, { amount: this.state.amount, label: this.state.label }),
              });
            }}
          />
        </BlueCard>
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
          <QRCode
            value={this.state.bip21}
            logo={require('../../img/qr-code.png')}
            size={this.determineSize()}
            logoSize={90}
            color={BlueApp.settings.foregroundColor}
            logoBackgroundColor={BlueApp.settings.brandingColor}
            ecl={'Q'}
          />
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <BlueCopyTextToClipboard text={this.state.bip21} />
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
              <BlueCard>
                <BlueButton
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
              </BlueCard>
            )}
          </View>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}
