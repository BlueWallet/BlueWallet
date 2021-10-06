import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';

import { BlueButtonLink, SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { HodlHodlApi } from '../../class/hodl-hodl-api';
import * as NavigationService from '../../NavigationService';
import { BlueCurrentTheme } from '../../components/themes';
import BottomModal from '../../components/BottomModal';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';
const A = require('../../blue_modules/analytics');

const CURRENCY_CODE_ANY = '_any';
const METHOD_ANY = '_any';

const HodlHodlListSections = { OFFERS: 'OFFERS' };
const windowHeight = Dimensions.get('window').height;

export default class HodlHodl extends Component {
  static contextType = BlueStorageContext;
  constructor(props) {
    super(props);

    this.state = {
      HodlApi: false,
      isLoading: true,
      isRenderOfferVisible: false,
      isChooseSideModalVisible: false,
      isChooseCountryModalVisible: false,
      isFiltersModalVisible: false,
      isChooseCurrencyVisible: false,
      isChooseMethodVisible: false,
      showShowFlatListRefreshControl: false,
      currency: false, // means no currency filtering is enabled by default
      method: false, // means no payment method filtering is enabled by default
      side: HodlHodlApi.FILTERS_SIDE_VALUE_SELL, // means 'show me sell offers as Im buying'
      offers: [],
      countries: [], // list of hodlhodl supported countries. filled later via api
      currencies: [], // list of hodlhodl supported currencies. filled later via api
      methods: [], // list of hodlhodl payment methods. filled later via api
      country: HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL, // country currently selected by user to display orders on screen. this is country code
    };
  }

  handleLoginPress = () => {
    const handleLoginCallback = (hodlApiKey, hodlHodlSignatureKey) => {
      this.context.setHodlHodlApiKey(hodlApiKey, hodlHodlSignatureKey);
      const displayLoginButton = !hodlApiKey;
      const HodlApi = new HodlHodlApi(hodlApiKey);
      this.setState({ HodlApi, hodlApiKey });
      this.props.navigation.setParams({ displayLoginButton });
    };
    NavigationService.navigate('HodlHodlLoginRoot', { params: { cb: handleLoginCallback }, screen: 'HodlHodlLogin' });
  };

  handleMyContractsPress = () => {
    NavigationService.navigate('HodlHodlMyContracts');
  };

  /**
   * Fetch offers and set those offers into state
   *
   * @returns {Promise<void>}
   */
  async fetchOffers() {
    const pagination = {
      [HodlHodlApi.PAGINATION_LIMIT]: 200,
    };
    const filters = {
      [HodlHodlApi.FILTERS_SIDE]: this.state.side,
      [HodlHodlApi.FILTERS_ASSET_CODE]: HodlHodlApi.FILTERS_ASSET_CODE_VALUE_BTC,
      [HodlHodlApi.FILTERS_INCLUDE_GLOBAL]: this.state.country === HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL,
      [HodlHodlApi.FILTERS_ONLY_WORKING_NOW]: true, // so there wont be any offers which user tries to open website says 'offer not found'
    };

    if (this.state.country !== HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL) {
      filters[HodlHodlApi.FILTERS_COUNTRY] = this.state.country;
    }

    if (this.state.currency) {
      filters[HodlHodlApi.FILTERS_CURRENCY_CODE] = this.state.currency;
    }

    if (this.state.method) {
      filters[HodlHodlApi.FILTERS_PAYMENT_METHOD_ID] = this.state.method;
    }

    const sort = {
      [HodlHodlApi.SORT_BY]: HodlHodlApi.SORT_BY_VALUE_PRICE,
      [HodlHodlApi.SORT_DIRECTION]:
        this.state.side === HodlHodlApi.FILTERS_SIDE_VALUE_SELL
          ? HodlHodlApi.SORT_DIRECTION_VALUE_ASC
          : HodlHodlApi.SORT_DIRECTION_VALUE_DESC,
    };
    const offers = await this.state.HodlApi.getOffers(pagination, filters, sort);

    this.setState({
      offers,
    });
  }

  /**
   * fetches all countries from API and sets them to state
   *
   * @returns {Promise<void>}
   **/
  async fetchListOfCountries() {
    const countries = await this.state.HodlApi.getCountries();
    this.setState({ countries });
  }

  /**
   * fetches all currencies from API and sets them to state
   *
   * @returns {Promise<void>}
   **/
  async fetchListOfCurrencies() {
    const currencies = await this.state.HodlApi.getCurrencies();
    this.setState({ currencies });
  }

  /**
   * fetches all payment methods from API and sets them to state
   *
   * @returns {Promise<void>}
   **/
  async fetchListOfMethods() {
    const methods = await this.state.HodlApi.getPaymentMethods(this.state.country || HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL);
    this.setState({ methods });
  }

  onFocus = async e => {
    if (!e.data.closing) return;
    const hodlApiKey = await this.context.getHodlHodlApiKey();
    const displayLoginButton = !hodlApiKey;

    if (hodlApiKey && !this.state.hodlApiKey) {
      // only if we had no key, and now we do, we update state
      // (means user logged in)
      this.setState({ hodlApiKey });
      this.props.navigation.setParams({ displayLoginButton });
    }
  };

  componentWillUnmount() {
    this._unsubscribeFocus();
  }

  async componentDidMount() {
    console.log('wallets/hodlHodl - componentDidMount');
    this._unsubscribeFocus = this.props.navigation.addListener('transitionEnd', this.onFocus);
    A(A.ENUM.NAVIGATED_TO_WALLETS_HODLHODL);

    const hodlApiKey = await this.context.getHodlHodlApiKey();
    const displayLoginButton = !hodlApiKey;

    const HodlApi = new HodlHodlApi(hodlApiKey);
    this.setState({ HodlApi, hodlApiKey });
    this.props.navigation.setParams({
      handleLoginPress: this.handleLoginPress,
      displayLoginButton: displayLoginButton,
      handleMyContractsPress: this.handleMyContractsPress,
    });

    try {
      await this.fetchOffers();
    } catch (Error) {
      alert(Error.message);
      return;
    }

    this.setState({
      isLoading: false,
    });

    this.fetchListOfCountries();
    this.fetchListOfCurrencies();
    this.fetchListOfMethods();
  }

  _onPress = item => {
    const offers = this.state.offers.filter(value => value.id === item.id);
    if (offers && offers[0]) {
      this.props.navigation.navigate('HodlHodlViewOffer', { offerToDisplay: offers[0] });
    } else {
      Linking.openURL('https://hodlhodl.com/offers/' + item.id);
    }
  };

  _onCountryPress(item) {
    this.setState(
      {
        country: item.code,
        method: false, // invalidate currently selected payment method, as it is probably not valid for the new country
        currency: false, // invalidate currently selected currency, as it is probably not valid for the new country
        isChooseCountryModalVisible: false,
        isLoading: true,
      },
      async () => {
        await this.fetchOffers();
        this.setState({
          isLoading: false,
        });
        this.fetchListOfMethods(); // once selected country changed we fetch payment methods for this country
      },
    );
  }

  _onCurrencyPress(item) {
    this.setState(
      {
        currency: item.code === CURRENCY_CODE_ANY ? false : item.code,
        isLoading: true,
        isChooseCurrencyVisible: false,
      },
      async () => {
        await this.fetchOffers();
        this.setState({
          isLoading: false,
        });
      },
    );
  }

  _onMethodPress(item) {
    this.setState(
      {
        method: item.id === METHOD_ANY ? false : item.id,
        isLoading: true,
        isChooseMethodVisible: false,
      },
      async () => {
        await this.fetchOffers();
        this.setState({
          isLoading: false,
        });
      },
    );
  }

  _onSidePress(item) {
    this.setState(
      {
        isChooseSideModalVisible: false,
        isLoading: true,
        side: item.code,
      },
      async () => {
        await this.fetchOffers();
        this.setState({
          isLoading: false,
        });
      },
    );
  }

  getItemText(item) {
    let { title, description } = item;
    title = title || '';
    let ret = title;
    if (description) {
      if (description.startsWith(title)) title = '';
      ret = title + '\n' + description.split('\n').slice(0, 2).join('\n');
    }
    if (ret.length >= 200) ret = ret.substr(0, 200) + '...';
    return ret;
  }

  getMethodName(id) {
    for (const m of this.state.methods) {
      if (m.id === id) return m.name;
    }
    return '';
  }

  getItemPrice(item) {
    let price = item.price.toString();
    if (price.length > 8) price = Math.round(item.price).toString();

    switch (item.currency_code) {
      case 'USD':
        return '$ ' + price;
      case 'GBP':
        return '£ ' + price;
      case 'RUB':
        return '₽ ' + price;
      case 'EUR':
        return '€ ' + price;
      case 'UAH':
        return '₴ ' + price;
      default:
        return price + (price.length >= 9 ? '' : ' ' + item.currency_code); // too lengthy prices dont render currency code
    }
  }

  getNativeCountryName() {
    for (const c of this.state.countries) {
      if (c.code === this.state.country) return c.native_name;
    }
    return loc.hodl.filter_country_global;
  }

  hideChooseSideModal = () => {
    Keyboard.dismiss();
    this.setState({ isChooseSideModalVisible: false });
  };

  renderChooseSideModal = () => {
    return (
      <BottomModal isVisible={this.state.isChooseSideModalVisible} onClose={this.hideChooseSideModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContentShort}>
            <FlatList
              scrollEnabled={false}
              style={styles.modalFlatList}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              data={[
                { code: HodlHodlApi.FILTERS_SIDE_VALUE_SELL, name: loc.hodl.filter_iambuying },
                { code: HodlHodlApi.FILTERS_SIDE_VALUE_BUY, name: loc.hodl.filter_iamselling },
              ]}
              keyExtractor={(item, index) => item.code}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                  onPress={() => this._onSidePress(item)}
                >
                  <View style={styles.itemNameWrapper}>
                    <Text style={this.state.side === item.code ? styles.itemNameBold : styles.itemNameNormal}>{item.name}</Text>
                  </View>
                </TouchableHighlight>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  hideFiltersModal = () => {
    Keyboard.dismiss();
    this.setState({ isFiltersModalVisible: false });
  };

  renderFiltersModal = () => {
    return (
      <BottomModal
        isVisible={this.state.isFiltersModalVisible}
        onClose={this.hideFiltersModal}
        onModalHide={() => {
          if (this.state.openNextModal) {
            const openNextModal = this.state.openNextModal;
            this.setState({
              openNextModal: false,
              [openNextModal]: true,
            });
          }
        }}
      >
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContentShort}>
            <FlatList
              scrollEnabled={false}
              style={styles.modalFlatList}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              data={[
                { code: 'currency', native_name: loc.hodl.filter_currency },
                { code: 'method', native_name: loc.hodl.filter_method },
              ]}
              keyExtractor={(item, index) => item.code}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                  onPress={() => {
                    if (item.code === 'currency') this.setState({ isFiltersModalVisible: false, openNextModal: 'isChooseCurrencyVisible' });
                    if (item.code === 'method') this.setState({ isFiltersModalVisible: false, openNextModal: 'isChooseMethodVisible' });
                  }}
                >
                  <View style={styles.whiteBackground}>
                    <View style={styles.itemNameWrapper}>
                      <View style={styles.currencyWrapper}>
                        <Text style={styles.currencyNativeName}>{item.native_name}</Text>
                        <View style={styles.filteCurrencyTextWrapper}>
                          {item.code === 'currency' && (
                            <Text style={styles.filterCurrencyText}>
                              {' '}
                              {this.state.currency ? this.state.currency : loc.hodl.filter_detail}
                              {'   ❯'}
                            </Text>
                          )}
                          {item.code === 'method' && (
                            <Text style={styles.methodNameText}>
                              {' '}
                              {this.state.method ? this.getMethodName(this.state.method) : loc.hodl.filter_detail}
                              {'   ❯'}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableHighlight>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  hideChooseCountryModal = () => {
    Keyboard.dismiss();
    this.setState({ isChooseCountryModalVisible: false });
  };

  renderChooseContryModal = () => {
    const countries2render = [];

    // first, we include in the list current country
    for (const country of this.state.countries) {
      if (country.code === this.state.country) {
        countries2render.push(country);
      }
    }

    // next, we include option for user to set GLOBAL for offers
    countries2render.push({
      code: HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL,
      name: 'Global offers',
      native_name: loc.hodl.filter_country_global,
    });

    // lastly, we include other countries
    for (const country of this.state.countries) {
      if (country.code !== this.state.country) {
        // except currently selected one
        if (this.state.countrySearchInput) {
          // if user typed something in search box we apply that filter
          if (
            country.name.toLocaleLowerCase().includes(this.state.countrySearchInput.toLocaleLowerCase()) ||
            country.native_name.toLocaleLowerCase().includes(this.state.countrySearchInput.toLocaleLowerCase())
          ) {
            countries2render.push(country);
          }
        } else {
          // otherwise just put the country in the list
          countries2render.push(country);
        }
      }
    }

    return (
      <BottomModal isVisible={this.state.isChooseCountryModalVisible} onClose={this.hideChooseCountryModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <View style={styles.searchInputContainer}>
              <TextInput
                onChangeText={text => this.setState({ countrySearchInput: text })}
                placeholder={loc.hodl.filter_search + '..'}
                placeholderTextColor="#9AA0AA"
                value={this.state.countrySearchInput || ''}
                numberOfLines={1}
                style={styles.searchTextInput}
              />
              <Icon name="search" type="material" size={20} color="gray" containerStyle={styles.iconWithOffset} />
            </View>
            <FlatList
              style={styles.modalFlatList}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              data={countries2render}
              keyExtractor={(item, index) => item.code}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onPress={() => this._onCountryPress(item)}
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                >
                  <View style={styles.whiteBackground}>
                    <View style={styles.itemNameWrapper}>
                      <View style={styles.paddingLeft10}>
                        <Text style={item.code === this.state.country ? styles.countryNativeNameBold : styles.countryNativeNameNormal}>
                          {item.native_name}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableHighlight>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  hideChooseCurrencyModal = () => {
    Keyboard.dismiss();
    this.setState({ isChooseCurrencyVisible: false });
  };

  renderChooseCurrencyModal = () => {
    const currencies2render = [];

    // first, option to choose any currency
    currencies2render.push({
      code: CURRENCY_CODE_ANY,
      name: loc.hodl.filter_any,
    });

    // lastly, we include other countries
    for (const curr of this.state.currencies) {
      if (this.state.currencySearchInput) {
        // if user typed something in search box we apply that filter
        if (
          curr.name.toLocaleLowerCase().includes(this.state.currencySearchInput.toLocaleLowerCase()) ||
          curr.code.toLocaleLowerCase().includes(this.state.currencySearchInput.toLocaleLowerCase())
        ) {
          currencies2render.push(curr);
        }
      } else {
        // otherwise just put the country in the list
        currencies2render.push(curr);
      }
    }

    return (
      <BottomModal isVisible={this.state.isChooseCurrencyVisible} onClose={this.hideChooseCurrencyModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <View style={styles.searchInputContainer}>
              <TextInput
                onChangeText={text => this.setState({ currencySearchInput: text })}
                placeholder={loc.hodl.filter_search + '..'}
                placeholderTextColor="#9AA0AA"
                value={this.state.currencySearchInput || ''}
                numberOfLines={1}
                style={styles.curSearchInput}
              />
              <Icon name="search" type="material" size={20} color="gray" containerStyle={styles.iconWithOffset} />
            </View>
            <FlatList
              style={styles.modalFlatList}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              data={currencies2render}
              keyExtractor={(item, index) => item.code}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onPress={() => this._onCurrencyPress(item)}
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                >
                  <View style={styles.whiteBackground}>
                    <View style={styles.itemNameWrapper}>
                      <View style={styles.paddingLeft10}>
                        <Text style={styles.currencyText}>
                          {item.name} {item.code !== CURRENCY_CODE_ANY && '[' + item.code + ']'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableHighlight>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  hideChooseMethodModal = () => {
    Keyboard.dismiss();
    this.setState({ isChooseMethodVisible: false });
  };

  renderChooseMethodModal = () => {
    const methods2render = [];

    // first, option to choose any currency
    methods2render.push({
      id: METHOD_ANY,
      name: loc.hodl.filter_any,
    });

    // lastly, we include other countries
    for (const curr of this.state.methods) {
      if (this.state.methodSearchInput) {
        // if user typed something in search box we apply that filter
        if (
          curr.name.toLocaleLowerCase().includes(this.state.methodSearchInput.toLocaleLowerCase()) ||
          curr.type.toLocaleLowerCase().includes(this.state.methodSearchInput.toLocaleLowerCase())
        ) {
          methods2render.push(curr);
        }
      } else {
        // otherwise just put the country in the list
        methods2render.push(curr);
      }
    }

    return (
      <BottomModal isVisible={this.state.isChooseMethodVisible} deviceHeight={windowHeight} onClose={this.hideChooseMethodModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <View style={styles.searchInputContainer}>
              <TextInput
                onChangeText={text => this.setState({ methodSearchInput: text })}
                placeholder={loc.hodl.filter_search + '..'}
                placeholderTextColor="#9AA0AA"
                value={this.state.methodSearchInput || ''}
                numberOfLines={1}
                style={styles.mthdSearchInput}
              />
              <Icon name="search" type="material" size={20} color="gray" containerStyle={styles.iconWithOffset} />
            </View>
            <FlatList
              style={styles.modalFlatList}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              data={methods2render}
              keyExtractor={(item, index) => item.id}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onPress={() => this._onMethodPress(item)}
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                >
                  <View style={styles.whiteBackground}>
                    <View style={styles.itemNameWrapper}>
                      <View style={styles.paddingLeft10}>
                        <Text
                          style={
                            item.id === this.state.method || (item.id === METHOD_ANY && this.state.method === false)
                              ? styles.currencyTextBold
                              : styles.currencyTextNormal
                          }
                        >
                          {item.name} {item.id !== METHOD_ANY && '[' + item.type + ']'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableHighlight>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  _onRefreshOffers = async () => {
    this.setState({
      showShowFlatListRefreshControl: true,
    });

    try {
      await this.fetchOffers();
    } catch (_) {}

    this.setState({
      showShowFlatListRefreshControl: false,
    });
  };

  renderHeader = () => {
    return (
      <View style={styles.whiteBackground}>
        <View style={styles.headerWrapper}>
          <Text style={styles.BottomLine}>Powered by HodlHodl®</Text>
          <View style={styles.flexRow}>
            <Text style={styles.Title}>{loc.hodl.local_trader} </Text>
            <TouchableOpacity
              style={styles.grayDropdownTextContainer}
              onPress={() => {
                this.setState({ isChooseSideModalVisible: true });
              }}
            >
              <Text style={styles.grayDropdownText}>
                {this.state.side === HodlHodlApi.FILTERS_SIDE_VALUE_SELL ? loc.hodl.filter_buying : loc.hodl.filter_selling}
              </Text>
              <Icon name="expand-more" type="material" size={22} color="#9AA0AA" containerStyle={styles.noPaddingLeftOrRight} />
            </TouchableOpacity>
          </View>

          <View style={styles.grayTextContainerContainer}>
            <View style={styles.grayTextContainer}>
              <Icon
                name="place"
                type="material"
                size={20}
                color={BlueCurrentTheme.colors.foregroundColor}
                containerStyle={styles.paddingLeft10}
              />
              {this.state.isLoading ? (
                <ActivityIndicator />
              ) : (
                <TouchableOpacity accessibilityRole="button" onPress={() => this.setState({ isChooseCountryModalVisible: true })}>
                  <Text style={styles.locationText}>{this.getNativeCountryName()}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.blueTextContainer}
                onPress={() => {
                  this.setState({ isFiltersModalVisible: true });
                }}
              >
                <Text style={styles.blueText}>{loc.hodl.filter_filters}</Text>

                <Icon
                  name="filter-list"
                  type="material"
                  size={24}
                  color={BlueCurrentTheme.colors.foregroundColor}
                  containerStyle={styles.paddingLeft10}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  renderItem = ({ item, index, separators }) => {
    return (
      <View style={styles.marginHorizontal20}>
        <TouchableHighlight
          onPress={() => this._onPress(item)}
          onShowUnderlay={separators.highlight}
          onHideUnderlay={separators.unhighlight}
        >
          <View style={styles.avatarWrapperWrapper}>
            <View style={styles.avatarWrapper}>
              <View>
                <Image
                  style={styles.avatarImage}
                  source={
                    item.trader.avatar_url.endsWith('.svg')
                      ? require('../../img/hodlhodl-default-avatar.png')
                      : {
                          uri: item.trader.avatar_url,
                        }
                  }
                />
                {item.trader.online_status === 'online' && (
                  <View style={styles.circleWhite}>
                    <View style={styles.circleGreen} />
                  </View>
                )}
              </View>
              <View style={styles.paddingLeft10}>
                <View style={styles.flexRow}>
                  {item.trader.strong_hodler && (
                    <Icon name="verified-user" type="material" size={14} color="#0071fc" containerStyle={styles.verifiedIcon} />
                  )}
                  <Text style={styles.nicknameText}>{item.trader.login}</Text>
                </View>
                <Text style={styles.traderRatingText2}>
                  {item.trader.trades_count > 0
                    ? loc.formatString(loc.hodl.item_rating, {
                        rating: Math.round(item.trader.rating * 100) + '% / ' + item.trader.trades_count,
                      })
                    : loc.hodl.item_rating_no}
                </Text>
              </View>
            </View>

            <Text style={styles.itemText}>{this.getItemText(item)}</Text>

            <View style={styles.itemPriceWrapperWrapper}>
              <View style={styles.itemPriceWrapper}>
                <Text style={styles.itemPrice}>{this.getItemPrice(item)}</Text>
              </View>

              <Text style={styles.minmax}>
                {loc.hodl.item_minmax}: {item.min_amount.replace('.00', '')} - {item.max_amount.replace('.00', '')} {item.currency_code}
              </Text>
            </View>
          </View>
        </TouchableHighlight>
      </View>
    );
  };

  sectionListKeyExtractor = (item, index) => {
    return `${item}${index}}`;
  };

  renderSectionFooter = () => {
    return this.state.offers.length <= 0 ? (
      <View style={styles.noOffersWrapper}>
        <Text style={styles.noOffersText}>{loc.hodl.item_nooffers}</Text>
      </View>
    ) : undefined;
  };

  render() {
    return (
      <SafeBlueArea>
        <StatusBar barStyle="default" />
        <SectionList
          onRefresh={this._onRefreshOffers}
          refreshing={this.state.showShowFlatListRefreshControl}
          renderItem={this.renderItem}
          keyExtractor={this.sectionListKeyExtractor}
          renderSectionHeader={this.renderHeader}
          contentInset={{ top: 0, left: 0, bottom: 60, right: 0 }}
          sections={[{ key: HodlHodlListSections.OFFERS, data: this.state.offers }]}
          style={styles.offersSectionList}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          renderSectionFooter={this.renderSectionFooter}
        />
        {this.renderChooseSideModal()}
        {this.renderChooseContryModal()}
        {this.renderFiltersModal()}
        {this.renderChooseCurrencyModal()}
        {this.renderChooseMethodModal()}
      </SafeBlueArea>
    );
  }
}

HodlHodl.propTypes = {
  navigation: PropTypes.shape({
    addListener: PropTypes.func,
    navigate: PropTypes.func,
    setParams: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

HodlHodl.navigationOptions = navigationStyle(
  {
    title: '',
  },
  (options, { theme, navigation, route }) => ({
    ...options,
    headerStyle: {
      ...options.headerStyle,
      backgroundColor: theme.colors.customHeader,
    },
    headerRight: () => {
      return route.params.displayLoginButton ? (
        <BlueButtonLink title={loc.hodl.login} onPress={route.params.handleLoginPress} style={styles.marginHorizontal20} />
      ) : (
        <BlueButtonLink title={loc.hodl.mycont} onPress={route.params.handleMyContractsPress} style={styles.marginHorizontal20} />
      );
    },
  }),
);

const styles = StyleSheet.create({
  grayDropdownText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9AA0AA',
  },
  modalContent: {
    backgroundColor: BlueCurrentTheme.colors.elevated,
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 400,
    height: 400,
  },
  modalContentShort: {
    backgroundColor: BlueCurrentTheme.colors.elevated,
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 200,
    height: 200,
  },
  Title: {
    fontWeight: 'bold',
    fontSize: 30,
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  BottomLine: {
    fontSize: 10,
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  grayDropdownTextContainer: {
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    borderRadius: 20,
    height: 35,
    top: 3,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  grayTextContainerContainer: {
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    borderRadius: 20,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  grayTextContainer: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  blueText: {
    color: BlueCurrentTheme.colors.foregroundColor,
    fontSize: 15,
    fontWeight: '600',
  },
  allOffersText: {
    fontSize: 12,
    color: '#9AA0AA',
    position: 'absolute',
    top: 0,
    left: 15,
  },
  locationText: {
    top: 0,
    left: 5,
    color: BlueCurrentTheme.colors.foregroundColor,
    fontSize: 20,
    fontWeight: '500',
  },
  nicknameText: {
    color: BlueCurrentTheme.colors.foregroundColor,
    fontSize: 18,
    fontWeight: '600',
  },
  blueTextContainer: {
    backgroundColor: BlueCurrentTheme.colors.mainColor,
    borderRadius: 20,
    width: 110,
    flex: 1,
    flexDirection: 'row',
    height: 36,
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    right: 4,
    position: 'absolute',
  },
  searchInputContainer: {
    flexDirection: 'row',
    borderColor: BlueCurrentTheme.colors.inputBackgroundColor,
    borderBottomColor: BlueCurrentTheme.colors.inputBackgroundColor,
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    minHeight: 48,
    height: 48,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 26,
    width: '100%',
  },
  circleWhite: {
    position: 'absolute',
    bottom: 4,
    right: 3,
    backgroundColor: 'white',
    width: 9,
    height: 9,
    borderRadius: 4,
  },
  circleGreen: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: '#00d327',
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  itemPrice: { fontWeight: '600', fontSize: 14, color: '#9AA0AA' },
  minmax: { color: '#9AA0AA', fontSize: 12, paddingLeft: 10 },
  noOffersWrapper: { height: '100%', justifyContent: 'center' },
  noOffersText: { textAlign: 'center', color: BlueCurrentTheme.colors.feeText, paddingHorizontal: 16 },
  modalFlatList: { width: '100%' },
  itemSeparator: { height: 0.5, width: '100%', backgroundColor: BlueCurrentTheme.colors.lightBorder },
  itemNameWrapper: { backgroundColor: BlueCurrentTheme.colors.elevated, flex: 1, flexDirection: 'row', paddingTop: 20, paddingBottom: 20 },
  itemNameBold: { fontSize: 20, color: BlueCurrentTheme.colors.foregroundColor, fontWeight: 'bold' },
  itemNameNormal: { fontSize: 20, color: BlueCurrentTheme.colors.foregroundColor, fontWeight: 'normal' },
  whiteBackground: { backgroundColor: BlueCurrentTheme.colors.background },
  filterCurrencyText: { fontSize: 16, color: BlueCurrentTheme.colors.foregroundColor },
  filteCurrencyTextWrapper: { color: BlueCurrentTheme.colors.foregroundColor, right: 0, position: 'absolute' },
  currencyNativeName: { fontSize: 20, color: BlueCurrentTheme.colors.foregroundColor },
  currencyWrapper: { paddingLeft: 10, flex: 1, flexDirection: 'row' },
  methodNameText: { fontSize: 16, color: BlueCurrentTheme.colors.foregroundColor },
  searchTextInput: { fontSize: 17, flex: 1, marginHorizontal: 8, minHeight: 33, paddingLeft: 6, paddingRight: 6, color: '#81868e' },
  iconWithOffset: { left: -10 },
  paddingLeft10: { paddingLeft: 10 },
  countryNativeNameBold: { fontSize: 20, color: BlueCurrentTheme.colors.foregroundColor, fontWeight: 'bold' },
  countryNativeNameNormal: { fontSize: 20, color: BlueCurrentTheme.colors.foregroundColor, fontWeight: 'normal' },
  curSearchInput: { flex: 1, marginHorizontal: 8, minHeight: 33, paddingLeft: 6, paddingRight: 6, color: '#81868e' },
  mthdSearchInput: { flex: 1, marginHorizontal: 8, minHeight: 33, paddingLeft: 6, paddingRight: 6, color: '#81868e' },
  currencyTextBold: {
    fontSize: 20,
    color: BlueCurrentTheme.colors.foregroundColor,
    fontWeight: 'bold',
  },
  currencyTextNormal: {
    fontSize: 20,
    color: BlueCurrentTheme.colors.foregroundColor,
    fontWeight: 'normal',
  },
  currencyText: {
    fontSize: 20,
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  noPaddingLeftOrRight: { paddingLeft: 0, paddingRight: 0 },
  flexRow: { flexDirection: 'row' },
  traderRatingText2: { color: '#9AA0AA' },
  itemPriceWrapper: {
    backgroundColor: BlueCurrentTheme.colors.lightButton,
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 8,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: { color: '#9AA0AA', paddingTop: 10 },
  itemPriceWrapperWrapper: { flex: 1, flexDirection: 'row', paddingTop: 10, paddingBottom: 10, alignItems: 'center' },
  offersSectionList: { marginTop: 24, flex: 1 },
  marginHorizontal20: { marginHorizontal: 20 },
  avatarImage: { width: 40, height: 40, borderRadius: 40 },
  avatarWrapper: { backgroundColor: BlueCurrentTheme.colors.background, flex: 1, flexDirection: 'row' },
  avatarWrapperWrapper: { backgroundColor: BlueCurrentTheme.colors.background, paddingTop: 16, paddingBottom: 16 },
  headerWrapper: { backgroundColor: BlueCurrentTheme.colors.background, marginHorizontal: 20, marginBottom: 8 },
  verifiedIcon: { marginTop: 5, marginRight: 5 },
});
