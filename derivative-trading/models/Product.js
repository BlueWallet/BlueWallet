import { avatarImageMap } from '../class/AvatarUtils';

export const ProductKind = Object.freeze({
  CFD: 'CFD',
  PERPETUAL: 'PERPETUAL',
  QUANTO: 'QUANTO',
  UNKNOWN: 'UNKNOWN',
});

export function getKindFromSymbol(symbol) {
  switch (symbol.split('.').pop()) {
    case 'CFD':
      return ProductKind.CFD;
    case 'Q':
      return ProductKind.QUANTO;
    case 'P':
      return ProductKind.PERPETUAL;
    default:
      return ProductKind.UNKNOWN;
  }
}

export function getAvatarImageFromSymbol(symbol) {
  const currencyPair = symbol.split('.')[0];

  if (avatarImageMap.has(currencyPair)) {
    return avatarImageMap.get(currencyPair);
  } else {
    return avatarImageMap.get('BTCUSD');
  }
}

const defaultProperties = {
  contractSize: 1,
  maxLeverage: 1,
  baseMargin: 0,
  maintenanceMargin: 0,
  isInversePriced: false,
  priceDecimalPoints: 3,
  lastPrice: null,
};

class DerivativesTradingProduct {
  constructor(_props = {}) {
    const props = Object.assign({}, defaultProperties, _props);
    this.symbol = props.symbol;
    this.contractSize = Number(props.contractSize);
    this.maxLeverage = Number(props.maxLeverage);
    this.baseMargin = Number(props.baseMargin);
    this.maintenanceMargin = Number(props.maintenanceMargin);
    this.isInversePriced = Number(props.isInversePriced);
    this.priceDecimalPoints = Number(props.priceDecimalPoints);
    this.underlyingSymbol = props.underlyingSymbol;
    this.lastPrice = Number(props.lastPrice);
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

DerivativesTradingProduct.deserialize = json => {
  return new DerivativesTradingProduct({
    symbol: json.symbol,
    contractSize: Number(json.contract_size),
    maxLeverage: Number(json.max_leverage),
    baseMargin: Number(json.base_margin),
    maintenanceMargin: Number(json.maintenance_margin),
    isInversePriced: json.is_inverse_priced,
    priceDecimalPoints: Number(json.price_dp),
    underlyingSymbol: json.underlying_symbol,
    lastPrice: Number(json.last_price),
  });
};

export default DerivativesTradingProduct;
