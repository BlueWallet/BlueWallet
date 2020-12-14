export function createHistoricalIndexPrices(opts = {}) {
  const intervalCount = opts.intervalCount || 7;
  const minPrice = 15000;
  const maxPrice = 21000;
  const varianceRange = maxPrice - minPrice;

  return Array(intervalCount)
    .fill()
    .map((_, index) => {
      const increment = Math.random() * varianceRange;

      return {
        x: index + 1,
        y: minPrice + increment,
      };
    });
}

export function minMaxYDomainFromPriceData(priceData = [], opts = {}) {
  const rangeRatio = opts.rangeRatio || 0.1;
  const prices = priceData.map(data => data.y);
  const minY = Math.min(...prices);
  const maxY = Math.max(...prices);
  const yRange = maxY - minY;

  return {
    min: minY - yRange * rangeRatio,
    max: maxY + yRange * rangeRatio,
  };
}
