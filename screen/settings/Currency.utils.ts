import BigNumber from 'bignumber.js';

import { type AmountInputNumberFormat, formatAmountInputForDisplay } from '../../components/AmountInput.utils';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { type FiatUnitType } from '../../models/fiatUnit';

const EXAMPLE_FIAT_AMOUNT = new BigNumber('1234.56');
const EXAMPLE_SATOSHIS = new BigNumber(100000);
const SATOSHIS_PER_BITCOIN = new BigNumber(100000000);
const BTC_FRACTION_DIGITS = 8;

export type CurrencySettingsPreview = {
  bitcoinAmount: string;
  bitcoinInFiat?: string;
  fiatAmount: string;
  fiatInBitcoin?: string;
  satoshisAmount: string;
  satoshisInFiat?: string;
};

const roundForDisplay = (value: BigNumber.Value, fractionDigits: number): string => {
  return new BigNumber(value).decimalPlaces(fractionDigits, BigNumber.ROUND_HALF_UP).toFixed();
};

const formatFiat = (
  value: BigNumber.Value,
  currency: FiatUnitType,
  numberFormat: AmountInputNumberFormat,
  fractionDigits: number,
): string => {
  const amount = formatAmountInputForDisplay(roundForDisplay(value, fractionDigits), BitcoinUnit.LOCAL_CURRENCY, numberFormat);
  return `${currency.symbol}${amount}`;
};

/** Builds the settings preview from the exact rate and the user's current native number settings. */
export const createCurrencySettingsPreview = ({
  currency,
  fractionDigits,
  numberFormat,
  rawRate,
}: {
  currency: FiatUnitType;
  fractionDigits: number;
  numberFormat: AmountInputNumberFormat;
  rawRate?: number | null;
}): CurrencySettingsPreview => {
  const bitcoinAmount = formatAmountInputForDisplay('1', BitcoinUnit.BTC, numberFormat);
  const satoshisAmount = formatAmountInputForDisplay(EXAMPLE_SATOSHIS.toFixed(), BitcoinUnit.SATS, numberFormat);
  const fiatAmount = formatFiat(EXAMPLE_FIAT_AMOUNT, currency, numberFormat, fractionDigits);
  const rate = new BigNumber(rawRate ?? Number.NaN);

  if (!rate.isFinite() || !rate.isGreaterThan(0)) {
    return { bitcoinAmount, fiatAmount, satoshisAmount };
  }

  const satoshisInFiat = rate.multipliedBy(EXAMPLE_SATOSHIS).dividedBy(SATOSHIS_PER_BITCOIN);
  const fiatInBitcoin = EXAMPLE_FIAT_AMOUNT.dividedBy(rate).decimalPlaces(BTC_FRACTION_DIGITS, BigNumber.ROUND_HALF_UP).toFixed();

  return {
    bitcoinAmount,
    bitcoinInFiat: formatFiat(rate, currency, numberFormat, fractionDigits),
    fiatAmount,
    fiatInBitcoin: formatAmountInputForDisplay(fiatInBitcoin, BitcoinUnit.BTC, numberFormat),
    satoshisAmount,
    satoshisInFiat: formatFiat(satoshisInFiat, currency, numberFormat, fractionDigits),
  };
};
