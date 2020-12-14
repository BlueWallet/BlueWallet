import { PositionSide } from '../models/Position';

export const SATOSHIS_IN_BTC = Math.pow(10, 8);

export function convertedToSats(btc) {
  return btc * SATOSHIS_IN_BTC;
}

export function calculateOrderValueForProduct(product, quantity, entryPrice) {
  const { isInversePriced, contractSize } = product;
  const priceMultiplier = isInversePriced ? 1 / entryPrice : entryPrice;

  // 🔑 Non-inversely priced contracts are denominated in Sats.
  // But for inversely price contracts, we'll need to manually adjust.
  const satsMultiplier = isInversePriced ? SATOSHIS_IN_BTC : 1.0;

  return quantity * contractSize * priceMultiplier * satsMultiplier;
}

/**
 * Computes how much the user is going to spend on an order.
 */
export function calculateOrderCostForProduct(product, quantity, entryPrice, leverage) {
  return (calculateOrderValueForProduct(product, quantity, entryPrice) / leverage).toFixed(0);
}

function calculateExitPriceFromMarginAndEntry(opts = {}) {
  const { margin, entryPrice, side, quantity, product } = opts;

  if (quantity === 0) {
    return 0;
  }

  const { contractSize, isInversePriced } = product;
  const sign = side === PositionSide.BID ? 1 : -1;
  const multipliedContractValue = sign * quantity * contractSize;

  if (isInversePriced) {
    const x = margin / SATOSHIS_IN_BTC;
    const notionalContractValue = multipliedContractValue / entryPrice;

    // 📝 NOTE: This happens when there is no liquidation price. This only happens when a user
    // goes short with 1x leverage.
    if (x === notionalContractValue) {
      return 0;
    }

    return -multipliedContractValue / (x - notionalContractValue);
  }

  return entryPrice + margin / multipliedContractValue;
}

/**
 * Calculates the price at which a user's position would get liquidated.
 */
export function calculateLiquidationPriceFromMarginAndFees(opts = {}) {
  const { initialMargin, feesInfo, fundingRate, entryPrice, side, quantity, product } = opts;
  const { maintenanceMargin } = product;
  const { taker: takerFee } = feesInfo;
  const sign = side === PositionSide.BID ? 1 : -1;

  const bankruptcyPrice = calculateExitPriceFromMarginAndEntry({ margin: initialMargin, entryPrice, side, quantity, product });

  const bankruptcyValue = calculateOrderValueForProduct(product, quantity, bankruptcyPrice);
  const entryValue = calculateOrderValueForProduct(product, quantity, entryPrice);

  const newMaintenanceMargin = entryValue * maintenanceMargin + (takerFee + sign * fundingRate) * bankruptcyValue;

  return calculateExitPriceFromMarginAndEntry({
    margin: -(initialMargin - newMaintenanceMargin),
    entryPrice,
    side,
    quantity,
    product,
  });
}

export function calculateTradingFees(orderValue, feesInfo = { maker: 0, taker: 0 }, isMaker) {
  return orderValue * (isMaker ? feesInfo.maker : feesInfo.taker);
}

export function calculatePnl(entryPrice, exitPrice, quantity, side, product) {
  let sign = side === 'Ask' ? -1 : 1;
  if (product.isInversePriced) {
    return sign * (calculateOrderValueForProduct(product, quantity, entryPrice) - calculateOrderValueForProduct(product, quantity, exitPrice))
  }
  return sign * (calculateOrderValueForProduct(product, quantity, exitPrice) - calculateOrderValueForProduct(product, quantity, entryPrice))
}

export function calculateRequiredMargin(entryPrice, quantity, leverage, product, side, currentPosition) {
  if (currentPosition !== undefined && currentPosition.side !== side) {
    if (currentPosition.quantity >= quantity) {
      return 0
    } else {
      return calculateOrderCostForProduct(product, quantity, entryPrice, leverage)
    }
  } else {
    return calculateOrderCostForProduct(product, quantity, entryPrice, leverage)
  }
}