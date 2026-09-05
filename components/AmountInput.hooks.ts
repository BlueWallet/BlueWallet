import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';
import * as RNLocalize from 'react-native-localize';

import {
  type CurrencyRate,
  getCurrencyFractionDigits,
  isRateOutdated,
  mostRecentFetchedRate,
  updateExchangeRate,
} from '../blue_modules/currency';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { amountInputReducer, AmountInputSettings, createInitialAmountInputState } from './AmountInput.reducer';
import { AmountInputNumberFormat, BITCOIN_AMOUNT_NUMBER_FORMAT, createAmountInputNumberFormat } from './AmountInput.utils';

const readInputSettings = (): AmountInputSettings => {
  return {
    numberFormat: createAmountInputNumberFormat(RNLocalize.getNumberFormatSettings()),
    currencyFractionDigits: getCurrencyFractionDigits(),
  };
};

const getOutdatedRefreshRate = async () => {
  return (await isRateOutdated()) ? mostRecentFetchedRate() : undefined;
};

export const useAmountInputController = (
  unit: BitcoinUnit = BitcoinUnit.LOCAL_CURRENCY,
): {
  isRateBeingUpdated: boolean;
  outdatedRefreshRate: CurrencyRate | undefined;
  numberFormat: AmountInputNumberFormat;
  fiatNumberFormat: AmountInputNumberFormat;
  currencyFractionDigits: number;
  refreshInputSettings: () => AmountInputSettings;
  updateRate: () => void;
} => {
  const previousUnit = useRef(unit);
  const [{ isRateBeingUpdated, outdatedRefreshRate, numberFormat, currencyFractionDigits }, dispatch] = useReducer(
    amountInputReducer,
    undefined,
    () => createInitialAmountInputState(readInputSettings()),
  );

  const refreshInputSettings = useCallback(() => {
    const latestSettings = readInputSettings();
    dispatch({ type: 'inputSettingsRead', settings: latestSettings });
    return latestSettings;
  }, []);

  useEffect(() => {
    if (previousUnit.current === unit) return;
    previousUnit.current = unit;
    refreshInputSettings();
  }, [refreshInputSettings, unit]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') refreshInputSettings();
    });
    return () => subscription.remove();
  }, [refreshInputSettings]);

  useEffect(() => {
    let cancelled = false;

    const checkRate = async () => {
      try {
        const nextOutdatedRefreshRate = await getOutdatedRefreshRate();
        if (!cancelled && nextOutdatedRefreshRate) {
          dispatch({ type: 'rateCheckCompleted', outdatedRefreshRate: nextOutdatedRefreshRate });
        }
      } catch {
        // Rate availability is represented elsewhere; this state only controls
        // the optional stale-rate warning.
      }
    };

    checkRate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRateBeingUpdated) return;

    let cancelled = false;
    const refreshRate = async () => {
      let nextOutdatedRefreshRate = outdatedRefreshRate;
      try {
        await updateExchangeRate();
      } finally {
        try {
          nextOutdatedRefreshRate = await getOutdatedRefreshRate();
        } finally {
          if (!cancelled) {
            dispatch({ type: 'rateRefreshCompleted', outdatedRefreshRate: nextOutdatedRefreshRate });
          }
        }
      }
    };

    refreshRate().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isRateBeingUpdated, outdatedRefreshRate]);

  const updateRate = useCallback(() => {
    dispatch({ type: 'rateRefreshStarted' });
  }, []);

  return {
    isRateBeingUpdated,
    outdatedRefreshRate,
    numberFormat: unit === BitcoinUnit.LOCAL_CURRENCY ? numberFormat : BITCOIN_AMOUNT_NUMBER_FORMAT,
    fiatNumberFormat: numberFormat,
    currencyFractionDigits: unit === BitcoinUnit.LOCAL_CURRENCY ? currencyFractionDigits : 0,
    refreshInputSettings,
    updateRate,
  };
};
