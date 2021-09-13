/* global alert */
import React, { Component } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';

import navigationStyle from '../../components/navigationStyle';
import { BlueButton, BlueLoading, BlueSpacing10, SafeBlueArea } from '../../BlueComponents';
import { HodlHodlApi } from '../../class/hodl-hodl-api';
import * as NavigationService from '../../NavigationService';
import { BlueCurrentTheme } from '../../components/themes';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const prompt = require('../../blue_modules/prompt');

export default class HodlHodlViewOffer extends Component {
  static contextType = BlueStorageContext;
  constructor(props) {
    super(props);

    const offerToDisplay = props.route.params.offerToDisplay;

    const horizontalScrollData = [];
    horizontalScrollData.push({
      id: 'window',
      header: loc.hodl.offer_window,
      body: offerToDisplay.payment_window_minutes + ' ' + loc.hodl.offer_minutes,
    });
    horizontalScrollData.push({
      id: 'minmax',
      header: loc.hodl.offer_minmax,
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

    horizontalScrollData.push({ id: 'confirmations', header: loc.hodl.offer_confirmations, body: offerToDisplay.confirmations });

    this.state = {
      hodlApi: false,
      isLoading: true,
      horizontalScrollData,
      offerToDisplay,
    };
  }

  async componentDidMount() {
    console.log('wallets/hodlHodlViewOffer - componentDidMount');

    const hodlApiKey = await this.context.getHodlHodlApiKey();
    const hodlApi = new HodlHodlApi(hodlApiKey);
    this.setState({ hodlApi, hodlApiKey });

    this.setState({
      isLoading: false,
    });
  }

  doLogin = () => {
    const handleLoginCallback = (hodlApiKey, hodlHodlSignatureKey) => {
      this.context.setHodlHodlApiKey(hodlApiKey, hodlHodlSignatureKey);
      const HodlApi = new HodlHodlApi(hodlApiKey);
      this.setState({ HodlApi, hodlApiKey });
    };
    NavigationService.navigate('HodlHodl', { params: { cb: handleLoginCallback }, screen: 'HodlHodlLogin' });
  };

  async _onAcceptOfferPress(offer) {
    if (!this.state.hodlApiKey) {
      alert('Please login to HodlHodl to accept offers');
      this.doLogin();
      return;
    }
    const myself = await this.state.hodlApi.getMyself();
    if (!myself.encrypted_seed || myself.encrypted_seed.length < 10) {
      const buttons = [
        {
          text: loc._.yes,
          onPress: async a => {
            const sigKey = await this.context.getHodlHodlSignatureKey();
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
          text: loc._.cancel,
          onPress: async a => {},
        },
      ];
      Alert.alert('HodlHodl', loc.hodl.offer_account_finish, buttons, {
        cancelable: true,
      });
      return;
    }

    // lets refetch offer to avoid errors 'version mismatch'
    const newOffer = await this.state.hodlApi.getOffer(offer.id);
    if (newOffer.id && newOffer.version && offer.version !== newOffer.version) {
      offer = newOffer;
      this.setState({ offerToDisplay: newOffer });
    }

    let fiatValue;
    try {
      fiatValue = await prompt(
        loc.formatString(loc.hodl.offer_promt_fiat, { currency: offer.currency_code }),
        loc.hodl.offer_promt_fiat_e,
        true,
        'numeric',
      );
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
            await this.context.addHodlHodlContract(contract.id);
            NavigationService.navigate('HodlHodlMyContracts');
          }
        },
      });
    }
    Alert.alert(loc.hodl.offer_choosemethod, ``, buttons, { cancelable: true });
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
          <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
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
                      ? loc.formatString(loc.hodl.item_rating, {
                          rating:
                            Math.round(this.state.offerToDisplay.trader.rating * 100) +
                            '% / ' +
                            this.state.offerToDisplay.trader.trades_count,
                        })
                      : loc.hodl.item_rating_no}
                  </Text>
                </View>
              </View>
              {/* end */}

              {this.state.offerToDisplay.side === 'sell' ? (
                <View style={styles.acceptOfferButtonWrapperWrapper}>
                  <View style={styles.acceptOfferButtonWrapper}>
                    <BlueSpacing10 />
                    <BlueButton
                      title={loc.hodl.offer_accept}
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
    backgroundColor: BlueCurrentTheme.colors.background,
    padding: 22,
  },
  Title: {
    fontWeight: '600',
    fontSize: 24,
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  circleWhite: {
    position: 'absolute',
    bottom: 0,
    right: 3,
    backgroundColor: BlueCurrentTheme.colors.background,
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
    backgroundColor: BlueCurrentTheme.colors.lightButton,
    borderRadius: 20,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginRight: 10,
    paddingRight: 20,
  },
  greenTextContainerContainer: {
    backgroundColor: BlueCurrentTheme.colors.feeLabel,
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
    color: BlueCurrentTheme.colors.feeValue,
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
    color: BlueCurrentTheme.colors.foregroundColor,
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
  horizontalScrollIemHeader: { color: BlueCurrentTheme.colors.feeText },
  horizontalScrollItemBody: { fontSize: 14, fontWeight: 'bold', color: BlueCurrentTheme.colors.foregroundColor },
  horizontalScrollWrapper: { flexDirection: 'column', paddingTop: 20, paddingBottom: 20, paddingRight: 40 },
  flexDirRow: { flexDirection: 'row' },
  iconWithPadding: { paddingLeft: 16 },
  _hr: {
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: BlueCurrentTheme.colors.lightBorder,
  },
  avatarImg: { width: 60, height: 60, borderRadius: 60 },
  avatarWrapper: {
    backgroundColor: BlueCurrentTheme.colors.background,
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 32,
  },
  verifiedIcon: { marginTop: 3, marginRight: 5 },
  traderWrapper: { alignItems: 'center', marginTop: 8 },
  acceptOfferButtonWrapper: { width: '70%', alignItems: 'center' },
  acceptOfferButtonWrapperWrapper: { marginTop: 24, alignItems: 'center' },
});

HodlHodlViewOffer.navigationOptions = navigationStyle(
  {
    title: '',
  },
  (options, { theme }) => ({
    ...options,
    headerStyle: {
      ...options.headerStyle,
    },
  }),
);
