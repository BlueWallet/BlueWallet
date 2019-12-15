import React, { Component } from 'react';
import { View, InteractionManager, Platform, TextInput, KeyboardAvoidingView, Keyboard, StyleSheet, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import bip21 from 'bip21';
import {
  BlueLoading,
  SafeBlueArea,
  BlueCopyTextToClipboard,
  BlueButton,
  BlueButtonLink,
  BlueNavigationStyle,
  is,
  BlueBitcoinAmount,
  BlueText,
  BlueSpacing20,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import Privacy from '../../Privacy';
import Share from 'react-native-share';
import { Chain, BitcoinUnit } from '../../models/bitcoinUnits';
import Modal from 'react-native-modal';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const loc = require('../../loc');

export default class ReceiveDetails extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.receive.header,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    let secret = props.navigation.state.params.secret || '';

    this.state = {
      secret: secret,
      addressText: '',
      customLabel: '',
      customAmount: 0,
      bip21encoded: undefined,
      isCustom: false,
      isCustomModalVisible: false,
    };
  }

  async componentDidMount() {
    Privacy.enableBlur();
    console.log('receive/details - componentDidMount');

    {
      let address;
      let wallet;
      for (let w of BlueApp.getWallets()) {
        if (w.getSecret() === this.state.secret) {
          // found our wallet
          wallet = w;
        }
      }
      if (wallet) {
        if (wallet.getAddressAsync) {
          if (wallet.chain === Chain.ONCHAIN) {
            try {
              address = await Promise.race([wallet.getAddressAsync(), BlueApp.sleep(1000)]);
            } catch (_) {}
            if (!address) {
              // either sleep expired or getAddressAsync threw an exception
              console.warn('either sleep expired or getAddressAsync threw an exception');
              address = wallet._getExternalAddressByIndex(wallet.next_free_address_index);
            } else {
              BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
            }
            this.setState({
              address: address,
              addressText: address,
            });
          } else if (wallet.chain === Chain.OFFCHAIN) {
            try {
              await Promise.race([wallet.getAddressAsync(), BlueApp.sleep(1000)]);
              address = wallet.getAddress();
            } catch (_) {}
            if (!address) {
              // either sleep expired or getAddressAsync threw an exception
              console.warn('either sleep expired or getAddressAsync threw an exception');
              address = wallet.getAddress();
            } else {
              BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
            }
          }
          this.setState({
            address: address,
          });
        } else if (wallet.getAddress) {
          this.setState({
            address: wallet.getAddress(),
          });
        }
      }
    }

    InteractionManager.runAfterInteractions(async () => {
      const bip21encoded = bip21.encode(this.state.address);
      this.setState({ bip21encoded });
    });
  }

  componentWillUnmount() {
    Privacy.disableBlur();
  }

  renderCustomAmountModal = () => {
    return (
      <Modal
        isVisible={this.state.isCustomModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          this.setState({ isCustomModalVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <BlueBitcoinAmount amount={this.state.customAmount || ''} onChangeText={text => this.setState({ customAmount: text })} />
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
                onChangeText={text => this.setState({ customLabel: text })}
                placeholder={loc.receive.details.label}
                value={this.state.customLabel || ''}
                numberOfLines={1}
                style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
              />
            </View>
            <BlueSpacing20 />
            <View>
              <BlueButton
                title={loc.receive.details.create}
                onPress={() => {
                  this.setState({
                    isCustom: true,
                    isCustomModalVisible: false,
                    bip21encoded: bip21.encode(this.state.address, { amount: this.state.customAmount, label: this.state.customLabel }),
                  });
                }}
              />
              <BlueSpacing20 />
              <BlueButtonLink
                title="Reset"
                onPress={() => {
                  this.setState({
                    isCustom: false,
                    isCustomModalVisible: false,
                    customAmount: '',
                    customLabel: '',
                    bip21encoded: bip21.encode(this.state.addresss),
                  });
                }}
              />
            </View>
            <BlueSpacing20 />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  showCustomAmountModal = () => {
    this.setState({ isCustomModalVisible: true });
  };

  render() {
    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ justifyContent: 'space-between' }}>
          <View style={{ marginTop: 32, alignItems: 'center', paddingHorizontal: 16 }}>
            {this.state.isCustom && (
              <>
                <BlueText
                  style={{ color: '#0c2550', fontWeight: '600', fontSize: 36, textAlign: 'center', paddingBottom: 24 }}
                  numberOfLines={1}
                >
                  {this.state.customAmount} {BitcoinUnit.BTC}
                </BlueText>
                <BlueText style={{ color: '#0c2550', fontWeight: '600', textAlign: 'center', paddingBottom: 24 }} numberOfLines={1}>
                  {this.state.customLabel}
                </BlueText>
              </>
            )}
            {this.state.bip21encoded === undefined ? (
              <View style={{ alignItems: 'center', width: 300, height: 300 }}>
                <BlueLoading />
              </View>
            ) : (
              <QRCode
                value={this.state.bip21encoded}
                logo={require('../../img/qr-code.png')}
                size={(is.ipad() && 300) || 300}
                logoSize={90}
                color={BlueApp.settings.foregroundColor}
                logoBackgroundColor={BlueApp.settings.brandingColor}
                ecl={'H'}
                getRef={c => (this.qrCodeSVG = c)}
              />
            )}
            <BlueCopyTextToClipboard text={this.state.isCustom ? this.state.bip21encoded : this.state.addressText} />
          </View>
          <View style={{ alignItems: 'center', alignContent: 'flex-end', marginBottom: 24 }}>
            <BlueButtonLink title={loc.receive.details.setAmount} onPress={this.showCustomAmountModal} />
            <View>
              <BlueButton
                icon={{
                  name: 'share-alternative',
                  type: 'entypo',
                  color: BlueApp.settings.buttonTextColor,
                }}
                onPress={async () => {
                  if (this.qrCodeSVG === undefined) {
                    Share.open({ message: this.state.bip21encoded }).catch(error => console.log(error));
                  } else {
                    InteractionManager.runAfterInteractions(async () => {
                      this.qrCodeSVG.toDataURL(data => {
                        let shareImageBase64 = {
                          message: this.state.bip21encoded,
                          url: `data:image/png;base64,${data}`,
                        };
                        Share.open(shareImageBase64).catch(error => console.log(error));
                      });
                    });
                  }
                }}
                title={loc.receive.details.share}
              />
            </View>
          </View>
          {this.renderCustomAmountModal()}
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 350,
    height: 350,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

ReceiveDetails.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        secret: PropTypes.string,
      }),
    }),
  }),
};
