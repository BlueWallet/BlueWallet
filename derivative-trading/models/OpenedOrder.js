import { PositionSide } from './Position';
import { getKindFromSymbol } from './Product';
import { MarginType, OrderType } from './TradingTypes';

const defaultProperties = {
  price: 0,
  quantity: 0,
  leverage: 0,
  quantityFilled: 0,
  marginType: MarginType.ISOLATED,
  orderType: OrderType.LIMIT,
  uPNL: 0,
};

export default class DerivativesTradingOpenedOrder {
  constructor(_props = {}) {
    const props = Object.assign({}, defaultProperties, _props);

    this.symbol = props.symbol;
    this.timestamp = props.timestamp;
    this.uId = props.uId;
    this.orderId = props.orderId;
    this.externalOrderId = props.externalOrderId;
    this.price = props.price;
    this.leverage = props.leverage;

    /**
     * @type {Integer}
     */
    this.quantity = props.quantity;

    /**
     * @type {Integer}
     */
    this.quantityFilled = props.quantityFilled;

    /**
     * @type {PositionSide}
     */
    this.side = props.side;

    /**
     * @type {MarginType}
     */
    this.marginType = props.marginType;

    /**
     * @type {OrderType}
     */
    this.orderType = props.orderType;
  }

  get currencyPair() {
    return this.symbol.split('.')[0];
  }

  get productKind() {
    return getKindFromSymbol(this.symbol);
  }
}

export const previewOrders = [
  new DerivativesTradingOpenedOrder({
    symbol: 'XBTUSD.CFD',
    timestamp: Date.now(),
    uId: 'preview-id-1',
    orderId: 1,
    externalOrderId: 'preview-external-order-id-1',
    price: 2353,
    leverage: 50,
    quantity: 50,
    quantityFilled: 12,
    side: PositionSide.BID,
    marginType: MarginType.ISOLATED,
    orderType: OrderType.LIMIT,
  }),
  new DerivativesTradingOpenedOrder({
    symbol: 'ZRXUSD.CFD',
    timestamp: Date.now(),
    uId: 'preview-id-2',
    orderId: 2,
    externalOrderId: 'preview-external-order-id-2',
    price: 13249,
    leverage: 100,
    quantity: 33,
    quantityFilled: 1,
    side: PositionSide.ASK,
    marginType: MarginType.CROSS,
    orderType: OrderType.MARKET,
  }),
];
