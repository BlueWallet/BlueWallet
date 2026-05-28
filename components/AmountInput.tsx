import Clipboard from '@react-native-clipboard/clipboard';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextInputSelectionChangeEvent,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import {
  CurrencyRate,
  fiatToBTC,
  getCurrencySymbol,
  isRateOutdated,
  mostRecentFetchedRate,
  satoshiToBTC,
  updateExchangeRate,
} from '../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import confirm from '../helpers/confirm';
import loc, { formatBalancePlain, formatBalanceWithoutSuffix, removeTrailingZeros } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import Badge from './Badge';
import BlueText from './BlueText';
import Icon from './Icon';
import { useTheme } from './themes';

export const conversionCache: { [key: string]: string } = {};

export const getCachedSatoshis = (amount: string): string | undefined => {
  return conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY];
};

export const setCachedSatoshis = (amount: string, sats: string): void => {
  conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] = sats;
};

const INPUT_HORIZONTAL_PADDING = 6;
const INPUT_VERTICAL_PADDING = 2;
const MAX_INPUT_WIDTH = 320;
const CRYPTO_CONTAINER_OFFSET = -12;
const SWAP_ICON_SIZE = 24;
const CHAR_FADE_IN_DURATION_MS = 240;
const CHAR_FADE_OUT_DURATION_MS = 160;
const CHAR_LAYOUT_DURATION_MS = 180;
const SIZER_LAYOUT_DURATION_MS = 200;

const androidFontPaddingStyle = Platform.OS === 'android' ? { includeFontPadding: false } : null;

const sizerLayoutTransition = LinearTransition.duration(SIZER_LAYOUT_DURATION_MS).easing(Easing.out(Easing.quad));
const charLayoutTransition = LinearTransition.duration(CHAR_LAYOUT_DURATION_MS).easing(Easing.out(Easing.quad));
const charEntering = FadeIn.duration(CHAR_FADE_IN_DURATION_MS);
const charExiting = FadeOut.duration(CHAR_FADE_OUT_DURATION_MS);

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
  /**
   * Estimated sendable amount in satoshis when MAX is selected.
   * Displayed below the MAX label. Pass null to hide.
   */
  maxSendableAmount?: number | null;
  /**
   * When true, shows ≈ prefix for maxSendableAmount (indicates estimate).
   */
  isMaxAmountEstimate?: boolean;
};

export const AmountInput: React.FC<AmountInputProps> = props => {
  const textInputRef = useRef<TextInput>(null);
  const { colors } = useTheme();
  const amount = props.amount || '0'; // internally amount is aways a string with a correct number
  const {
    onChangeText,
    unit,
    onAmountUnitChange,
    disabled = false,
    isLoading = false,
    maxSendableAmount,
    isMaxAmountEstimate,
    style: styleOverride,
    ...otherProps
  } = props;
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

  const displayAmount = useMemo(() => {
    if (amount === BitcoinUnit.MAX) {
      return loc.units.MAX;
    }

    return parseFloat(amount) >= 0 ? String(amount) : undefined;
  }, [amount]);

  const inputFontSize = useMemo(() => (amount.length > 10 ? 20 : 36), [amount.length]);

  const measureAmountText = displayAmount && displayAmount.length > 0 ? displayAmount : '0';

  const inputTextAlign = useMemo((): 'left' | 'right' | 'center' => {
    if (amount === BitcoinUnit.MAX) return 'center';
    return unit === BitcoinUnit.LOCAL_CURRENCY ? 'left' : 'right';
  }, [amount, unit]);

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

  const copyMaxEstimate = useCallback(() => {
    if (maxSendableAmount == null) return;
    const btcValue = removeTrailingZeros(new BigNumber(maxSendableAmount).dividedBy(100000000).toFixed(8));
    Clipboard.setString(btcValue);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
  }, [maxSendableAmount]);

  const handleSelectionChange = useCallback(
    (event: TextInputSelectionChangeEvent) => {
      const { selection } = event.nativeEvent;
      if (selection.start !== selection.end || selection.start !== amount.length) {
        textInputRef.current?.setNativeProps({ selection: { start: amount.length, end: amount.length } });
      }
    },
    [amount],
  );

  const isCryptoUnit = unit !== BitcoinUnit.LOCAL_CURRENCY;

  const amountCharacters = useMemo(() => measureAmountText.split(''), [measureAmountText]);

  const displayJustifyContent = useMemo((): 'flex-start' | 'flex-end' | 'center' => {
    if (inputTextAlign === 'right') return 'flex-end';
    if (inputTextAlign === 'left') return 'flex-start';
    return 'center';
  }, [inputTextAlign]);

  const inputTextColor = disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2;
  const hiddenInputTextColor = Platform.OS === 'android' ? `${inputTextColor}00` : 'transparent';

  const inputTypography = {
    fontSize: inputFontSize,
    lineHeight: Math.round(inputFontSize * 1.15),
    minHeight: Math.round(inputFontSize * 1.15) + INPUT_VERTICAL_PADDING * 2,
    textAlign: inputTextAlign,
    ...(isCryptoUnit && {
      paddingLeft: INPUT_HORIZONTAL_PADDING + 4,
    }),
  };

  const stylesHook = {
    container: {
      marginLeft: unit === BitcoinUnit.LOCAL_CURRENCY ? 0 : CRYPTO_CONTAINER_OFFSET,
    },
    localCurrency: { color: inputTextColor },
    input: {
      color: inputTextColor,
      ...inputTypography,
    },
    inputDisplay: {
      justifyContent: displayJustifyContent,
      ...(isCryptoUnit && {
        paddingLeft: INPUT_HORIZONTAL_PADDING + 4,
      }),
    },
    inputGlyph: {
      color: inputTextColor,
      fontSize: inputTypography.fontSize,
      lineHeight: inputTypography.lineHeight,
    },
    inputTransparent: {
      color: hiddenInputTextColor,
    },
    cryptoCurrency: { color: inputTextColor },
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={loc._.enter_amount} disabled={disabled} onPress={handleTextInputOnPress}>
      <View style={styles.root}>
        {!disabled && <View style={styles.sideRail} />}
        <View style={styles.flex}>
          <View style={[styles.container, stylesHook.container]}>
            {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
              <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{getCurrencySymbol()}</Text>
            )}
            {amount !== BitcoinUnit.MAX ? (
              <Animated.View layout={sizerLayoutTransition} style={styles.inputSizer}>
                <Text
                  style={[styles.input, styles.inputMeasure, stylesHook.input, androidFontPaddingStyle]}
                  numberOfLines={1}
                  allowFontScaling={false}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
                  {measureAmountText}
                </Text>
                <Animated.View layout={charLayoutTransition} style={[styles.inputDisplay, stylesHook.inputDisplay]} pointerEvents="none">
                  {amountCharacters.map((char, index) => (
                    <Animated.Text
                      key={index}
                      entering={charEntering}
                      exiting={charExiting}
                      layout={charLayoutTransition}
                      allowFontScaling={false}
                      style={[styles.inputGlyph, stylesHook.inputGlyph, androidFontPaddingStyle]}
                    >
                      {char}
                    </Animated.Text>
                  ))}
                </Animated.View>
                <TextInput
                  {...otherProps}
                  allowFontScaling={false}
                  underlineColorAndroid="transparent"
                  onSelectionChange={handleSelectionChange}
                  testID="BitcoinAmountInput"
                  keyboardType="numeric"
                  onChangeText={handleChangeText}
                  placeholder="0"
                  maxLength={maxLength}
                  ref={textInputRef}
                  editable={!isLoading && !disabled}
                  value={displayAmount}
                  placeholderTextColor={inputTextColor}
                  cursorColor={inputTextColor}
                  selectionColor={inputTextColor}
                  style={[
                    styles.input,
                    styles.inputOverlay,
                    stylesHook.input,
                    stylesHook.inputTransparent,
                    androidFontPaddingStyle,
                    styleOverride,
                  ]}
                />
              </Animated.View>
            ) : (
              <Pressable onPress={resetAmount} style={styles.maxPressable}>
                <Text numberOfLines={1} style={[styles.input, styles.maxLabel, stylesHook.input]}>
                  {BitcoinUnit.MAX}
                </Text>
                {maxSendableAmount != null && (
                  <Text style={[styles.maxEstimate, stylesHook.localCurrency]} onLongPress={copyMaxEstimate}>
                    {(isMaxAmountEstimate ? '≈ ' : '') +
                      removeTrailingZeros(new BigNumber(maxSendableAmount).dividedBy(100000000).toFixed(8)) +
                      ' ' +
                      loc.units[BitcoinUnit.BTC]}
                  </Text>
                )}
              </Pressable>
            )}
            {unit !== BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
              <Text style={[styles.cryptoCurrency, stylesHook.cryptoCurrency]}>{loc.units[unit]}</Text>
            )}
          </View>
          <View style={styles.secondaryRoot}>
            <Text style={styles.secondaryText} selectable>
              {secondaryDisplayCurrency}
            </Text>
          </View>
        </View>
        {!disabled &&
          (amount !== BitcoinUnit.MAX ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc._.change_input_currency}
              testID="changeAmountUnitButton"
              style={[styles.sideRail, styles.changeAmountUnit]}
              onPress={changeAmountUnit}
            >
              <Image source={require('../img/round-compare-arrows-24-px.png')} />
            </TouchableOpacity>
          ) : (
            <View style={styles.sideRail} />
          ))}
      </View>
      {outdatedRefreshRate && (
        <View style={styles.outdatedRateContainer}>
          <Badge badgeStyle={styles.warningBadge} />
          <View style={styles.spacing8} />
          <BlueText>{loc.formatString(loc.send.outdated_rate, { date: dayjs(outdatedRefreshRate.LastUpdated).format('l LT') })}</BlueText>
          <View style={styles.spacing8} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.refresh}
            onPress={updateRate}
            disabled={isRateBeingUpdatedLocal}
            style={isRateBeingUpdatedLocal ? styles.disabledButton : undefined}
          >
            <Icon name="arrows-rotate" type="font-awesome-6" size={16} color={colors.buttonAlternativeTextColor} />
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
  flex: {
    flex: 1,
    overflow: 'visible',
  },
  sideRail: {
    width: SWAP_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  spacing8: {
    width: 8,
  },
  warningBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fc990e',
  },
  disabledButton: {
    opacity: 0.5,
  },
  outdatedRateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: 'space-between',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 2,
    overflow: 'visible',
  },
  localCurrency: {
    fontSize: 18,
    marginRight: 2,
    fontWeight: 'bold',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  inputSizer: {
    maxWidth: MAX_INPUT_WIDTH,
    position: 'relative',
    overflow: 'visible',
  },
  input: {
    fontWeight: 'bold',
    margin: 0,
    borderWidth: 0,
    paddingHorizontal: INPUT_HORIZONTAL_PADDING,
    paddingVertical: INPUT_VERTICAL_PADDING,
  },
  inputGlyph: {
    fontWeight: 'bold',
    margin: 0,
    padding: 0,
  },
  inputMeasure: {
    opacity: 0,
  },
  inputDisplay: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INPUT_HORIZONTAL_PADDING,
    paddingVertical: INPUT_VERTICAL_PADDING,
    zIndex: 1,
  },
  inputOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  cryptoCurrency: {
    fontSize: 15,
    marginLeft: 2,
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
  maxEstimate: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  maxPressable: {
    alignItems: 'center',
    flexShrink: 0,
  },
  maxLabel: {
    flexShrink: 0,
  },
  changeAmountUnit: {
    paddingVertical: 16,
  },
});
