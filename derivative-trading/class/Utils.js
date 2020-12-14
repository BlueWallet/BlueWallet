export const satoshiMultipler = Math.pow(10, 8);

export const toSatoshis = (amount, rate) => {
    return amount / (rate / satoshiMultipler)
}

export const toDollars = (amount, rate) => {
    return rate * (amount / satoshiMultipler)
}

export const priceToDollars = (price, product) => {
    return formatCurrencyValue(price / Math.pow(10, product.priceDp))
}

export const bankerRound = (num, decimalPlaces) => {
    let d = decimalPlaces || 0;
    let m = Math.pow(10, d);
    let n = +(d ? num * m : num).toFixed(8); // Avoid rounding errors
    let i = Math.floor(n), f = n - i;
    let e = 1e-8; // Allow for rounding errors in f
    let r = (f > 0.5 - e && f < 0.5 + e) ?
        ((i % 2 == 0) ? i : i + 1) : Math.round(n);
    return d ? r / m : r;
}

export const getPairFromSymbol = (symbol) => {
    return symbol.split('.')[0]
}

export const formatCurrencyValue = (value) => {
    if (value > 1) {
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } else {
        return value.toString();
    }
}

export const satsToDollars = (sats, btcRate) => {
    return (sats / satoshiMultipler) * btcRate
}

export const convertYDataRange = (data) => {
    let min = 100000000000000000000000000;
    let max = 0
    data.map(data => {
        if (data.y > max) {
            max = data.y
        }
        if (data.y < min) {
            min = data.y
        }
    });
    return [min, max]
}

export const splitSymbol = (symbol) => {
    return symbol.substring(3);
}

export const convertToChartData =(priceData = []) => {
  let largest = 0;
  let smallest = 100000000000;
  let data = priceData.map(item => {
    if (item.mean > largest) {
      largest = item.mean;
    }
    if (item.mean < smallest) {
      smallest = item.mean;
    }
    return {
      x: new Date(item.time * 1000),
      y: item.mean,
    };
  });
  return {
    data: data,
    low: smallest,
    high: largest,
    open: priceData[0].mean,
    close: priceData[priceData.length - 1].mean,
  }
}