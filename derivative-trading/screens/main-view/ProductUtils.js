/**
 *
 * @param {DerivativesTradingProduct} product
 * @param {Array{DerivativesTradingPosition}} positions
 */
export function findPositionForProduct(product, positions = []) {
  return positions.find(position => position.symbol === product.symbol);
}

/**
 *
 * @param {Array{DerivativesTradingPosition}} positions
 * @param {DerivativesTradingProduct} product
 */
export function findProductForPosition(position, products = []) {
  return products.find(product => product.symbol === position.symbol);
}
