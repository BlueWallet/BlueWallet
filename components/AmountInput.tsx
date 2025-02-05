import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  LayoutAnimation,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputSelectionChangeEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { Badge, Icon, Text } from '@rneui/themed';

import {
  fiatToBTC,
  getCurrencySymbol,
  isRateOutdated as checkRateOutdated,
  mostRecentFetchedRate as fetchMostRecentFetchedRate,
  satoshiToBTC,
  updateExchangeRate,
} from '../blue_modules/currency';
import { BlueText } from '../BlueComponents';
import confirm from '../helpers/confirm';
import loc, { formatBalancePlain, formatBalanceWithoutSuffix, removeTrailingZeros } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { useTheme } from './themes';

dayjs.extend(localizedFormat);

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export interface AmountInputProps {
  isLoading?: boolean;
  /**
   * The amount is a string (or number) always in the current unit denomination,
   * e.g. '0.001' or '9.43' or '10000'.
   */
  amount?: number | string;
  /**
   * Callback that returns the currently typed amount (in the current unit denomination).
   */
  onChangeText: (text?: string) => void;
  /**
   * Callback that fires when the denomination (unit) changes. It returns one of BitcoinUnit.*.
   */
  onAmountUnitChange: (newUnit: BitcoinUnit) => void;
  disabled?: boolean;
  pointerEvents?: string;
  unit: BitcoinUnit;
  onBlur?: () => void;
  onFocus?: () => void;
  // Allow any additional props to be passed to the TextInput.
  [key: string]: any;
}

// ------------------------------------------------------------------
// Conversion cache (replacing static properties)
// ------------------------------------------------------------------
const conversionCache: Record<string, string> = {};

const getCachedSatoshis = (amount: string): string | false => {
  return conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] || false;
};

const setCachedSatoshis = (amount: string, sats: string): void => {
  conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] = sats;
};

// ------------------------------------------------------------------
// Main functional component
// ------------------------------------------------------------------
const AmountInput: React.FC<AmountInputProps> = props => {
  const {
    isLoading = false,
    amount = 0,
    onChangeText,
    onAmountUnitChange,
    disabled = false,
    pointerEvents,
    unit,
    onBlur,
    onFocus,
    ...restProps
  } = props;

  const [mostRecentFetchedRate, setMostRecentFetchedRate] = useState<{ LastUpdated: Date | string | null }>({
    LastUpdated: new Date(),
  });
  const [isRateOutdated, setIsRateOutdated] = useState(false);
  const [isRateBeingUpdated, setIsRateBeingUpdated] = useState(false);
  const { colors } = useTheme();
  const textInputRef = useRef<TextInput>(null);

  // On mount, fetch the latest rate and check if it's outdated.
  useEffect(() => {
    fetchMostRecentFetchedRate()
      .then(rate => setMostRecentFetchedRate(rate))
      .finally(() => {
        checkRateOutdated().then(setIsRateOutdated);
      });
  }, []);

  // When switching denominations, convert the amount accordingly.
  const onAmountUnitChangeHandler = (previousUnit: BitcoinUnit, newUnit: BitcoinUnit) => {
    const currentAmount = amount || 0;
    let sats = '0';
    const amountStr = String(currentAmount);

    switch (previousUnit) {
      case BitcoinUnit.BTC:
        sats = new BigNumber(amountStr).multipliedBy(100000000).toString();
        break;
      case BitcoinUnit.SATS:
        sats = amountStr;
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        sats = new BigNumber(fiatToBTC(Number(currentAmount))).multipliedBy(100000000).toString();
        break;
    }
    // Use the cache when possible to avoid rounding issues.
    if (previousUnit === BitcoinUnit.LOCAL_CURRENCY && conversionCache[amountStr + previousUnit]) {
      sats = conversionCache[amountStr + previousUnit];
    }

    const newInputValue = formatBalancePlain(Number(sats), newUnit, false);
    console.log(`${amountStr}(${previousUnit}) -> ${sats}(sats) -> ${newInputValue}(${newUnit})`);

    if (newUnit === BitcoinUnit.LOCAL_CURRENCY && previousUnit === BitcoinUnit.SATS) {
      conversionCache[newInputValue + newUnit] = amountStr;
    }
    onChangeText(newInputValue);
    onAmountUnitChange(newUnit);
  };

  // Cycle through BTC -> SATS -> LOCAL_CURRENCY -> BTC.
  const changeAmountUnit = () => {
    let previousUnit = unit;
    let newUnit: BitcoinUnit;
    if (previousUnit === BitcoinUnit.BTC) {
      newUnit = BitcoinUnit.SATS;
    } else if (previousUnit === BitcoinUnit.SATS) {
      newUnit = BitcoinUnit.LOCAL_CURRENCY;
    } else if (previousUnit === BitcoinUnit.LOCAL_CURRENCY) {
      newUnit = BitcoinUnit.BTC;
    } else {
      newUnit = BitcoinUnit.BTC;
      previousUnit = BitcoinUnit.SATS;
    }
    onAmountUnitChangeHandler(previousUnit, newUnit);
  };

  const maxLength = (): number => {
    switch (unit) {
      case BitcoinUnit.BTC:
        return 11;
      case BitcoinUnit.SATS:
        return 15;
      default:
        return 15;
    }
  };

  const handleTextInputOnPress = () => {
    textInputRef.current?.focus();
  };

  const handleChangeText = (text: string) => {
    text = text.trim();
    if (unit !== BitcoinUnit.LOCAL_CURRENCY) {
      text = text.replace(',', '.');
      const split = text.split('.');
      if (split.length >= 2) {
        text = `${parseInt(split[0], 10)}.${split[1]}`;
      } else {
        text = `${parseInt(split[0], 10)}`;
      }
      text = unit === BitcoinUnit.BTC ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, '');
      if (text.startsWith('.')) {
        text = '0.';
      }
    } else if (unit === BitcoinUnit.LOCAL_CURRENCY) {
      text = text.replace(/,/gi, '.');
      if (text.split('.').length > 2) {
        // Remove extra dots – leave only the first.
        let rez = '';
        let first = true;
        for (const part of text.split('.')) {
          rez += part;
          if (first) {
            rez += '.';
            first = false;
          }
        }
        text = rez;
      }
      if (text.startsWith('0') && !(text.includes('.') || text.includes(','))) {
        text = text.replace(/^(0+)/g, '');
      }
      text = text.replace(/[^\d.,-]/g, ''); // allow only numbers, dots, commas and hyphen
      text = text.replace(/(\..*)\./g, '$1');
    }
    onChangeText(text);
  };

  const resetAmount = async () => {
    if (await confirm(loc.send.reset_amount, loc.send.reset_amount_confirm)) {
      onChangeText(undefined);
    }
  };

  const updateRate = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsRateBeingUpdated(true);
    (async () => {
      try {
        await updateExchangeRate();
        const latestRate = await fetchMostRecentFetchedRate();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setMostRecentFetchedRate(latestRate);
      } finally {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsRateBeingUpdated(false);
        setIsRateOutdated(await checkRateOutdated());
      }
    })();
  };

  const handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const { selection } = event.nativeEvent;
    const amountStr = String(amount);
    if (selection.start !== selection.end || selection.start !== amountStr.length) {
      textInputRef.current?.setNativeProps({
        selection: { start: amountStr.length, end: amountStr.length },
      });
    }
  };

  // Compute the secondary display currency.
  const amountStr = String(amount);
  let secondaryDisplayCurrency: string = String(formatBalanceWithoutSuffix(Number(amountStr), BitcoinUnit.LOCAL_CURRENCY, false));

  switch (unit) {
    case BitcoinUnit.BTC: {
      const sat = new BigNumber(amountStr).multipliedBy(100000000).toString();
      secondaryDisplayCurrency = String(formatBalanceWithoutSuffix(Number(sat), BitcoinUnit.LOCAL_CURRENCY, false));
      break;
    }
    case BitcoinUnit.SATS: {
      const num = isNaN(Number(amount)) ? 0 : Number(amount);
      secondaryDisplayCurrency = String(formatBalanceWithoutSuffix(Number(num), BitcoinUnit.LOCAL_CURRENCY, false));
      break;
    }
    case BitcoinUnit.LOCAL_CURRENCY: {
      const num = isNaN(Number(amount)) ? 0 : Number(amount);
      secondaryDisplayCurrency = fiatToBTC(num);
      if (conversionCache[String(num) + BitcoinUnit.LOCAL_CURRENCY]) {
        const sats = conversionCache[String(num) + BitcoinUnit.LOCAL_CURRENCY];
        secondaryDisplayCurrency = satoshiToBTC(Number(sats));
      }
      break;
    }
  }

  if (amount === BitcoinUnit.MAX) {
    secondaryDisplayCurrency = ''; // do not display NaN
  }

  // Dynamic styles (e.g. font size based on length)
  const stylesHook = StyleSheet.create({
    center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
    localCurrency: {
      color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2,
      fontSize: 18,
      marginHorizontal: 4,
      fontWeight: 'bold',
      alignSelf: 'center',
    },
    input: {
      color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2,
      fontSize: amountStr.length > 10 ? 20 : 36,
      fontWeight: 'bold',
    },
    cryptoCurrency: {
      color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2,
      fontSize: 15,
      marginHorizontal: 4,
      fontWeight: '600',
      alignSelf: 'center',
    },
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loc._.enter_amount}
      disabled={pointerEvents === 'none'}
      onPress={handleTextInputOnPress}
    >
      <>
        <View style={styles.root}>
          {!disabled && <View style={[styles.center, stylesHook.center]} />}
          <View style={styles.flex}>
            <View style={styles.container}>
              {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{getCurrencySymbol() + ' '}</Text>
              )}
              {amount !== BitcoinUnit.MAX ? (
                <TextInput
                  {...restProps}
                  onSelectionChange={handleSelectionChange}
                  testID="BitcoinAmountInput"
                  keyboardType="numeric"
                  onChangeText={handleChangeText}
                  onBlur={onBlur || undefined}
                  onFocus={onFocus || undefined}
                  placeholder="0"
                  maxLength={maxLength()}
                  ref={textInputRef}
                  editable={!isLoading && !disabled}
                  value={amount === BitcoinUnit.MAX ? loc.units.MAX : Number(amount) >= 0 ? String(amount) : undefined}
                  placeholderTextColor={disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2}
                  style={[styles.input, stylesHook.input]}
                />
              ) : (
                <Pressable onPress={resetAmount}>
                  <Text style={[styles.input, stylesHook.input]}>{BitcoinUnit.MAX}</Text>
                </Pressable>
              )}
              {unit !== BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                <Text style={[styles.cryptoCurrency, stylesHook.cryptoCurrency]}>{' ' + loc.units[unit]}</Text>
              )}
            </View>
            <View style={styles.secondaryRoot}>
              <Text style={styles.secondaryText}>
                {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX
                  ? removeTrailingZeros(secondaryDisplayCurrency)
                  : secondaryDisplayCurrency}
                {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX ? ` ${loc.units[BitcoinUnit.BTC]}` : null}
              </Text>
            </View>
          </View>
          {!disabled && amount !== BitcoinUnit.MAX && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc._.change_input_currency}
              testID="changeAmountUnitButton"
              style={styles.changeAmountUnit}
              onPress={changeAmountUnit}
            >
              <Image source={require('../img/round-compare-arrows-24-px.png')} />
            </TouchableOpacity>
          )}
        </View>
        {isRateOutdated && (
          <View style={styles.outdatedRateContainer}>
            <Badge status="warning" />
            <View style={styles.spacing8} />
            <BlueText>
              {loc.formatString(loc.send.outdated_rate, {
                date: dayjs(mostRecentFetchedRate.LastUpdated).format('l LT'),
              })}
            </BlueText>
            <View style={styles.spacing8} />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc._.refresh}
              onPress={updateRate}
              disabled={isRateBeingUpdated}
              style={isRateBeingUpdated ? styles.disabledButton : styles.enabledButon}
            >
              <Icon name="sync" type="font-awesome-5" size={16} color={colors.buttonAlternativeTextColor} />
            </TouchableOpacity>
          </View>
        )}
      </>
    </Pressable>
  );
};

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  center: {
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  spacing8: {
    width: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  enabledButon: {
    opacity: 1,
  },
  outdatedRateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  container: {
    flexDirection: 'row',
    alignContent: 'space-between',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 2,
  },
  localCurrency: {
    fontSize: 18,
    marginHorizontal: 4,
    fontWeight: 'bold',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  input: {
    fontWeight: 'bold',
  },
  cryptoCurrency: {
    fontSize: 15,
    marginHorizontal: 4,
    fontWeight: '600',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  secondaryRoot: {
    alignItems: 'center',
    marginBottom: 22,
  },
  secondaryText: {
    fontSize: 16,
    color: '#9BA0A9',
    fontWeight: '600',
  },
  changeAmountUnit: {
    alignSelf: 'center',
    marginRight: 16,
    paddingLeft: 16,
    paddingVertical: 16,
  },
});
export { getCachedSatoshis, setCachedSatoshis, conversionCache };
export default AmountInput;
