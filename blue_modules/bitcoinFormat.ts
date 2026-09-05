import BigNumber from 'bignumber.js';

/**
 * Stable Bitcoin amount presentation. These symbols deliberately do not come
 * from Intl or the device locale: BTC payment amounts use a decimal point and
 * sats are whole base units. Commas are only a visual grouping aid and are
 * removed before an amount leaves an input.
 */
export const BITCOIN_DECIMAL_SEPARATOR = '.';
export const BITCOIN_GROUPING_SEPARATOR = ',';
export const BITCOIN_GROUP_SIZE = 3;

export const BITCOIN_DISPLAY_FORMAT: BigNumber.Format = Object.freeze({
  decimalSeparator: BITCOIN_DECIMAL_SEPARATOR,
  groupSeparator: BITCOIN_GROUPING_SEPARATOR,
  groupSize: BITCOIN_GROUP_SIZE,
  secondaryGroupSize: 0,
});

export const formatBitcoinInteger = (value: BigNumber.Value): string => {
  return new BigNumber(value).toFormat(0, BITCOIN_DISPLAY_FORMAT);
};
