import Frisbee from 'frisbee';
const CryptoJS = require('crypto-js');

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
    this.useragent = process.env.HODLHODL_USERAGENT || 'bluewallet';
    this._api = new Frisbee({ baseURI: this.baseURI });
  }

  _getHeaders() {
    return {
      headers: {
        'User-Agent': this.useragent,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.apiKey,
      },
    };
  }

  _getHeadersWithoutAuthorization() {
    return {
      headers: {
        'User-Agent': this.useragent,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    };
  }

  async getCountries() {
    const response = await this._api.get('/api/v1/countries', this._getHeaders());

    const json = response.body;
    if (!json || !json.countries || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return (this._countries = json.countries);
  }

  async getPaymentMethods(country) {
    const response = await this._api.get('/api/v1/payment_methods?filters[country]=' + country, this._getHeaders());

    const json = response.body;
    if (!json || !json.payment_methods || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return (this._payment_methods = json.payment_methods.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)));
  }

  async getCurrencies() {
    const response = await this._api.get('/api/v1/currencies', this._getHeaders());

    const json = response.body;
    if (!json || !json.currencies || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return (this._currencies = json.currencies.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1)));
  }

  async getOffer(id) {
    const response = await this._api.get('/api/v1/offers/' + id, this._getHeadersWithoutAuthorization());

    const json = response.body;
    if (!json || !json.offer || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return json.offer;
  }

  async getOffers(pagination = {}, filters = {}, sort = {}) {
    const uri = [];
    for (const key in sort) {
      uri.push('sort[' + key + ']=' + sort[key]);
    }
    for (const key in filters) {
      uri.push('filters[' + key + ']=' + filters[key]);
    }
    for (const key in pagination) {
      uri.push('pagination[' + key + ']=' + pagination[key]);
    }
    const response = await this._api.get('/api/v1/offers?' + uri.join('&'), this._getHeadersWithoutAuthorization());

    const json = response.body;
    if (!json || !json.offers || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return (this._offers = json.offers);
  }

  createSignature(apiKey, sigKey, nonce) {
    const sourceMessageForSigning = apiKey + ':' + nonce; // <api_key>:<nonce>
    return CryptoJS.HmacSHA256(sourceMessageForSigning, sigKey).toString(CryptoJS.enc.Hex);
  }

  /**
   * @see https://gitlab.com/hodlhodl-public/public_docs/-/blob/master/autologin.md
   *
   * @param apiSigKey {string}
   * @param nonce {integer|null} Optional unix timestamp (sec, not msec), or nothing
   * @returns {Promise<string>} Token usable for autologin (works only once and only about 30 seconds)
   */
  async requestAutologinToken(apiSigKey, nonce) {
    nonce = nonce || Math.floor(+new Date() / 1000);
    const signature = this.createSignature(this.apiKey, apiSigKey, nonce);

    const response = await this._api.get('/api/v1/users/login_token?nonce=' + nonce + '&hmac=' + signature, this._getHeaders());

    const json = response.body;
    if (!json || !json.token || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return json.token;
  }

  async getMyself() {
    const response = await this._api.get('/api/v1/users/me', this._getHeaders());

    const json = response.body;
    if (!json || !json.user || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return (this._user = json.user);
  }

  async acceptOffer(id, version, paymentMethodInstructionId, paymentMethodInstructionVersion, value) {
    const response = await this._api.post(
      '/api/v1/contracts',
      Object.assign({}, this._getHeaders(), {
        body: {
          contract: {
            offer_id: id,
            offer_version: version,
            payment_method_instruction_id: paymentMethodInstructionId,
            payment_method_instruction_version: paymentMethodInstructionVersion,
            comment: 'I accept your offer',
            value,
          },
        },
      }),
    );

    const json = response.body;
    if (!json || !json.contract || json.status === 'error') {
      if (json && json.validation_errors) throw new Error(this.validationErrorsToReadable(json.validation_errors));
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return json.contract;
  }

  validationErrorsToReadable(errorz) {
    const ret = [];
    for (const er of Object.keys(errorz)) {
      if (Array.isArray(errorz[er])) {
        ret.push(errorz[er].join('; '));
      } else {
        ret.push(errorz[er]);
      }
    }

    return ret.join('\n');
  }

  async getContract(id) {
    const response = await this._api.get('/api/v1/contracts/' + id, this._getHeaders());

    const json = response.body;
    if (!json || !json.contract || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return json.contract;
  }

  verifyEscrowAddress(encryptedSeed, encryptPassword, index, address, witnessScript) {
    // TODO
    // @see https://gitlab.com/hodlhodl-public/hodl-client-js
    return true;
  }

  /**
   * This method is used to confirm that client-side validation of escrow data was successful.
   * This method should be called immediately after escrow address appeared in Getting contract response and this escrow address has been verified locally by the client.
   *
   * @param id
   * @returns {Promise<{}>}
   */
  async markContractAsConfirmed(id) {
    const response = await this._api.post('/api/v1/contracts/' + id + '/confirm', this._getHeaders());

    const json = response.body;
    if (!json || !json.contract || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return json.contract;
  }

  /**
   * Buyer (and only buyer) should call this method when fiat payment was made.
   * This method could be called only if contract’s status is "in_progress".
   *
   * @param id
   * @returns {Promise<{}>}
   */
  async markContractAsPaid(id) {
    const response = await this._api.post('/api/v1/contracts/' + id + '/mark_as_paid', this._getHeaders());

    const json = response.body;
    if (!json || !json.contract || json.status === 'error') {
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return json.contract;
  }

  async cancelContract(id) {
    const response = await this._api.post('/api/v1/contracts/' + id + '/cancel', this._getHeaders());

    const json = response.body;
    if (!json || !json.contract || json.status === 'error') {
      if (json && json.validation_errors) throw new Error(this.validationErrorsToReadable(json.validation_errors));
      throw new Error('API failure: ' + JSON.stringify(response));
    }

    return json.contract;
  }
}
