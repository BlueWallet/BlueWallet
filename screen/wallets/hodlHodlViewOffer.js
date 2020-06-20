/* global alert */
import React, { Component } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueButton, BlueLoading, BlueNavigationStyle, BlueSpacing10, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { HodlHodlApi } from '../../class/hodl-hodl-api';
import { Icon } from 'react-native-elements';
import { AppStorage } from '../../class';
import * as NavigationService from '../../NavigationService';

const BlueApp: AppStorage = require('../../BlueApp');
const prompt = require('../../prompt');

export default class HodlHodlViewOffer extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(),
    title: '',
  });

  constructor(props) {
    super(props);

    const offerToDisplay = props.route.params.offerToDisplay;

    const horizontalScrollData = [];
    horizontalScrollData.push({ id: 'window', body: offerToDisplay.payment_window_minutes + ' min' });
    horizontalScrollData.push({
      id: 'min / max',
      body:
        offerToDisplay.min_amount.replace('.00', '') +
        ' - ' +
        offerToDisplay.max_amount.replace('.00', '') +
        ' ' +
        offerToDisplay.currency_code,
    });
    offerToDisplay.first_trade_limit &&
      horizontalScrollData.push({
        id: '1st trade',
        body: offerToDisplay.first_trade_limit.replace('.00', '') + ' ' + offerToDisplay.currency_code,
      });

    for (const paymentInstruction of offerToDisplay.payment_method_instructions || []) {
      horizontalScrollData.push({
        id: paymentInstruction.id + paymentInstruction.version,
        header: paymentInstruction.payment_method_type,
        body: paymentInstruction.payment_method_name,
      });
    }

    horizontalScrollData.push({ id: 'confirmations', body: offerToDisplay.confirmations });

    this.state = {
      hodlApi: false,
      isLoading: true,
      horizontalScrollData,
      offerToDisplay,
    };
  }

  async componentDidMount() {
    console.log('wallets/hodlHodlViewOffer - componentDidMount');

    const hodlApiKey = await BlueApp.getHodlHodlApiKey();
    const hodlApi = new HodlHodlApi(hodlApiKey);
    this.setState({ hodlApi, hodlApiKey });

    this.setState({
      isLoading: false,
    });
  }

  async _onAcceptOfferPress(offer) {
    if (!this.state.hodlApiKey) {
      alert('Please login to HodlHodl to accept offers');
      return;
    }
    const myself = await this.state.hodlApi.getMyself();
    if (!myself.encrypted_seed || myself.encrypted_seed.length < 10) {
      const buttons = [
        {
          text: 'Yes',
          onPress: async a => {
            const sigKey = await BlueApp.getHodlHodlSignatureKey();
            if (!sigKey) {
              alert('Error: signature key not set'); // should never happen
              return;
            }

            const autologinKey = await this.state.hodlApi.requestAutologinToken(sigKey);
            const uri = 'https://hodlhodl.com/dashboards/settings?sign_in_token=' + autologinKey;
            NavigationService.navigate('HodlHodlWebview', { uri });
          },
        },
        {
          text: 'Cancel',
          onPress: async a => {},
        },
      ];
      Alert.alert('HodlHodl', `Looks like you didn't finish setting up account on HodlHodl, would you like to finish setup now?`, buttons, {
        cancelable: true,
      });
      return;
    }

    let fiatValue;
    try {
      fiatValue = await prompt('How much ' + offer.currency_code + ' do you want to buy?', 'For example 100', true, 'numeric');
    } catch (_) {
      return;
    }
    if (!fiatValue) return;

    const buttons = [];
    for (const paym of offer.payment_method_instructions) {
      buttons.push({
        text: paym.payment_method_name + ' (' + paym.payment_method_type + ')',
        onPress: async a => {
          let noError = true;
          this.setState({ isLoading: true });
          let contract;
          try {
            contract = await this.state.hodlApi.acceptOffer(offer.id, offer.version, paym.id, paym.version, fiatValue);
          } catch (Error) {
            noError = false;
            alert(Error);
          }
          this.setState({ isLoading: false });

          if (noError && contract.id) {
            await BlueApp.addHodlHodlContract(contract.id);
            NavigationService.navigate('HodlHodlMyContracts');
          }
        },
      });
    }
    Alert.alert('Choose payment method', ``, buttons, { cancelable: true });
  }

  _renderHorizontalScrollItem(item) {
    return (
      <View style={styles.horizontalScrollWrapper}>
        <Text style={styles.horizontalScrollIemHeader}>{item.item.header || item.item.id}</Text>
        <Text style={styles.horizontalScrollItemBody}>{item.item.body}</Text>
      </View>
    );
  }

  render() {
    return this.state.isLoading ? (
      <BlueLoading />
    ) : (
      <SafeBlueArea>
        <ScrollView>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
            <View style={styles.modalContent}>
              <Text style={styles.Title}>{this.state.offerToDisplay.title}</Text>

              {/* horizontal panel with bubbles */}
              <View style={styles.flexDirRow}>
                <View style={styles.grayTextContainerContainer}>
                  <View style={styles.grayTextContainer}>
                    <Icon name="place" type="material" size={16} color="#9BA0A9" containerStyle={styles.iconWithPadding} />
                    <Text style={styles.locationText}>{this.state.offerToDisplay.country}</Text>
                  </View>
                </View>

                <View style={styles.greenTextContainerContainer}>
                  <Text style={styles.priceText}>
                    {this.state.offerToDisplay.price} {this.state.offerToDisplay.currency_code}
                  </Text>
                </View>
              </View>
              {/* end */}

              <Text style={styles.descriptionText}>{this.state.offerToDisplay.description}</Text>

              <View style={styles._hr} />

              <FlatList horizontal data={this.state.horizontalScrollData} renderItem={this._renderHorizontalScrollItem} />

              <View style={styles._hr} />

              {/* avatar and rating */}
              <View style={styles.avatarWrapper}>
                <View>
                  <Image
                    style={styles.avatarImg}
                    source={
                      this.state.offerToDisplay.trader.avatar_url.endsWith('.svg')
                        ? require('../../img/hodlhodl-default-avatar.png')
                        : {
                            uri: this.state.offerToDisplay.trader.avatar_url,
                          }
                    }
                  />
                  {this.state.offerToDisplay.trader.online_status === 'online' && (
                    <View style={styles.circleWhite}>
                      <View style={styles.circleGreen} />
                    </View>
                  )}
                </View>
                <View style={styles.traderWrapper}>
                  <View style={styles.flexDirRow}>
                    {this.state.offerToDisplay.trader.strong_hodler && (
                      <Icon name="verified-user" type="material" size={14} color="#0071fc" containerStyle={styles.verifiedIcon} />
                    )}
                    <Text style={styles.nicknameText}>{this.state.offerToDisplay.trader.login}</Text>
                  </View>
                  <Text style={styles.traderRatingText}>
                    {this.state.offerToDisplay.trader.trades_count > 0
                      ? Math.round(this.state.offerToDisplay.trader.rating * 100) +
                        '%' +
                        ' / ' +
                        this.state.offerToDisplay.trader.trades_count +
                        ' trades'
                      : 'No rating'}
                  </Text>
                </View>
              </View>
              {/* end */}

              {this.state.offerToDisplay.side === 'sell' ? (
                <View style={styles.acceptOfferButtonWrapperWrapper}>
                  <View style={styles.acceptOfferButtonWrapper}>
                    <BlueSpacing10 />
                    <BlueButton
                      title="Accept offer"
                      onPress={async () => {
                        await this._onAcceptOfferPress(this.state.offerToDisplay);
                      }}
                    />
                  </View>
                </View>
              ) : (
                <View />
              )}
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

HodlHodlViewOffer.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      offerToDisplay: PropTypes.object,
    }),
  }),
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 22,
  },
  Title: {
    fontWeight: '600',
    fontSize: 24,
    color: '#0c2550',
  },
  circleWhite: {
    position: 'absolute',
    bottom: 0,
    right: 3,
    backgroundColor: 'white',
    width: 13,
    height: 13,
    borderRadius: 6,
  },
  circleGreen: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: '#00d327',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  grayTextContainerContainer: {
    backgroundColor: '#EEF0F4',
    borderRadius: 20,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginRight: 10,
    paddingRight: 20,
  },
  greenTextContainerContainer: {
    backgroundColor: '#d2f8d5',
    borderRadius: 20,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    paddingLeft: 15,
    paddingRight: 15,
  },
  grayTextContainer: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  priceText: {
    top: 0,
    color: '#37bfa0',
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionText: {
    top: 0,
    color: '#818893',
    fontSize: 14,
    paddingTop: 20,
    paddingBottom: 20,
    fontWeight: '500',
    minHeight: 150,
    lineHeight: 23,
  },
  nicknameText: {
    color: '#0c2550',
    fontSize: 16,
    fontWeight: 'bold',
  },
  traderRatingText: {
    color: '#9AA0AA',
    fontSize: 12,
  },
  locationText: {
    color: '#9BA0A9',
  },
  horizontalScrollIemHeader: { fontSize: 12, color: '#9AA0AA' },
  horizontalScrollItemBody: { fontSize: 14, fontWeight: 'bold', color: '#0c2550' },
  horizontalScrollWrapper: { flexDirection: 'column', paddingTop: 20, paddingBottom: 20, paddingRight: 40 },
  flexDirRow: { flexDirection: 'row' },
  iconWithPadding: { paddingLeft: 16 },
  _hr: {
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: '#ebebeb',
  },
  avatarImg: { width: 60, height: 60, borderRadius: 60 },
  avatarWrapper: { backgroundColor: 'white', flex: 1, flexDirection: 'column', alignItems: 'center', marginTop: 32 },
  verifiedIcon: { marginTop: 3, marginRight: 5 },
  traderWrapper: { alignItems: 'center', marginTop: 8 },
  acceptOfferButtonWrapper: { width: '70%', alignItems: 'center' },
  acceptOfferButtonWrapperWrapper: { marginTop: 24, alignItems: 'center' },
});
