import Frisbee from 'frisbee';
import { API_BASE_URL } from '../constants';
import DataNormalizer from './DataNormalization';


export class RestApiClient {
  static BASE_URL = API_BASE_URL;
  static BASE_PATH = 'v1';
  static PATH_REGISTER = 'auth/register';
  static PATH_LOGIN = 'auth/login';
  static PATH_PRODUCTS = 'market/products';
  static PATH_INDEX_PRICES = 'market/index_prices';
  static PATH_POSITION_UPNL_HISTORY = 'positions/upnl';
  static PATH_TICKER = 'market/ticker';
  static PATH_GET_POSITION_STATE = 'positions/state';
  static PATH_GET_WHOAMI = 'auth/whoami';
  static PATH_GET_BALANCES = 'user/accounts';
  static PATH_GET_ORDER_INFO = 'orders/info';
  static PATH_GET_STATUS = 'status';
  // PRIVATE
  static PATH_FILL = 'trading/fills';
  static PATH_GET_POSITIONS = 'positions';
  static PATH_GET_OPEN_ORDERS = 'orders/open';

  constructor(opts = {}) {
    this.baseURI = `${RestApiClient.BASE_URL}/${RestApiClient.BASE_PATH}`;
    this.apiKey = opts.apiKey;

    this.api = new Frisbee({
      baseURI: this.baseURI,
      headers: this.baseHeaders(),
    });
  }

  baseHeaders() {
    return {
      Accept: 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };
  }

  authorizedRequestHeaders() {
    return {
      ...this.baseHeaders(),
      Authorization: this.apiKey,
    };
  }

  urlFor(path) {
    return `${this.baseURI}/${path}`;
  }

  async registerNewUser({ username, password, email }) {
    const body = { username, password, email };
    const url = this.urlFor(RestApiClient.PATH_REGISTER);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.baseHeaders(),
        body: JSON.stringify(body),
      });

      if (response.status === 409) {
        return 'Already Registered'
      } else if (response.status === 201) {
        console.log('REST API: Successfully registered new user.');
        return response;
      } else {
        throw new Error(`
        REST API - unexpected response status during registration: ${response.status}
        `);
      }

    } catch (error) {
      throw new Error('REST API - failure during registration: ' + error);
    }
  }

  /**
   * Uses user credentials to acquire a JWT from the Kollider
   * backend.
   */
  async login({ username, password, email }) {
    const body = {
      type: 'normal',
      username,
      password,
      email,
    };

    const url = this.urlFor(RestApiClient.PATH_LOGIN);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.baseHeaders(),
        body: JSON.stringify(body),
      });

      const json = await response.json();

      if (!json || !json.token) {
        throw new Error('REST API failure during login: ' + JSON.stringify(response));
      }

      this.apiKey = json.token;

      return this.apiKey;
    } catch (error) {
      throw new Error('REST API failure during login: ' + error);
    }
  }

  async whoAmI() {
    const url = this.urlFor(RestApiClient.PATH_GET_WHOAMI);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.authorizedRequestHeaders(),
      });
      if (response.status === 401) {
        console.log('Unauthorized');
        return false
      } else {
        return response.json();
      }
    } catch (error) {
      console.error(error);
      return false
    }
  }

  async fetchStatus() {
    const url = this.urlFor(RestApiClient.PATH_GET_STATUS);
    try {
      const response = await fetch(url, {
        method: 'GET',
      });
      return response.json();
    } catch (error) {
      throw new Error('REST API - error during `fetchStatus`: ' + error);
    }
  }

  async fetchBalances() {
    const url = this.urlFor(RestApiClient.PATH_GET_BALANCES);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.authorizedRequestHeaders(),
      });

      if (response.ok === false) {
        throw new Error(`
          Response was "not ok" during \`fetchBalances\`. Status: ' + ${response.status}
        `);
      }
      const resp = await response.json();
      return resp
    } catch (error) {
      console.error(error);
      throw new Error('REST API - error during `fetchBalances`: ' + error);
    }
  }

  async fetchProducts() {
    const url = this.urlFor(RestApiClient.PATH_PRODUCTS);

    try {
      const response = await fetch(url, {
        method: 'GET',
      });

      if (response.ok === false) {
        throw new Error(`
          Response was "not ok" during \`fetchProducts\`. Status: ' + ${response.status}
        `);
      }
      const json = await response.json();

      if (Array.isArray(json) === false && Object.keys(json).length === 0) {
        return [];
      }

      return Object.values(json).map(product => DataNormalizer.productFromPayload(product));
    } catch (error) {
      console.error(error);
      throw new Error('REST API - error during `fetchProducts`: ' + error);
    }
  }

  async fetchTicker({ symbol }) {
    const url =
      this.urlFor(RestApiClient.PATH_TICKER) +
      '?' +
      `symbol=${symbol}`
    try {
      const response = await fetch(url);

      if (response.ok === false) {
        if (response.status === 500) {
          return {
            bestBid: 0,
            bestAsk: 0,
            mid: 0,
            lastPrice: 0,
            lastQuantity: 0,
            lastSide: null
          }
        } else {
          throw new Error(`
          Response was "not ok" during \`fetchTicker\`. Status: ' + ${response.status}
        `);
        }
      }
      let res = await response.json();
      return {
        bestBid: Number(res.best_bid),
        bestAsk: Number(res.best_ask),
        mid: Number(res.mid),
        lastPrice: Number(res.last_price),
        lastSide: Number(res.last_side),
      }
    } catch (error) {
      console.error(error);
      throw new Error('REST API - error during `fetchTicker`: ' + error);
    }
  }

  async fetchPositionState({ symbol }) {
    const url =
      this.urlFor(RestApiClient.PATH_GET_POSITION_STATE) +
      '?' +
      `symbol='${symbol}'`
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.authorizedRequestHeaders(),
      });

      if (response.ok === false) {
        throw new Error(`
          Response was "not ok" during \`fetchPositionState\`. Status: ' + ${response.status}
        `);
      }
      let res = await response.json();
      return {
        symbol: res.values[0].symbol,
        entryPrice: Number(res.values[0].entry_price),
        liqPrice: Number(res.values[0].liq_price),
        leverage: Number(res.values[0].leverage),
        quantity: Number(res.values[0].quantity),
        upnl: Number(res.values[0].upnl),
      }
    } catch (error) {
      console.error(error);
      throw new Error('REST API - error during `fetchPositionState`: ' + error);
    }
  }

  async fetchTrades({ symbol, start }) {
    let url = this.urlFor(RestApiClient.PATH_FILL);
    if (symbol !== undefined) {
      url +=
        '?' +
        `symbol=${symbol}`
    }
    if (start !== undefined) {
      url += '&' +
        `offset_start=${start}`
    }
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.authorizedRequestHeaders(),
      });
      if (response.status === 404) {
        return []
      } else if (response.ok === 500) {
        throw new Error(`
          Response was "not ok" during \`fetchTrades\`. Status: ' + ${response.status}
        `);
      }
      let res = await response.json();
      return res.map(fill => DataNormalizer.fillFromPayload(fill));
    } catch (error) {
      console.log(error)
    }
  }

  async fetchOrderInfo({ order }) {
    let url = this.urlFor(RestApiClient.PATH_GET_ORDER_INFO);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.authorizedRequestHeaders(),
        body: JSON.stringify(order),
      });
      if (response.ok === false) {
        throw new Error(`
          Response was "not ok" during \`fetchFees\`. Status: ' + ${response.status}
        `);
      }
      let res = await response.json();
      return res
    } catch (error) {
      console.log(error)
    }
  }

  async fetchOpenPositions() {
    const url =
      this.urlFor(RestApiClient.PATH_GET_POSITIONS)
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.authorizedRequestHeaders(),
      });

      if (response.ok === false) {
        throw new Error(`
          Response was "not ok" during \`fetchPositionState\`. Status: ' + ${response.status}
        `);
      }
      let res = await response.json();
      let positions = {}
      Object.values(res).map(position => {
        let pos = DataNormalizer.positionStateFromPayload(position)
        if (pos.quantity > 0) {
          positions[pos.symbol] = pos
        }
      })
      return positions
    } catch (error) {
      console.error(error);
      throw new Error('REST API - error during `fetchPositionState`: ' + error);
    }
  }

  async fetchOpenOrders() {
    const url =
      this.urlFor(RestApiClient.PATH_GET_OPEN_ORDERS)
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.authorizedRequestHeaders(),
      });

      if (response.ok === false) {
        throw new Error(`
          Response was "not ok" during \`fetchPositionState\`. Status: ' + ${response.status}
        `);
      }
      let res = await response.json();
      let openOrders = []
      Object.values(res).map(openOrder => {
        let o = DataNormalizer.openOrderFromPayload(openOrder)
        openOrders.push(o)
      })
      return openOrders
    } catch (error) {
      console.error(error);
      throw new Error('REST API - error during `fetchOpenOrders`: ' + error);
    }
  }

  async fetchHistoricalProductPrices({ symbol }) {
    // TODO
  }

  async fetchHistoricalIndexPrices({ symbol, offsetStart, granularity }) {
    const url =
      this.urlFor(RestApiClient.PATH_INDEX_PRICES) +
      '?' +
      `symbol=${symbol}&` +
      `granularity=${granularity}` +
      `&offset_start=${offsetStart}`;

    try {
      const response = await fetch(url);

      if (response.ok === false) {
        if (response.status === 404) {
          return []
        }
        // throw new Error(`
        //   Response was "not ok" during \`fetchHistoricalIndexPrices\`. Status: ' + ${response.status}
        // `);
      }
      return await response.json();
    } catch (error) {
      console.error(error);
      throw new Error('REST API - error during `fetchHistoricalIndexPrices`: ' + error);
    }
  }

  async fetchUPNLHistoryForPosition(position, opts = {}) {
    if (!this.apiKey) {
      throw new Error('REST API - no `apiKey` was set before attempting an authorized request');
    }

    const granularity = opts.granularity || '30m';
    const start = opts.start || '1w';

    const url =
      this.urlFor(RestApiClient.PATH_POSITION_UPNL_HISTORY) +
      '?' +
      `symbol=${position.symbol}&` +
      `granularity=${granularity}` +
      `&start=${start}`;

    try {
      const response = await fetch(url, {
        headers: this.authorizedRequestHeaders(),
      });

      if (response.ok === false) {
        if (response.status === 404) {
          return []
        }
        else {
          throw new Error(`
          Response was "not ok" during \`fetchUPNLHistoryForPosition\`. Status: ' + ${response.status}
        `)
        }
      }
      const json = await response.json();

      if (Array.isArray(json) === false && Object.keys(json).length === 0) {
        return [];
      } else {
        return json.values;
      }
    } catch (error) {
      console.error(error);
      throw new Error('REST API - error during `fetchUPNLHistoryForPosition`: ' + error);
    }
  }
}

export default RestApiClient;
