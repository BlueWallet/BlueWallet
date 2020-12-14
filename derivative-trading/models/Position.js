import { avatarImageMap } from "../class/AvatarUtils";
import { getKindFromSymbol, getAvatarImageFromSymbol } from "./Product";

export const PositionSide = Object.freeze({
  BID: 'Bid',
  ASK: 'Ask',
});

const defaultProperties = {
  entryPrice: 0,
  leverage: 0,
  liquidationPrice: 0,
  openOrderIDs: [],
  quantity: 0,
  side: PositionSide.BID,
  timestamp: 0,
  uPNL: 0,
};

export default class DerivativesTradingPosition {
  constructor(_props = {}) {
    const props = Object.assign({}, defaultProperties, _props);

    this.symbol = props.symbol;
    this.entryPrice = props.entryPrice;
    this.leverage = props.leverage;
    this.liquidationPrice = props.liquidationPrice;
    this.openOrderIDs = props.openOrderIDs;
    this.quantity = props.quantity;
    this.side = props.side;
    this.timestamp = props.timestamp;
    this.uID = props.uID;

    // Unrealized Profit and Loss
    this.uPNL = props.uPNL;
  }

  get currencyPair() {
    return this.symbol.split('.')[0];
  }

  get productKind() {
    return getKindFromSymbol(this.symbol);
  }

  get avatarImage() {
    return getAvatarImageFromSymbol(this.symbol);
  }
}

export const previewPositions = [
  new DerivativesTradingPosition({
    symbol: 'XBTUSD.CFD',
    entryPrice: 23584.99,
    leverage: 50,
    liquidationPrice: 22584.99,
    openOrderIDs: [3, 2, 21],
    timestamp: Date.now(),
    uID: 'preview-id-1',
    quantity: 50,
    side: PositionSide.BID,
    uPNL: 87.23,
  }),
  new DerivativesTradingPosition({
    symbol: 'ZRXUSD.CFD',
    entryPrice: 584.99,
    leverage: 75,
    liquidationPrice: 684.99,
    openOrderIDs: [],
    timestamp: Date.now(),
    uID: 'preview-id-2',
    quantity: 500,
    side: PositionSide.ASK,
    uPNL: -27.23,
  }),
];
