import { getCurrencies } from "react-native-localize";
import { avatarImageMap } from './AvatarUtils';

const RESPONSE_TYPE_OPEN_ORDERS = 'open_orders';
const RESPONSE_TYPE_ORDER_REJECTION = 'order_rejection';
const RESPONSE_TYPE_ORDER_RECEIVED = 'received';
const RESPONSE_TYPE_USER_ACCOUNTS = 'user_accounts';
const RESPONSE_TYPE_USER_POSITIONS = 'user_positions';
const RESPONSE_TYPE_POSITION_STATE = 'position_state';
const RESPONSE_TYPE_ORDER_INVOICE = 'order_invoice';
const RESPONSE_TYPE_ORDER_OPENED = 'open';
const RESPONSE_TYPE_ORDER_FILL = 'fill';
const RESPONSE_TYPE_ORDER_DONE = 'done';
const RESPONSE_TYPE_AUTHENTICATION = 'authentication';
const RESPONSE_TYPE_TICKER = 'ticker';
const RESPONSE_TYPE_SETTLEMENT_REQUEST = 'settlement_request';
const RESPONSE_TYPE_WITHDRAWAL_SUCCESS = 'withdrawal_success';
const RESPONSE_TYPE_TRADABLE_SYMBOLS = 'tradable_symbols';
const RESPONSE_TYPE_ERROR = 'error';

export const OrderDoneReason = Object.freeze({
    FILL: 'Fill',
    CANCEL: 'Cancel',
    SELF_TRADE: 'SelfTrade',
});

export const APIResponseType = Object.freeze({
    OPEN_ORDERS: RESPONSE_TYPE_OPEN_ORDERS,
    ORDER_REJECTION: RESPONSE_TYPE_ORDER_REJECTION,
    ORDER_RECEIVED: RESPONSE_TYPE_ORDER_RECEIVED,
    USER_ACCOUNTS: RESPONSE_TYPE_USER_ACCOUNTS,
    USER_POSITIONS: RESPONSE_TYPE_USER_POSITIONS,
    POSITION_STATE: RESPONSE_TYPE_POSITION_STATE,
    ORDER_INVOICE: RESPONSE_TYPE_ORDER_INVOICE,
    ORDER_OPENED: RESPONSE_TYPE_ORDER_OPENED,
    ORDER_DONE: RESPONSE_TYPE_ORDER_DONE,
    WITHDRAWAL_SUCCESS: RESPONSE_TYPE_WITHDRAWAL_SUCCESS,
    AUTHENTICATION: RESPONSE_TYPE_AUTHENTICATION,
    TICKER: RESPONSE_TYPE_TICKER,
    SETTLEMENT_REQUEST: RESPONSE_TYPE_SETTLEMENT_REQUEST,
    FILL: RESPONSE_TYPE_ORDER_FILL,
    TRADABLE_SYMBOLS: RESPONSE_TYPE_TRADABLE_SYMBOLS,
    ERROR: RESPONSE_TYPE_ERROR,
});

const apiResponseTypeMap = new Map([
    [RESPONSE_TYPE_OPEN_ORDERS, APIResponseType.OPEN_ORDERS],
    [RESPONSE_TYPE_ORDER_REJECTION, APIResponseType.ORDER_REJECTION],
    [RESPONSE_TYPE_ORDER_RECEIVED, APIResponseType.ORDER_RECEIVED],
    [RESPONSE_TYPE_USER_ACCOUNTS, APIResponseType.USER_ACCOUNTS],
    [RESPONSE_TYPE_USER_POSITIONS, APIResponseType.USER_POSITIONS],
    [RESPONSE_TYPE_POSITION_STATE, APIResponseType.POSITION_STATE],
    [RESPONSE_TYPE_ORDER_INVOICE, APIResponseType.ORDER_INVOICE],
    [RESPONSE_TYPE_ORDER_OPENED, APIResponseType.ORDER_OPENED],
    [RESPONSE_TYPE_ORDER_DONE, APIResponseType.ORDER_DONE],
    [RESPONSE_TYPE_WITHDRAWAL_SUCCESS, APIResponseType.WITHDRAWAL_SUCCESS],
    [RESPONSE_TYPE_TICKER, APIResponseType.TICKER],
    [RESPONSE_TYPE_AUTHENTICATION, APIResponseType.AUTHENTICATION],
    [RESPONSE_TYPE_SETTLEMENT_REQUEST, APIResponseType.SETTLEMENT_REQUEST],
    [RESPONSE_TYPE_ORDER_FILL, APIResponseType.FILL],
    [RESPONSE_TYPE_TRADABLE_SYMBOLS, APIResponseType.TRADABLE_SYMBOLS],
    [RESPONSE_TYPE_ERROR, APIResponseType.ERROR],
]);

export const symbolColors = Object.freeze({
    LTCUSD: '#b8b8b8',
    'LTCUSD.CFD': '#b8b8b8',
    XBTUSD: '#f2a900',
    'XBTUSD.CFD': '#f2a900',
    ETHUSD: '#3c3c3d',
    'ETHUSD.CFD': '#3c3c3d',
})

export const Side = Object.freeze({
    BID: 'Bid',
    ASK: 'Ask',
});

export const MarginType = Object.freeze({
    ISOLATED: 'Isolated',
    CROSS: 'Cross',
});

export const OrderTypes = Object.freeze({
    LIMIT: 'Limit',
    MARKET: 'Market',
});

const getCurrencyPair = (symbol) => {
    return symbol.split('.')[0];
}

const getAvatarImageFromSymbol = (symbol) => {
    const currencyPair = symbol.split('.')[0];
    if (avatarImageMap.has(currencyPair)) {
        return avatarImageMap.get(currencyPair);
    } else {
        return avatarImageMap.get('XBTUSD');
    }
}

export default class DataNormalizer {

    static dataFromWsMessage(wsMessage) {
        return wsMessage.data
    }

    static typeFromWsMessage(wsMessage) {
        return wsMessage.type
    }

    static isResponseOk(apiResponse = {}) {
        return apiResponse.type !== 'error' && apiResponse.data !== undefined;
    }

    static getAPIResponseType(apiResponse = {}) {
        return apiResponseTypeMap.get(apiResponse.type);
    }

    static orderFromPayload(payload) {
        return {
            orderId: payload.order_id,
            quantity: Number(payload.quantity),
            leverage: Number(payload.leverage),
            price: Number(payload.price),
            filled: Number(payload.filled),
            timestamp: Number(payload.timestamp),
            side: payload.side,
            symbol: payload.symbol,
            marginType: payload.margin_type,
            orderType: payload.order_type,
        }
    }

    static orderRejectionFromPayload(payload) {
        return {
            order: this.orderFromPayload(payload.order),
            reason: payload.reason
        }
    }

    static tickerFromPayload(payload) {
        return {
            bestAsk: Number(payload.best_ask),
            bestBid: Number(payload.best_bid),
            mid: Number(payload.mid),
            lastPrice: Number(payload.last_price),
            lastQuantity: Number(payload.last_quantity),
            lastSide: Number(payload.last_side),
            symbol: payload.symbol,
        }
    }

    static positionStateFromPayload(payload) {
        return {
            entryPrice: Number(payload.entry_price),
            leverage: Number(payload.leverage),
            upnl: Number(payload.upnl),
            quantity: Number(payload.quantity),
            symbol: payload.symbol,
            side: payload.side,
            openOrderIds: payload.open_order_ids,
            liqPrice: Number(payload.liq_price),
        }
    }

    static productFromPayload(payload) {
        return {
            symbol: payload.symbol,
            currencyPair: getCurrencyPair(payload.symbol),
            contractSize: Number(payload.contract_size),
            maxLeverage: Number(payload.max_leverage),
            baseMargin: Number(payload.base_margin),
            maintenanceMargin: Number(payload.maintenance_margin),
            isInversePriced: payload.is_inverse_priced,
            priceDp: Number(payload.price_dp),
            underlyingSymbol: payload.underlying_symbol,
            lastPrice: Number(payload.last_price),
            avatarImage: getAvatarImageFromSymbol(payload.symbol),
            tickSize: Number(payload.tick_size),
            color: symbolColors[payload.symbol],
        }
    }

    static orderInvoiceFromPayload(payload) {
        return {
            invoice: payload.invoice,
            margin: payload.margin,
            orderId: payload.order_id,
        }
    }

    static settlementRequestFromPayload(payload) {
        return {
            amount: Number(payload.amount),
            requestId: payload.requestId,
            symbol: payload.symbol,
            side: payload.side,
        }
    }

    static fillFromPayload(payload) {
        return {
            extOrderId: payload.ext_order_id,
            isMaker: payload.is_maker,
            leverage: payload.leverage,
            marginType: payload.margin_type,
            isLiquidation: payload.is_liquidation,
            settlementType: payload.settlement_type,
            orderId: payload.order_id,
            side: payload.side,
            symbol: payload.symbol,
            partial: payload.partial,
            remaining: payload.remaining,
            price: payload.price,
            quantity: payload.quantity,
        }
    }

    static doneFromPayload(payload) {
        return {
            orderId: payload.order_id,
            symbol: payload.symbol,
            reason: payload.reason
        }
    }

    static openOrderFromPayload(payload) {
        return {
            symbol: payload.symbol,
            timestamp: payload.timestamp,
            uID: Number(payload.uid),
            orderId: Number(payload.order_id),
            externalOrderId: payload.ext_order_id,
            quantity: Number(payload.quantity),
            quantityFilled: Number(payload.filled),
            leverage: Number(payload.leverage),
            price: Number(payload.price),
            marginType: payload.margin_type,
            orderType: payload.order_type,
            side: payload.side,
        }
    }

    static orderInfoFromPayload(payload) {
        return {
            marginRequired: Number(payload.margin_required),
            value: Number(payload.value),
            exchangeFee: Number(payload.exchange_fee),
            estimatedLiquidationPrice: Number(payload.estimated_liquidation_price),
        }
    }

    static receivedFromPayload(payload) {
        return {
            externalOrderID: data.ext_order_id,
            symbol: data.symbol,
            timestamp: data.timestamp,
            leverage: Number(data.leverage),
            quantity: Number(data.quantity),
            price: Number(data.price),
        }
    }
}

