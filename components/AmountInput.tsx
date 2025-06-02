import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Icon, Text } from '@rneui/themed';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import {
  Image,
  LayoutAnimation,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextInputSelectionChangeEventData,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  CurrencyRate,
  fiatToBTC,
  getCurrencySymbol,
  isRateOutdated,
  mostRecentFetchedRate,
  satoshiToBTC,
  updateExchangeRate,
} from '../blue_modules/currency';
import { BlueText } from '../BlueComponents';
import confirm from '../helpers/confirm';
import loc, { formatBalancePlain, formatBalanceWithoutSuffix, removeTrailingZeros } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { useTheme } from './themes';

export const conversionCache: { [key: string]: string } = {};

export const getCachedSatoshis = (amount: string): string | undefined => {
  return conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY];
};

export const setCachedSatoshis = (amount: string, sats: string): void => {
  conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] = sats;
};

type AmountInputProps = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  /**
   * Whether the input is in a loading state
   */
  isLoading?: boolean;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * The current amount value as a string in the current unit denomination
   * e.g. '0.001' or '9.43' or '10000'
   */
  amount?: string;
  /**
   * The current unit of the amount (BTC, SATS, LOCAL_CURRENCY)
   */
  unit: BitcoinUnit;
  /**
   * Callback that returns currently typed amount in current denomination
   * e.g. 0.001 or 10000 or $9.34 (btc, sat, fiat)
   */
  onChangeText: (text: string) => void;
  /**
   * Callback that's fired to notify of currently selected denomination
   * Returns a BitcoinUnit value
   */
  onAmountUnitChange: (unit: BitcoinUnit) => void;
};

export const AmountInput: React.FC<AmountInputProps> = props => {
  const textInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();
  const amount = props.amount || '0'; // internally amount is aways a string with a correct number
  const { onChangeText, unit, onAmountUnitChange, disabled = false, isLoading = false, ...otherProps } = props;
  const [isRateBeingUpdatedLocal, setIsRateBeingUpdatedLocal] = useState(false);
  const [outdatedRefreshRate, setOutdatedRefreshRate] = useState<CurrencyRate | undefined>();

  const maxLength = useMemo(() => {
    switch (unit) {
      case BitcoinUnit.BTC:
        return 11;
      case BitcoinUnit.SATS:
        return 15;
      default:
        return 15;
    }
  }, [unit]);

  const secondaryDisplayCurrency = useMemo(() => {
    if (amount === BitcoinUnit.MAX) {
      return '';
    }
    switch (unit) {
      case BitcoinUnit.BTC: {
        const sat = new BigNumber(amount).multipliedBy(100000000).toNumber();
        return formatBalanceWithoutSuffix(sat, BitcoinUnit.LOCAL_CURRENCY, false);
      }
      case BitcoinUnit.SATS:
        return formatBalanceWithoutSuffix(Number(amount), BitcoinUnit.LOCAL_CURRENCY, false);
      case BitcoinUnit.LOCAL_CURRENCY: {
        let res: string = '';
        if (conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]) {
          // cache hit! we reuse old value that supposedly doesn't have rounding errors
          const sats = conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY];
          res = satoshiToBTC(Number(sats));
        } else {
          res = fiatToBTC(Number(amount));
        }
        res = removeTrailingZeros(res);
        return `${res} ${loc.units[BitcoinUnit.BTC]}`;
      }
    }
  }, [amount, unit]);

  useEffect(() => {
    (async () => {
      if (await isRateOutdated()) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const recent = await mostRecentFetchedRate();
        setOutdatedRefreshRate(recent);
      }
    })();
  }, []);

  const updateRate = useCallback(async () => {
    try {
      await updateExchangeRate();
    } finally {
      setIsRateBeingUpdatedLocal(false);
      if (await isRateOutdated()) {
        const recent = await mostRecentFetchedRate();
        setOutdatedRefreshRate(recent);
      } else {
        setOutdatedRefreshRate(undefined);
      }
    }
  }, []);

  const changeAmountUnit = useCallback(() => {
    let previousUnit = unit;
    let newUnit;
    // cycle through units BTC -> SAT -> LOCAL_CURRENCY -> BTC
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

    /**
     * here we must recalculate old amont value (which was denominated in `previousUnit`) to new denomination `newUnit`
     * and fill this value in input box, so user can switch between, for example, 0.001 BTC <=> 100000 sats
     */
    const log = `${amount}(${previousUnit}) ->`;
    let sats: string = '0';
    switch (previousUnit) {
      case BitcoinUnit.BTC:
        sats = new BigNumber(amount).multipliedBy(100000000).toString();
        break;
      case BitcoinUnit.SATS:
        sats = amount;
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        sats = new BigNumber(fiatToBTC(+amount)).multipliedBy(100000000).toString();
        break;
    }
    if (previousUnit === BitcoinUnit.LOCAL_CURRENCY && conversionCache[amount + previousUnit]) {
      // cache hit! we reuse old value that supposedly doesnt have rounding errors
      sats = conversionCache[amount + previousUnit];
    }

    const newInputValue = formatBalancePlain(+sats, newUnit, false);
    console.log(`${log} ${sats}(sats) -> ${newInputValue}(${newUnit})`);

    if (newUnit === BitcoinUnit.LOCAL_CURRENCY && previousUnit === BitcoinUnit.SATS) {
      // we cache conversion, so when we will need reverse conversion there wont be a rounding error
      conversionCache[newInputValue + newUnit] = amount;
    }
    onChangeText(newInputValue);
    onAmountUnitChange(newUnit);
  }, [amount, onChangeText, onAmountUnitChange, unit]);

  const handleTextInputOnPress = useCallback(() => {
    textInputRef?.current?.focus();
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
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
      } else {
        text = text.replace(/,/gi, '.');
        if (text.split('.').length > 2) {
          // too many dots. stupid code to remove all but first dot:
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
        text = text.replace(/[^\d.,-]/g, ''); // remove all but numbers, dots & commas
        text = text.replace(/(\..*)\./g, '$1');
      }
      if (text.startsWith('.')) {
        text = '0.';
      }
      onChangeText(text);
    },
    [onChangeText, unit],
  );

  const resetAmount = useCallback(async () => {
    if (await confirm(loc.send.reset_amount, loc.send.reset_amount_confirm)) {
      onChangeText('0');
    }
  }, [onChangeText]);

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      const { selection } = event.nativeEvent;
      if (selection.start !== selection.end || selection.start !== amount.length) {
        textInputRef.current?.setNativeProps({ selection: { start: amount.length, end: amount.length } });
      }
    },
    [amount],
  );

  const stylesHook = StyleSheet.create({
    center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
    localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
    input: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2, fontSize: amount.length > 10 ? 20 : 36 },
    cryptoCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
  });

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={loc._.enter_amount} disabled={disabled} onPress={handleTextInputOnPress}>
      <View style={styles.root}>
        {!disabled && <View style={[styles.center, stylesHook.center]} />}
        <View style={styles.flex}>
          <View style={styles.container}>
            {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
              <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{getCurrencySymbol() + ' '}</Text>
            )}
            {amount !== BitcoinUnit.MAX ? (
              <TextInput
                onSelectionChange={handleSelectionChange}
                testID="BitcoinAmountInput"
                keyboardType="numeric"
                onChangeText={handleChangeText}
                placeholder="0"
                maxLength={maxLength}
                ref={textInputRef}
                editable={!isLoading && !disabled}
                value={amount === BitcoinUnit.MAX ? loc.units.MAX : parseFloat(amount) >= 0 ? String(amount) : undefined}
                placeholderTextColor={disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2}
                style={[styles.input, stylesHook.input]}
                {...otherProps}
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
            <Text style={styles.secondaryText} selectable>
              {secondaryDisplayCurrency}
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
      {outdatedRefreshRate && (
        <View style={styles.outdatedRateContainer}>
          <Badge status="warning" />
          <View style={styles.spacing8} />
          <BlueText>{loc.formatString(loc.send.outdated_rate, { date: dayjs(outdatedRefreshRate.LastUpdated).format('l LT') })}</BlueText>
          <View style={styles.spacing8} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.refresh}
            onPress={updateRate}
            disabled={isRateBeingUpdatedLocal}
            style={isRateBeingUpdatedLocal ? styles.disabledButton : styles.enabledButon}
          >
            <Icon name="sync" type="font-awesome-5" size={16} color={colors.buttonAlternativeTextColor} />
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
};

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
