import Frisbee from 'frisbee';

export class HodlHodlApi {
  static PAGINATION_LIMIT = 'limit'; // int
  static PAGINATION_OFFSET = 'offset'; // int

  static FILTERS_ASSET_CODE = 'asset_code';
  static FILTERS_ASSET_CODE_VALUE_BTC = 'BTC';
  static FILTERS_ASSET_CODE_VALUE_BTCLN = 'BTCLN';

  static FILTERS_SIDE = 'side';
  static FILTERS_SIDE_VALUE_BUY = 'buy';
  static FILTERS_SIDE_VALUE_SELL = 'sell';

  static FILTERS_INCLUDE_GLOBAL = 'include_global'; // bool
  static FILTERS_ONLY_WORKING_NOW = 'only_working_now'; // bool
  static FILTERS_COUNTRY = 'country'; // code or name (or "Global")
  static FILTERS_COUNTRY_VALUE_GLOBAL = 'Global'; // code or name
  static FILTERS_CURRENCY_CODE = 'currency_code';
  static FILTERS_PAYMENT_METHOD_ID = 'payment_method_id';
  static FILTERS_PAYMENT_METHOD_TYPE = 'payment_method_type';
  static FILTERS_PAYMENT_METHOD_NAME = 'payment_method_name';
  static FILTERS_VOLUME = 'volume';
  static FILTERS_PAYMENT_WINDOW_MINUTES_MAX = 'payment_window_minutes_max'; // in minutes
  static FILTERS_USER_AVERAGE_PAYMENT_TIME_MINUTES_MAX = 'user_average_payment_time_minutes_max'; // in minutes
  static FILTERS_USER_AVERAGE_RELEASE_TIME_MINUTES_MAX = 'user_average_release_time_minutes_max'; // in minutes

  static SORT_DIRECTION = 'direction';
  static SORT_DIRECTION_VALUE_ASC = 'asc';
  static SORT_DIRECTION_VALUE_DESC = 'desc';

  static SORT_BY = 'by';
  static SORT_BY_VALUE_PRICE = 'price';
  static SORT_BY_VALUE_PAYMENT_WINDOW_MINUTES = 'payment_window_minutes';
  static SORT_BY_VALUE_USER_AVERAGE_PAYMENT_TIME_MINUTES = 'user_average_payment_time_minutes';
  static SORT_BY_VALUE_USER_AVERAGE_RELEASE_TIME_MINUTES = 'user_average_release_time_minutes';
  static SORT_BY_VALUE_RATING = 'rating';

  constructor(apiKey = false) {
    this.baseURI = 'https://hodlhodl.com/';
    this.apiKey = apiKey || 'cmO8iLFgx9wrxCe9R7zFtbWpqVqpGuDfXR3FJB0PSGCd7EAh3xgG51vBKgNTAF8fEEpS0loqZ9P1fDZt';
    this._api = new Frisbee({ baseURI: this.baseURI });
  }

  _getHeaders() {
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.apiKey,
      },
    };
  }

  _getHeadersWithoutAuthorization() {
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  }

  async getCountries() {
    let response = await this._api.get('/api/v1/countries', this._getHeaders());

    let json = response.body;
    if (!json || !json.countries || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return (this._countries = json.countries);
  }

  async getMyCountryCode() {
    let _api = new Frisbee({ baseURI: 'https://ifconfig.co/' });
    let response;

    let allowedTries = 6;
    while (allowedTries > 0) {
      // this API fails a lot, so lets retry several times
      response = await _api.get('/country-iso', {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });

      let body = response.body;
      if (typeof body === 'string') body = body.replace('\n', '');
      if (!body || body.length !== 2) {
        allowedTries--;
        await (async () => new Promise(resolve => setTimeout(resolve, 3000)))(); // sleep
      } else {
        return (this._myCountryCode = body);
      }
    }

    throw new Error('API failure after several tries: ' + JSON.stringify(response));
  }

  async getPaymentMethods(country) {
    let response = await this._api.get('/api/v1/payment_methods?filters[country]=' + country, this._getHeaders());

    let json = response.body;
    if (!json || !json.payment_methods || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return (this._payment_methods = json.payment_methods.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)));
  }

  async getCurrencies() {
    let response = await this._api.get('/api/v1/currencies', this._getHeaders());

    let json = response.body;
    if (!json || !json.currencies || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return (this._currencies = json.currencies.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)));
  }

  async getOffers(pagination = {}, filters = {}, sort = {}) {
    let uri = [];
    for (let key in sort) {
      uri.push('sort[' + key + ']=' + sort[key]);
    }
    for (let key in filters) {
      uri.push('filters[' + key + ']=' + filters[key]);
    }
    for (let key in pagination) {
      uri.push('pagination[' + key + ']=' + pagination[key]);
    }
    let response = await this._api.get('/api/v1/offers?' + uri.join('&'), this._getHeadersWithoutAuthorization());

    let json = response.body;
    if (!json || !json.offers || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return (this._offers = json.offers);
  }
}
