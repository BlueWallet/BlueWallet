/* global alert */
import React, { Component } from 'react';
import {
  Linking,
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableHighlight,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { BlueNavigationStyle, BlueLoading, BlueCard, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { HodlHodlApi } from '../../class/hodl-hodl-api';
import Modal from 'react-native-modal';
import { Icon } from 'react-native-elements';
const A = require('../../analytics');

const CURRENCY_CODE_ANY = '_any';
const METHOD_ANY = '_any';

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
  },
  poweredBy: {
    position: 'absolute',
    top: -10,
    left: 0,
    fontSize: 10,
    color: '#0c2550',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 34,
    color: '#0c2550',
  },
  chooseSide: {
    backgroundColor: '#EEF0F4',
    borderRadius: 20,
    width: 100,
    height: 35,
    top: 3,
    paddingLeft: 2,
    paddingBottom: 6,
    paddingTop: 6,
    paddingRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 0.65,
    flexDirection: 'row',
  },
  chooseSideText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#9AA0AA',
  },
  chooseSideIcon: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  filter: {
    backgroundColor: '#EEF0F4',
    borderRadius: 20,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  filterRow: {
    width: '100%',
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  filterLocation: {
    top: 0,
    left: 5,
    color: '#0c2550',
    fontSize: 20,
    fontWeight: '500',
  },
  filterOpenTouch: {
    backgroundColor: '#CCDDF9',
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
  filterOpenText: {
    color: '#2f5fb3',
    fontSize: 18,
    fontWeight: '600',
  },

  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 200,
    height: 200,
  },
  modalSearch: {
    flexDirection: 'row',
    borderColor: '#EEF0F4',
    borderBottomColor: '#EEF0F4',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    backgroundColor: '#EEF0F4',
    minHeight: 48,
    height: 48,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 26,
    width: '100%',
  },
  modalSearchText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    paddingLeft: 6,
    paddingRight: 6,
  },
  modalSearchText2: {
    flex: 1,
    fontSize: 17,
    marginHorizontal: 8,
    minHeight: 33,
    paddingLeft: 6,
    paddingRight: 6,
  },
  modalSearchIcon: {
    left: -10,
  },
  modalList: {
    width: '100%',
  },

  itemRoot: {
    backgroundColor: 'white',
  },
  item: {
    backgroundColor: 'white',
    flex: 1,
    flexDirection: 'row',
    paddingTop: 20,
    paddingBottom: 20,
  },
  itemText: {
    fontSize: 20,
    color: '#0c2550',
  },
  itemTextBold: {
    fontWeight: 'bold',
  },
  itemTextNormal: {
    fontWeight: 'normal',
  },
  itemRow: {
    paddingLeft: 10,
    flex: 1,
    flexDirection: 'row',
  },
  itemValue: {
    color: '#9AA0AA',
    right: 0,
    position: 'absolute',
  },
  itemValueText1: {
    fontSize: 18,
    color: '#9AA0AA',
  },
  itemValueText2: {
    fontSize: 20,
    color: '#9AA0AA',
  },

  offers: {
    paddingHorizontal: 24,
  },
  offersList: {
    marginTop: 24,
    flex: 1,
  },
  offersListContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  noOffers: {
    textAlign: 'center',
    color: '#9AA0AA',
    paddingHorizontal: 16,
  },

  offer: {
    backgroundColor: 'white',
    paddingTop: 16,
    paddingBottom: 16,
  },
  offerRow: {
    backgroundColor: 'white',
    flex: 1,
    flexDirection: 'row',
  },
  offerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 40,
  },
  offerNickname: {
    color: '#0c2550',
    fontSize: 18,
    fontWeight: '600',
  },
  offerRating: {
    color: '#9AA0AA',
  },
  offerText: {
    color: '#9AA0AA',
    paddingTop: 10,
  },
  offerFooter: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
  },
  offerPrice: {
    backgroundColor: '#EEF0F4',
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 8,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerPriceText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#9AA0AA',
  },
  offerAmount: {
    color: '#9AA0AA',
    fontSize: 12,
    paddingLeft: 10,
  },

  // allOffersText: {
  //   fontSize: 12,
  //   color: '#9AA0AA',
  //   position: 'absolute',
  //   top: 0,
  //   left: 15,
  // },

  paddingLeft: {
    paddingLeft: 10,
  },
  separator: {
    height: 0.5,
    width: '100%',
    backgroundColor: '#C8C8C8',
  },
});

const HodlApi = new HodlHodlApi();

export default class HodlHodl extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(),
    title: '',
  });

  constructor(props) {
    super(props);
    /**  @type {AbstractWallet}   */
    let wallet = props.route.params.wallet;

    this.state = {
      isLoading: true,
      isChooseSideModalVisible: false,
      isChooseCountryModalVisible: false,
      isFiltersModalVisible: false,
      isChooseCurrencyVisible: false,
      isChooseMethodVisible: false,
      currency: false, // means no currency filtering is enabled by default
      method: false, // means no payment method filtering is enabled by default
      side: HodlHodlApi.FILTERS_SIDE_VALUE_SELL, // means 'show me sell offers as Im buying'
      wallet,
      offers: [],
      countries: [], // list of hodlhodl supported countries. filled later via api
      currencies: [], // list of hodlhodl supported currencies. filled later via api
      methods: [], // list of hodlhodl payment methods. filled later via api
      country: HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL, // country currently selected by user to display orders on screen. this is country code
      myCountryCode: HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL, // current user's country. filled later, via geoip api
    };
  }

  /**
   * Fetch offers and set those offers into state
   *
   * @returns {Promise<void>}
   */
  async fetchOffers() {
    let pagination = {
      [HodlHodlApi.PAGINATION_LIMIT]: 200,
    };
    let filters = {
      [HodlHodlApi.FILTERS_COUNTRY]: this.state.country,
      [HodlHodlApi.FILTERS_SIDE]: this.state.side,
      [HodlHodlApi.FILTERS_ASSET_CODE]: HodlHodlApi.FILTERS_ASSET_CODE_VALUE_BTC,
      [HodlHodlApi.FILTERS_INCLUDE_GLOBAL]: this.state.country === HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL,
      [HodlHodlApi.FILTERS_ONLY_WORKING_NOW]: true, // so there wont be any offers which user tries to open website says 'offer not found'
    };

    if (this.state.currency) {
      filters[HodlHodlApi.FILTERS_CURRENCY_CODE] = this.state.currency;
    }

    if (this.state.method) {
      filters[HodlHodlApi.FILTERS_PAYMENT_METHOD_ID] = this.state.method;
    }

    let sort = {
      [HodlHodlApi.SORT_BY]: HodlHodlApi.SORT_BY_VALUE_PRICE,
      [HodlHodlApi.SORT_DIRECTION]: HodlHodlApi.SORT_DIRECTION_VALUE_ASC,
    };
    const offers = await HodlApi.getOffers(pagination, filters, sort);

    this.setState({
      offers,
    });
  }

  async fetchMyCountry() {
    let myCountryCode = await HodlApi.getMyCountryCode();
    this.setState({
      myCountryCode,
      country: myCountryCode, // we start with orders from current country
    });
  }

  /**
   * fetches all countries from API and sets them to state
   *
   * @returns {Promise<void>}
   **/
  async fetchListOfCountries() {
    let countries = await HodlApi.getCountries();
    this.setState({ countries });
  }

  /**
   * fetches all currencies from API and sets them to state
   *
   * @returns {Promise<void>}
   **/
  async fetchListOfCurrencies() {
    let currencies = await HodlApi.getCurrencies();
    this.setState({ currencies });
  }

  /**
   * fetches all payment methods from API and sets them to state
   *
   * @returns {Promise<void>}
   **/
  async fetchListOfMethods() {
    let methods = await HodlApi.getPaymentMethods(this.state.country || HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL);
    this.setState({ methods });
  }

  async componentDidMount() {
    console.log('wallets/hodlHodl - componentDidMount');
    A(A.ENUM.NAVIGATED_TO_WALLETS_HODLHODL);

    try {
      await this.fetchMyCountry();
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

  async _refresh() {
    this.setState(
      {
        isLoading: true,
      },
      async () => {
        await this.fetchOffers();
        this.setState({
          isLoading: false,
        });
      },
    );
  }

  _onPress(item) {
    Linking.openURL('https://hodlhodl.com/offers/' + item.id);
  }

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
      ret =
        title +
        '\n' +
        description
          .split('\n')
          .slice(0, 2)
          .join('\n');
    }
    if (ret.length >= 200) ret = ret.substr(0, 200) + '...';
    return ret;
  }

  getMethodName(id) {
    for (let m of this.state.methods) {
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
    if (this.state.country === this.state.myCountryCode) return 'Near me';
    for (let c of this.state.countries) {
      if (c.code === this.state.country) return c.native_name;
    }
    return 'Global offers';
  }

  renderChooseSideModal = () => {
    return (
      <Modal
        isVisible={this.state.isChooseSideModalVisible}
        style={styles.modal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          this.setState({ isChooseSideModalVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContentShort}>
            <FlatList
              scrollEnabled={false}
              style={styles.modalList}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              data={[
                { code: HodlHodlApi.FILTERS_SIDE_VALUE_SELL, name: "I'm buying bitcoin" },
                { code: HodlHodlApi.FILTERS_SIDE_VALUE_BUY, name: "I'm selling bitcoin" },
              ]}
              keyExtractor={(item, index) => item.code}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                  onPress={() => this._onSidePress(item)}
                >
                  <View style={styles.item}>
                    <Text style={[styles.itemText, this.state.side === item.code ? styles.itemTextBold : styles.itemTextNormal]}>
                      {item.name}
                    </Text>
                  </View>
                </TouchableHighlight>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  renderFiltersModal = () => {
    return (
      <Modal
        isVisible={this.state.isFiltersModalVisible}
        style={styles.modal}
        onModalHide={() => {
          if (this.state.openNextModal) {
            const openNextModal = this.state.openNextModal;
            this.setState({
              openNextModal: false,
              [openNextModal]: true,
            });
          }
        }}
        onBackdropPress={() => {
          Keyboard.dismiss();
          this.setState({ isFiltersModalVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContentShort}>
            <FlatList
              scrollEnabled={false}
              style={styles.modalList}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              data={[
                { code: 'currency', native_name: 'Currency' },
                { code: 'method', native_name: 'Payment method' },
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
                  <View style={styles.itemRoot}>
                    <View style={styles.item}>
                      <View style={styles.itemRow}>
                        <Text style={styles.itemText}>{item.native_name}</Text>
                        <View style={styles.itemValue}>
                          {item.code === 'currency' && (
                            <Text style={styles.itemValueText1}> {this.state.currency ? this.state.currency + '   ❯' : 'Detail   ❯'} </Text>
                          )}
                          {item.code === 'method' && (
                            <Text style={styles.itemValueText2}>
                              {' '}
                              {this.state.method ? this.getMethodName(this.state.method) + '   ❯' : 'Detail   ❯'}
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
      </Modal>
    );
  };

  renderChooseContryModal = () => {
    let countries2render = [];

    // first, we include in the list current country
    for (let country of this.state.countries) {
      if (country.code === this.state.country) {
        countries2render.push(country);
      }
    }

    // next, we include option for user to set GLOBAL for offers
    countries2render.push({
      code: HodlHodlApi.FILTERS_COUNTRY_VALUE_GLOBAL,
      name: 'Global offers',
      native_name: 'Global offers',
    });

    // lastly, we include other countries
    for (let country of this.state.countries) {
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
      <Modal
        isVisible={this.state.isChooseCountryModalVisible}
        style={styles.modal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          this.setState({ isChooseCountryModalVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <View style={styles.modalSearch}>
              <TextInput
                onChangeText={text => this.setState({ countrySearchInput: text })}
                placeholder={'Search..'}
                placeholderTextColor="#9AA0AA"
                value={this.state.countrySearchInput || ''}
                numberOfLines={1}
                style={styles.modalSearchText2}
              />
              <Icon name="search" type="material" size={20} color="gray" containerStyle={styles.modalSearchIcon} />
            </View>
            <FlatList
              style={styles.modalList}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              data={countries2render}
              keyExtractor={(item, index) => item.code}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onPress={() => this._onCountryPress(item)}
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                >
                  <View style={styles.itemRoot}>
                    <View style={styles.item}>
                      <View style={styles.paddingLeft}>
                        <Text style={[styles.itemText, item.code === this.state.country ? styles.itemTextBold : styles.itemTextNormal]}>
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
      </Modal>
    );
  };

  renderChooseCurrencyModal = () => {
    let currencies2render = [];

    // first, option to choose any currency
    currencies2render.push({
      code: CURRENCY_CODE_ANY,
      name: 'Any',
    });

    // lastly, we include other countries
    for (let curr of this.state.currencies) {
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
      <Modal
        isVisible={this.state.isChooseCurrencyVisible}
        style={styles.modal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          this.setState({ isChooseCurrencyVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <View style={styles.modalSearch}>
              <TextInput
                onChangeText={text => this.setState({ currencySearchInput: text })}
                placeholder={'Search..'}
                placeholderTextColor="#9AA0AA"
                value={this.state.currencySearchInput || ''}
                numberOfLines={1}
                style={styles.modalSearchText}
              />
              <Icon name="search" type="material" size={20} color="gray" containerStyle={styles.modalSearchIcon} />
            </View>
            <FlatList
              style={styles.modalList}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              data={currencies2render}
              keyExtractor={(item, index) => item.code}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onPress={() => this._onCurrencyPress(item)}
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                >
                  <View style={styles.itemRoot}>
                    <View style={styles.item}>
                      <View style={styles.paddingLeft}>
                        <Text
                          style={[
                            styles.itemText,
                            item.code === this.state.currency || (item.code === CURRENCY_CODE_ANY && this.state.currency === false)
                              ? styles.itemTextBold
                              : styles.itemTextNormal,
                          ]}
                        >
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
      </Modal>
    );
  };

  renderChooseMethodModal = () => {
    let methods2render = [];

    // first, option to choose any currency
    methods2render.push({
      id: METHOD_ANY,
      name: 'Any',
    });

    // lastly, we include other countries
    for (let curr of this.state.methods) {
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
      <Modal
        isVisible={this.state.isChooseMethodVisible}
        style={styles.modal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          this.setState({ isChooseMethodVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <View style={styles.modalSearch}>
              <TextInput
                onChangeText={text => this.setState({ methodSearchInput: text })}
                placeholder={'Search..'}
                placeholderTextColor="#9AA0AA"
                value={this.state.methodSearchInput || ''}
                numberOfLines={1}
                style={styles.modalSearchText}
              />
              <Icon name="search" type="material" size={20} color="gray" containerStyle={styles.modalSearchIcon} />
            </View>
            <FlatList
              style={styles.modalList}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              data={methods2render}
              keyExtractor={(item, index) => item.id}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onPress={() => this._onMethodPress(item)}
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                >
                  <View style={styles.itemRoot}>
                    <View style={styles.item}>
                      <View style={styles.paddingLeft}>
                        <Text
                          style={[
                            styles.itemText,
                            item.id === this.state.method || (item.id === METHOD_ANY && this.state.method === false)
                              ? styles.itemTextBold
                              : styles.itemTextNormal,
                          ]}
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
      </Modal>
    );
  };

  render() {
    return (
      <SafeBlueArea>
        <BlueCard style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.poweredBy}>Powered by HodlHodl®</Text>
            <Text style={styles.title}>Local Trader </Text>
            <TouchableOpacity
              style={styles.chooseSide}
              onPress={() => {
                this.setState({ isChooseSideModalVisible: true });
              }}
            >
              <Text style={styles.chooseSideText}>{this.state.side === HodlHodlApi.FILTERS_SIDE_VALUE_SELL ? 'Buying' : 'Selling'}</Text>
              <Icon name="expand-more" type="material" size={22} color="#9AA0AA" containerStyle={styles.chooseSideIcon} />
            </TouchableOpacity>
          </View>

          <View style={styles.filter}>
            <View style={styles.filterRow}>
              {/* <Text style={styles.allOffersText}>All offers</Text> */}

              <Icon name="place" type="material" size={20} color="#0c2550" containerStyle={styles.paddingLeft} />
              <TouchableOpacity onPress={() => this.setState({ isChooseCountryModalVisible: true }) /* this.changeCountry() */}>
                <Text style={styles.filterLocation}>{this.getNativeCountryName()}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOpenTouch}
                onPress={() => {
                  this.setState({ isFiltersModalVisible: true });
                }}
              >
                <Text style={styles.filterOpenText}>Filters</Text>

                <Icon name="filter-list" type="material" size={24} color="#2f5fb3" containerStyle={styles.paddingLeft} />
              </TouchableOpacity>
            </View>
          </View>
        </BlueCard>
        {(this.state.isLoading && <BlueLoading />) || (
          <ScrollView style={styles.offers}>
            <FlatList
              onRefresh={() => this._refresh()}
              refreshing={this.state.isLoading}
              style={styles.offersList}
              contentContainerStyle={styles.offersListContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              data={this.state.offers}
              ListEmptyComponent={() => <Text style={styles.noOffers}>No offers. Try to change "Near me" to Global offers!</Text>}
              renderItem={({ item, index, separators }) => (
                <TouchableHighlight
                  onPress={() => this._onPress(item)}
                  onShowUnderlay={separators.highlight}
                  onHideUnderlay={separators.unhighlight}
                >
                  <View style={styles.offer}>
                    <View style={styles.offerRow}>
                      <View>
                        <Image
                          style={styles.offerAvatar}
                          source={{
                            uri: item.trader.avatar_url.endsWith('.svg')
                              ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA/oAAAQCCAYAAAAcgINbAAAgAElEQVR4Xuzdi3dcZbk/8GfvSdKmbdr0fqdFURFUUPDyw9v501UuRxAQQQQBtfd703vTJpm9f2ta9IgCbZpMZu/3+cw6rFad2fv5fp53nbW+ZGZSvfPOO214ECBAgAABAgQIECBAgAABAkUIVHcWzir6RaxSCAIECBAgQIAAAQIECBAgEKHoOwUECBAgQIAAAQIECBAgQKAgAUW/oGWKQoAAAQIECBAgQIAAAQIEFH1ngAABAgQIECBAgAABAgQIFCSg6Be0TFEIECBAgAABAgQIECBAgICi7wwQIECAAAECBAgQIECAAIGCBBT9gpYpCgECBAgQIECAAAECBAgQUPSdAQIECBAgQIAAAQIECBAgUJCAol/QMkUhQIAAAQIECBAgQIAAAQKKvjNAgAABAgQIECBAgAABAgQKElD0C1qmKAQIECBAgAABAgQIECBAQNF3BggQIECAAAECBAgQIECAQEECin5ByxSFAAECBAgQIECAAAECBAgo+s4AAQIECBAgQIAAAQIECBAoSEDRL2iZohAgQIAAAQIECBAgQIAAAUXfGSBAgAABAgQIECBAgAABAgUJKPoFLVMUAgQIECBAgAABAgQIECCg6DsDBAgQIECAAAECBAgQIECgIAFFv6BlikKAAAECBAgQIECAAAECBBR9Z4AAAQIECBAgQIAAAQIECBQkoOgXtExRCBAgQIAAAQIECBAgQICAou8MECBAgAABAgQIECBAgACBggQU/YKWKQoBAgQIECBAgAABAgQIEFD0nQECBAgQIECAAAECBAgQIFCQgKJf0DJFIUCAAAECBAgQIECAAAECir4zQIAAAQIECBAgQIAAAQIEChJQ9AtapigECBAgQIAAAQIECBAgQEDRdwYIECBAgAABAgQIECBAgEBBAop+QcsUhQABAgQIECBAgAABAgQIKPrOAAECBAgQIECAAAECBAgQKEhA0S9omaIQIECAAAECBAgQIECAAAFF3xkgQIAAAQIECBAgQIAAAQIFCSj6BS1TFAIECBAgQIAAAQIECBAgoOg7AwQIECBAgAABAgQIECBAoCABRb+gZYpCgAABAgQIECBAgAABAgQUfWeAAAECBAgQIECAAAECBAgUJKDoF7RMUQgQIECAAAECBAgQIECAgKLvDBAgQIAAAQIECBAgQIAAgYIEFP2ClikKAQIECBAgQIAAAQIECBBQ9J0BAgQIECBAgAABAgQIECBQkICiX9AyRSFAgAABAgQIECBAgAABAoq+M0CAAAECBAgQIECAAAECBAoSUPQLWqYoBAgQIECAAAECBAgQIEBA0XcGCBAgQIAAAQIECBAgQIBAQQKKfkHLFIUAAQIECBAgQIAAAQIECCj6zgABAgQIECBAgAABAgQIEChIQNEvaJmiECBAgAABAgQIECBAgAABRd8ZIECAAAECBAgQIECAAAECBQko+gUtUxQCBAgQIECAAAECBAgQIKDoOwMECBAgQIAAAQIECBAgQKAgAUW/oGWKQoAAAQIECBAgQIAAAQIEFH1ngAABAgQIECBAgAABAgQIFCSg6Be0TFEIECBAgAABAgQIECBAgICi7wwQIECAAAECBAgQIECAAIGCBBT9gpYpCgECBAgQIECAAAECBAgQUPSdAQIECBAgQIAAAQIECBAgUJCAol/QMkUhQIAAAQIECBAgQIAAAQKKvjNAgAABAgQIECBAgAABAgQKElD0C1qmKAQIECBAgAABAgQIECBAQNF3BggQIECAAAECBAgQIECAQEECin5ByxSFAAECBAgQIECAAAECBAgo+s4AAQIECBAgQIAAAQIECBAoSEDRL2iZohAgQIAAAQIECBAgQIAAAUXfGSBAgAABAgQIECBAgAABAgUJKPoFLVMUAgQIECBAgAABAgQIECCg6DsDBAgQIECAAAECBAgQIECgIAFFv6BlikKAAAECBAgQIECAAAECBBR9Z4AAAQIECBAgQIAAAQIECBQkoOgXtExRCBAgQIAAAQIECBAgQICAou8MECBAgAABAgQIECBAgACBggQU/YKWKQoBAgQIECBAgAABAgQIEFD0nQECBAgQIECAAAECBAgQIFCQgKJf0DJFIUCAAAECBAgQIECAAAECir4zQIAAAQIECBAgQIAAAQIEChJQ9AtapigECBAgQIAAAQIECBAgQEDRdwYIECBAgAABAgQIECBAgEBBAop+QcsUhQABAgQIECBAgAABAgQIKPrOAAECBAgQIECAAAECBAgQKEhA0S9omaIQIECAAAECBAgQIECAAAFF3xkgQIAAAQIECBAgQIAAAQIFCSj6BS1TFAIECBAgQIAAAQIECBAgoOg7AwQIECBAgAABAgQIECBAoCABRb+gZYpCgAABAgQIECBAgAABAgQUfWeAAAECBAgQIECAAAECBAgUJKDoF7RMUQgQIECAAAECBAgQIECAgKLvDBAgQIAAAQIECBAgQIAAgYIEFP2ClikKAQIECBAgQIAAAQIECBBQ9J0BAgQIECBAgAABAgQIECBQkICiX9AyRSFAgAABAgQIECBAgAABAoq+M0CAAAECBAgQIECAAAECBAoSUPQLWqYoBAgQIECAAAECBAgQIEBA0XcGCBAgQIAAAQIECBAgQIBAQQKKfkHLFIUAAQIECBAgQIAAAQIECCj6zgABAgQIECBAgAABAgQIEChIQNEvaJmiECBAgAABAgQIECBAgAABRd8ZIECAAAECBAgQIECAAAECBQko+gUtUxQCBAgQIECAAAECBAgQIKDoOwMECBAgQIAAAQIECBAgQKAgAUW/oGWKQoAAAQIECBAgQIAAAQIEFH1ngAABAgQIECBAgAABAgQIFCSg6Be0TFEIECBAgAABAgQIECBAgICi7wwQIECAAAECBAgQIECAAIGCBBT9gpYpCgECBAgQIECAAAECBAgQUPSdAQIECBAgQIAAAQIECBAgUJCAol/QMkUhQIAAAQIECBAgQIAAAQKKvjNAgAABAgQIECBAgAABAgQKElD0C1qmKAQIECBAgAABAgQIECBAQNF3BggQIECAAAECBAgQIECAQEECin5ByxSFAAECBAgQIECAAAECBAgo+s4AAQIECBAgQIAAAQIECBAoSEDRL2iZohAgQIAAAQIECBAgQIAAAUXfGSBAgAABAgQIECBAgAABAgUJKPoFLVMUAgQIECBAgAABAgQIECCg6DsDBAgQIECAAAECBAgQIECgIAFFv6BlikKAAAECBAgQIECAAAECBBR9Z4AAAQIECBAgQIAAAQIECBQkoOgXtExRCBAgQIAAAQIECBAgQICAou8MECBAgAABAgQIECBAgACBggQU/YKWKQoBAgQIECBAgAABAgQIEFD0nQECBAgQIECAAAECBAgQIFCQgKJf0DJFIUCAAAECBAgQIECAAAECir4zQIAAAQIECBAgQIAAAQIEChJQ9AtapigECBAgQIAAAQIECBAgQEDRdwYIECBAgAABAgQIECBAgEBBAop+QcsUhQABAgQIECBAgAABAgQIKPrOAAECBAgQIECAAAECBAgQKEhA0S9omaIQIECAAAECBAgQIECAAAFF3xkgQIAAAQIECBAgQIAAAQIFCSj6BS1TFAIECBAgQIAAAQIECBAgoOg7AwQIECBAgAABAgQIECBAoCABRb+gZYpCgAABAgQIECBAgAABAgQUfWeAAAECBAgQIECAAAECBAgUJKDoF7RMUQgQIECAAAECBAgQIECAgKLvDBAgQIAAAQIECBAgQIAAgYIEFP2ClikKAQIECBAgQIAAAQIECBBQ9J0BAgQIECBAgAABAgQIECBQkICiX9AyRSFAgAABAgQIECBAgAABAoq+M0CAAAECBAgQIECAAAECBAoSUPQLWqYoBAgQIECAAAECBAgQIEBA0XcGCBAgQIAAAQIECBAgQIBAQQKKfkHLFIUAAQIECBAgQIAAAQIECCj6zgABAgQIECBAgAABAgQIEChIQNEvaJmiECBAgAABAgQIECBAgAABRd8ZIECAAAECBAgQIECAAAECBQko+gUtUxQCBAgQIECAAAECBAgQIKDoOwMECBAgQIAAAQIECBAgQKAgAUW/oGWKQoAAAQIECBAgQIAAAQIEFH1ngAABAgQIECBAgAABAgQIFCSg6Be0TFEIECBAgAABAgQIECBAgICi7wwQIECAAAECBAgQIECAAIGCBBT9gpYpCgECBAgQIECAAAECBAgQUPSdAQIECBAgQIAAAQIECBAgUJCAol/QMkUhQIAAAQIECBAgQIAAAQKKvjNAgAABAgQIECBAgAABAgQKElD0C1qmKAQIECBAgAABAgQIECBAQNF3BggQIECAAAECBAgQIECAQEECin5ByxSFAAECBAgQIECAAAECBAgo+s4AAQIECBAgQIAAAQIECBAoSEDRL2iZohAgQIAAAQIECBAgQIAAAUXfGSBAgAABAgQIECBAgAABAgUJKPoFLVMUAgQIECBAgAABAgQIECCg6DsDBAgQIECAAAECBAgQIECgIAFFv6BlikKAAAECBAgQIECAAAECBBR9Z4AAAQIECBAgQIAAAQIECBQkoOgXtExRCBAgQKCnAu0wohn9sxJtO4yqWXn49wd/DiPalWiHTUTVRrRttG0bVTQRbUS0TbSjv4z+u7Z5ADD632P0vz94QhURdVTV6M8q2gd/1FE9+O+rB//XVvWDvz94zuiftopqUEfU0xH11Of/TEc1+vtg9J9n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QODqAlmzHZtf/HeRduSf9rhS0D+//1qcvfezacd2HgECBAgQIECAAAECBAgQIHBDgeb6VnRf+dbUm/NNHfRHp4/i+LX/dsPyXE6AAAECBAgQIECAAAECBAhcVWB193Ox9txXp7psqqCfj87j6KffjnzUn2pQJxEgQIAAAQIECBAgQIAAAQKzFdj4/B9Fe/PpSwedIujncfza30V6ou8gQIAAAQIECBAgQIAAAQIEliTQaMXWF/8sspWNJxZwadBP7+Snd/MdBAgQIECAAAECBAgQIECAwHIFGqudyeZ8kTU+s5AnBv1x7zCOfvGdiMiX24m7EyBAgAABAgQIECBAgAABAhOBlbtfiPVnvnyNoJ/ncfTzb8f4/BglAQIECBAgQIAAAQIECBAgUBiBLLqvfivSbvyPOz7zif75vV/E2fs/L0wbCiFAgAABAgQIECBAgAABAgQuBC5+wv/nj/3k3mODft4/jcOf/U1E7if7FhEBAgQIECBAgAABAgQIECiiwNpTX4zVp1/9rdIeG/SPf/GdGPUOitiHmggQIECAAAECBAgQIECAAIGJQBZbX/6L39qF/7eCfn/vzei9/S/QCBAgQIAAAQIECBAgQIAAgYILNDduRfeVP/1ElZ8M+qNhHPzkryLGw4K3ojwCBAgQIECAAAECBAgQIEAgCaw//7uxcvuF32B8IuinJ/npib6DAAECBAgQIECAAAECBAgQKIdA1mzH1pf/h4hma1Lwb4L++Oxo8jk9BwECBAgQIECAAAECBAgQIFAugZXbL8X681/7ZNA//sXfxqh3WK5OVEuAAAECBAgQIECAAAECBAhMBLqvfiua69sXT/QHj96J0zf/CQ0BAgQIECBAgAABAgQIECBQUoHm2lZ0v/hnkZ08fCs//MlfRT48L2kryiZAgAABAgQIECBAgAABAgSSwPqLvx/Z3s++k5+9+69ECBAgQIAAAQIECBAgQIAAgZILZK3VyN799v+e56N+yVtRPgECBAgQIECAAAECBAgQIJAEsnf+y/+WoyBAgAABAgQIECBAgAABAgSqISDoV2MedUGAAAECBAgQIECAAAECBCYCgr6FQIAAAQIECBAgQIAAAQIEKiQg6FdoMrVCgAABAgQIECBAgAABAgQEfWuAAAECBAgQIECAAAECBAhUSEDQr9BkaoUAAQIECBAgQIAAAQIECAj61gABAgQIECBAgAABAgQIEKiQgKBfocnUCgECBAgQIECAAAECBAgQEPStAQIECBAgQIAAAQIECBAgUCEBQb9Ck6kVAgQIECBAgAABAgQIECAg6FsDBAgQIECAAAECBAgQIECgQgKCfoUmUysECBAgQIAAAQIECBAgQEDQtwYIECBAgAABAgQIECBAgECFBAT9Ck2mVggQIECAAAECBAgQIECAgKBvDRAgQIAAAQIECBAgQIAAgQoJCPoVmkytECBAgAABAgQIECBAgAABQd8aIECAAAECBAgQIECAAAECFRIQ9Cs0mVohQIAAAQIECBAgQIAAAQKCvjVAgAABAgQIECBAgAABAgQqJCDoV2gytUKAAAECBAgQIECAAAECBAR9a4AAAQIECBAgQIAAAQIECFRIQNCv0GRqhQABAgQIECBAgAABAgQICPrWAAECBAgQIECAAAECBAgQqJCAoF+hydQKAQIECBAgQIAAAQIECBAQ9K0BAgQIECBAgAABAgQIECBQIQFBv0KTqRUCBAgQIECAAAECBAgQICDoWwMECBAgQIAAAQIECBAgQKBCAoJ+hSZTKwQIECBAgAABAgQIECBAQNC3BggQIECAAAECBAgQIECAQIUEBP0KTaZWCBAgQIAAAQIECBAgQICAoG8NECBAgAABAgQIECBAgACBCgkI+hWaTK0QIECAAAECBAgQIECAAAFB3xogQIAAAQIECBAgQIAAAQIVEhD0KzSZWiFAgAABAgQIECBAgAABAoK+NUCAAAECBAgQIECAAAECBCokIOhXaDK1QoAAAQIECBAgQIAAAQIEBH1rgAABAgQIECBAgAABAgQIVEhA0K/QZGqFAAECBAgQIECAAAECBAgI+tYAAQIECBAgQIAAAQIECBCokICgX6HJ1AoBAgQIECBAgAABAgQIEBD0rQECBAgQIECAAAECBAgQIFAhAUG/QpOpFQIECBAgQIAAAQIECBAgIOhbAwQIECBAgAABAgQIECBAoEICgn6FJlMrBAgQIECAAAECBAgQIEBA0LcGCBAgQIAAAQIECBAgQIBAhQQE/QpNplYIECBAgAABAgQIECBAgICgbw0QIECAAAECBAgQIECAAIEKCQj6FZpMrRAgQIAAAQIECBAgQIAAAUHfGiBAgAABAgQIECBAgAABAhUSEPQrNJlaIUCAAAECBAgQIECAAAECgr41QIAAAQIECBAgQIAAAQIEKiQg6FdoMrVCgAABAgQIECBAgAABAgQEfWuAAAECBAgQIECAAAECBAhUSEDQr9BkaoUAAQIECBAgQIAAAQIECAj61gABAgQIECBAgAABAgQIEKiQgKBfocnUCgECBAgQIECAAAECBAgQEPStAQIECBAgQIAAAQIECBAgUCEBQb9Ck6kVAgQIECBAgAABAgQIECAg6FsDBAgQIECAAAECBAgQIECgQgKCfoUmUysECBAgQIAAAQIECBAgQEDQtwYIECBAgAABAgQIECBAgECFBAT9Ck2mVggQIECAAAECBAgQIECAgKBvDRAgQIAAAQIECBAgQIAAgQoJCPoVmkytECBAgAABAgQIECBAgAABQd8aIECAAAECBAgQIECAAAECFRIQ9Cs0mVohQIAAAQIECBAgQIAAAQKCvjVAgAABAgQIECBAgAABAgQqJCDoV2gytUKAAAECBAgQIECAAAECBAR9a4AAAQIECBAgQIAAAQIECFRIQNCv0GRqhQABAgQIECBAgAABAgQICPrWAAECBAgQIECAAAECBAgQqJCAoF+hydQKAQIECBAgQIAAAQIECBAQ9K0BAgQIECBAgAABAgQIECBQIQFBv0KTqRUCBAgQIECAAAECBAgQICDoWwMECBAgQIAAAQIECBAgQKBCAoJ+hSZTKwQIECBAgAABAgQIECBAQNC3BggQIECAAAECWnF6XwAAAnhJREFUBAgQIECAQIUEBP0KTaZWCBAgQIAAAQIECBAgQICAoG8NECBAgAABAgQIECBAgACBCgkI+hWaTK0QIECAAAECBAgQIECAAAFB3xogQIAAAQIECBAgQIAAAQIVEhD0KzSZWiFAgAABAgQIECBAgAABAoK+NUCAAAECBAgQIECAAAECBCokIOhXaDK1QoAAAQIECBAgQIAAAQIEBH1rgAABAgQIECBAgAABAgQIVEhA0K/QZGqFAAECBAgQIECAAAECBAgI+tYAAQIECBAgQIAAAQIECBCokICgX6HJ1AoBAgQIECBAgAABAgQIEBD0rQECBAgQIECAAAECBAgQIFAhAUG/QpOpFQIECBAgQIAAAQIECBAgIOhbAwQIECBAgAABAgQIECBAoEICgn6FJlMrBAgQIECAAAECBAgQIEBA0LcGCBAgQIAAAQIECBAgQIBAhQQE/QpNplYIECBAgAABAgQIECBAgICgbw0QIECAAAECBAgQIECAAIEKCQj6FZpMrRAgQIAAAQIECBAgQIAAAUHfGiBAgAABAgQIECBAgAABAhUSEPQrNJlaIUCAAAECBAgQIECAAAECgr41QIAAAQIECBAgQIAAAQIEKiQg6FdoMrVCgAABAgQIECBAgAABAgQEfWuAAAECBAgQIECAAAECBAhUSEDQr9BkaoUAAQIECBAgQIAAAQIECAj61gABAgQIECBAgAABAgQIEKiQgKBfocnUCgECBAgQIECAAAECBAgQEPStAQIECBAgQIAAAQIECBAgUCEBQb9Ck6kVAgQIECBAgAABAgQIECAg6FsDBAgQIECAAAECBAgQIECgQgL/P2mGEdJ0XKL/AAAAAElFTkSuQmCC'
                              : item.trader.avatar_url,
                          }}
                        />
                      </View>
                      <View style={styles.paddingLeft}>
                        <Text style={styles.offerNickname}>{item.trader.login}</Text>
                        <Text style={styles.offerRating}>
                          {item.trader.trades_count > 0 ? Math.round(item.trader.rating * 100) + '%' : 'No rating'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.offerText}>{this.getItemText(item)}</Text>

                    <View style={styles.offerFooter}>
                      <View style={styles.offerPrice}>
                        <Text style={styles.offerPriceText}>{this.getItemPrice(item)}</Text>
                      </View>

                      <Text style={styles.offerAmount}>
                        Min/Max: {item.min_amount.replace('.00', '')} - {item.max_amount.replace('.00', '')} {item.currency_code}
                      </Text>
                    </View>
                  </View>
                </TouchableHighlight>
              )}
            />
          </ScrollView>
        )}

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
  route: PropTypes.shape({
    params: PropTypes.shape({
      wallet: PropTypes.object,
    }),
  }),
};
