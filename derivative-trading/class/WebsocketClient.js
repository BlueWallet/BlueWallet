import ReconnectingWebSocket from 'reconnecting-websocket';
import { WS_BASE_URL } from '../constants';

// https://github.com/pladaria/reconnecting-websocket#default-values
const defaultConnectionOptions = Object.freeze({
  maxReconnectionDelay: 10000,
  minReconnectionDelay: 1000 + Math.random() * 4000,
  reconnectionDelayGrowFactor: 1.3,
  minUptime: 5000,
  connectionTimeout: 4000,
  maxRetries: Infinity,
  maxEnqueuedMessages: Infinity,
  startClosed: false,
  debug: false,
});

export class WebsocketClient {

  constructor(connectionOptions = {}, baseUrl) {
    this.baseURI = baseUrl;

    this.connectionOptions = Object.assign({}, defaultConnectionOptions, connectionOptions);
  }

  _urlFor(path) {
    return `${this.baseURI}/${path}`;
  }

  _jsonForAuthentication(token) {
    return JSON.stringify({
      type: 'authenticate',
      token,
    });
  }

  _jsonForOpenPositions() {
    return JSON.stringify({
      type: 'fetch_positions',
    });
  }

  _jsonForBalances() {
    return JSON.stringify({
      type: 'fetch_balances',
    });
  }

  _jsonForOpenOrders() {
    return JSON.stringify({
      type: 'fetch_open_orders',
    });
  }

  _jsonForPriceTicker(symbol) {
    return JSON.stringify({
      type: 'fetch_price_ticker',
      symbol,
    });
  }

  _tradableSymbols() {
    return JSON.stringify({
      type: 'fetch_tradable_symbols',
    });
  }

  /**
   * https://github.com/pladaria/reconnecting-websocket#constants
   */
  get isConnected() {
    return this.socket.readyState === 1;
  }

  connect(onOpen) {
    this.socket = new ReconnectingWebSocket(this.baseURI, [], this.connectionOptions);

    const noop = () => { };

    this.socket.addEventListener('message', this.onMessage || noop);
    this.socket.addEventListener('close', this.onClose || noop);
    this.socket.addEventListener('error', this.onError || noop);

    this.socket.addEventListener('open', () => {
      console.log('WebsocketClient - connection opened');
      onOpen();
    });
  }

  addEventListener(eventName, callback) {
    this.socket.addEventListener(eventName, callback);
  }

  removeEventListener(eventName, callback) {
    this.socket.removeEventListener(eventName, callback);
  }

  authenticate(token) {
    // console.log(`WebsocketClient -- Authenticating: ${this._jsonForAuthentication()}`);
    this.socket.send(this._jsonForAuthentication(token));
  }

  fetchOpenPositions() {
    this.socket.send(this._jsonForOpenPositions());
  }

  fetchBalances() {
    this.socket.send(this._jsonForBalances());
  }

  fetchProducts() {
    this.socket.send(this._tradableSymbols());
  }

  fetchOpenOrders() {
    this.socket.send(this._jsonForOpenOrders());
  }

  fetchTicker(symbol) {
    this.socket.send(this._jsonForPriceTicker(symbol));
  }

  /**
   * You can subscribe to as many channels as you want, for multiple symbols at time.
   *
   * 📝 NOTE: For more fine-grained control, it's probably better to use separate calls.
   * For example, call this once to subscribe to `XBTUSD.CFD` on the `matches` channel,
   * again to subscribe to `XBTUSD.CFD` and `LTCUSD.CFD` on
   * the `ticker` channel.
   */
  subscribeToChannels({ channels, symbols }) {
    const json = JSON.stringify({
      type: 'subscribe',
      channels: channels,
      symbols: symbols,
    });
    this.socket.send(json);
  }

  unsubscribeFromChannels({ channels, symbols }) {
    const json = JSON.stringify({
      type: 'unsubscribe',
      channels: channels,
      symbols: symbols,
    });
    this.socket.send(json);
  }

  /**
   * @param {DerivativesTradingPlacedOrderPayload} placedOrderPayload
   */
  placeOrder(payload) {
    const json = JSON.stringify({
      type: 'order',
      order: payload,
    });

    this.socket.send(json);
  }

  /**
   * @param {DerivativesTradingCancelledOrderPayload} payload
   */
  cancelOrder(payload) {
    const json = JSON.stringify({
      type: 'cancel_order',
      cancel_order: payload,
    });

    this.socket.send(json);
  }

  withdrawalRequest(invoice, amount) {
    const json = JSON.stringify({
      type: 'withdrawal_request',
      withdrawal_request: {
        Ln: {
          payment_request: invoice,
          amount: parseFloat(amount)
        }
      }
    });
    this.socket.send(json);
  }

  /**
   * Closes the WebSocket connection or connection attempt, if any.
   * If the connection is already CLOSED, this method does nothing.
   * @param {string?} code
   * @param {string?} reason
   * @see https://github.com/pladaria/reconnecting-websocket#methods
   */
  closeSocket(code, reason) {
    this.socket.close(code, reason);
  }

  /**
   * Closes the WebSocket connection or connection attempt and connects again.
   * This also resets the retry counter;
   * @param {string?} code
   * @param {string?} reason
   * @see https://github.com/pladaria/reconnecting-websocket#methods
   */
  reconnectSocket(code, reason) {
    this.socket.reconnect(code, reason);
  }
}

export default WebsocketClient;
