import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { useLocale } from '@react-navigation/native';
import {
  AccessibilityInfo,
  Text,
  Image,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Badge from './Badge';
import Icon from './Icon';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';

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

const DEFAULT_AMOUNT_VALUE = '0';
const INPUT_PLACEHOLDER = '0';
const NUMERIC_KEYBOARD_TYPE: TextInputProps['keyboardType'] = 'numeric';
const UNIT_SWITCH_SLOT_WIDTH = 60;

const AMOUNT_MAX_LENGTH_BY_UNIT: Record<BitcoinUnit, number> = {
  [BitcoinUnit.BTC]: 11,
  [BitcoinUnit.SATS]: 15,
  [BitcoinUnit.LOCAL_CURRENCY]: 15,
  [BitcoinUnit.MAX]: 15,
};

const UNIT_SWITCH_SEQUENCE: readonly BitcoinUnit[] = [BitcoinUnit.BTC, BitcoinUnit.SATS, BitcoinUnit.LOCAL_CURRENCY] as const;

const getNextAmountUnit = (currentUnit: BitcoinUnit): BitcoinUnit => {
  const currentIndex = UNIT_SWITCH_SEQUENCE.indexOf(currentUnit);
  if (currentIndex === -1) return BitcoinUnit.BTC;
  return UNIT_SWITCH_SEQUENCE[(currentIndex + 1) % UNIT_SWITCH_SEQUENCE.length];
};

const AMOUNT_INPUT_ACTIONS = {
  SET_RATE_LOADING: 'SET_RATE_LOADING',
  SET_OUTDATED_RATE: 'SET_OUTDATED_RATE',
  CLEAR_OUTDATED_RATE: 'CLEAR_OUTDATED_RATE',
} as const;

type AmountInputState = {
  isRateBeingUpdatedLocal: boolean;
  outdatedRefreshRate?: CurrencyRate;
};

type AmountInputAction =
  | {
      type: typeof AMOUNT_INPUT_ACTIONS.SET_RATE_LOADING;
      payload: boolean;
    }
  | {
      type: typeof AMOUNT_INPUT_ACTIONS.SET_OUTDATED_RATE;
      payload: CurrencyRate;
    }
  | {
      type: typeof AMOUNT_INPUT_ACTIONS.CLEAR_OUTDATED_RATE;
    };

const INITIAL_AMOUNT_INPUT_STATE: AmountInputState = {
  isRateBeingUpdatedLocal: false,
  outdatedRefreshRate: undefined,
};

const amountInputReducer = (state: AmountInputState, action: AmountInputAction): AmountInputState => {
  switch (action.type) {
    case AMOUNT_INPUT_ACTIONS.SET_RATE_LOADING:
      return {
        ...state,
        isRateBeingUpdatedLocal: action.payload,
      };
    case AMOUNT_INPUT_ACTIONS.SET_OUTDATED_RATE:
      return {
        ...state,
        outdatedRefreshRate: action.payload,
      };
    case AMOUNT_INPUT_ACTIONS.CLEAR_OUTDATED_RATE:
      return {
        ...state,
        outdatedRefreshRate: undefined,
      };
    default:
      return state;
  }
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
  const { width: screenWidth } = useWindowDimensions();
  const { direction } = useLocale();
  const isRTL = direction === 'rtl';
  const {
    amount: amountProp,
    onChangeText,
    unit,
    onAmountUnitChange,
    disabled = false,
    isLoading = false,
    maxSendableAmount,
    isMaxAmountEstimate,
    ...otherProps
  } = props;
  const amount = amountProp || DEFAULT_AMOUNT_VALUE; // internally amount is always a string with a correct number
  const [state, dispatch] = useReducer(amountInputReducer, INITIAL_AMOUNT_INPUT_STATE);

  const unitDisplayLabel = useMemo(() => {
    if (unit === BitcoinUnit.BTC) return loc.units[BitcoinUnit.BTC];
    if (unit === BitcoinUnit.SATS) return loc.units[BitcoinUnit.SATS];
    return getCurrencySymbol();
  }, [unit]);

  const amountFontSize = useMemo(() => {
    const length = amount?.length ?? 0;
    const widthPenalty = screenWidth < 340 ? 2 : screenWidth < 375 ? 1 : 0;

    let baseSize = 36;
    if (amount === BitcoinUnit.MAX) {
      baseSize = 36;
    } else if (length > 12) {
      baseSize = 20;
    } else if (length > 10) {
      baseSize = 24;
    }

    return Math.max(18, baseSize - widthPenalty);
  }, [amount, screenWidth]);

  const unitFontSize = useMemo(() => {
    return 15;
  }, []);

  const symbolFontSize = useMemo(() => {
    return 18;
  }, []);
  const isNarrowScreen = useMemo(() => screenWidth < 380, [screenWidth]);

  const maxLength = useMemo(() => AMOUNT_MAX_LENGTH_BY_UNIT[unit] ?? AMOUNT_MAX_LENGTH_BY_UNIT[BitcoinUnit.BTC], [unit]);

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
    let isMounted = true;

    (async () => {
      if (await isRateOutdated()) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const recent = await mostRecentFetchedRate();
        if (isMounted) {
          dispatch({ type: AMOUNT_INPUT_ACTIONS.SET_OUTDATED_RATE, payload: recent });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateRate = useCallback(async () => {
    if (state.isRateBeingUpdatedLocal) return;
    dispatch({ type: AMOUNT_INPUT_ACTIONS.SET_RATE_LOADING, payload: true });
    try {
      await updateExchangeRate();
      try {
        if (await isRateOutdated()) {
          const recent = await mostRecentFetchedRate();
          dispatch({ type: AMOUNT_INPUT_ACTIONS.SET_OUTDATED_RATE, payload: recent });
        } else {
          dispatch({ type: AMOUNT_INPUT_ACTIONS.CLEAR_OUTDATED_RATE });
        }
      } catch {
        // Silently ignore rate-check failures; the loading flag will still be cleared below
      }
    } finally {
      dispatch({ type: AMOUNT_INPUT_ACTIONS.SET_RATE_LOADING, payload: false });
    }
  }, [state.isRateBeingUpdatedLocal]);

  const changeAmountUnit = useCallback(() => {
    let previousUnit = unit;
    if (!UNIT_SWITCH_SEQUENCE.includes(previousUnit)) {
      previousUnit = BitcoinUnit.SATS;
    }
    const newUnit = getNextAmountUnit(previousUnit);

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
    const announcedUnit = newUnit === BitcoinUnit.LOCAL_CURRENCY ? getCurrencySymbol() : loc.units[newUnit];
    AccessibilityInfo.announceForAccessibility(`${loc._.change_input_currency}. ${announcedUnit}`);
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
        text = text.replace(/[^\d.,]/g, ''); // remove all but numbers, dots & commas
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
      AccessibilityInfo.announceForAccessibility(loc.send.reset_amount);
    }
  }, [onChangeText]);

  const copyMaxEstimate = useCallback(() => {
    if (maxSendableAmount == null) return;
    const btcValue = removeTrailingZeros(new BigNumber(maxSendableAmount).dividedBy(100000000).toFixed(8));
    Clipboard.setString(btcValue);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    AccessibilityInfo.announceForAccessibility(loc.wallets.xpub_copiedToClipboard);
  }, [maxSendableAmount]);

  const stylesHook = StyleSheet.create({
    sideSlot: { width: screenWidth < 360 ? 52 : UNIT_SWITCH_SLOT_WIDTH },
    localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
    input: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2, fontSize: amountFontSize },
    cryptoCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
    outdatedRateContainer: {
      flexDirection: isNarrowScreen ? 'column' : 'row',
      alignItems: 'center',
      marginHorizontal: isNarrowScreen ? 12 : 16,
      marginVertical: 16,
      rowGap: isNarrowScreen ? 8 : 0,
      columnGap: isNarrowScreen ? 0 : 8,
    },
    outdatedRateText: {
      flexShrink: 1,
      textAlign: 'center',
      width: isNarrowScreen ? '100%' : undefined,
      writingDirection: direction,
    },
  });

  return (
    <Pressable accessible={false} disabled={disabled} onPress={handleTextInputOnPress}>
      <View style={[styles.root, ...(isRTL ? [styles.rtlRoot] : [])]}>
        <View style={[styles.sideSlot, stylesHook.sideSlot]} />
        <View style={styles.flex}>
          <View style={styles.container}>
            {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
              <Text style={[styles.localCurrency, stylesHook.localCurrency, { fontSize: symbolFontSize }]}>
                {getCurrencySymbol() + ' '}
              </Text>
            )}
            {amount !== BitcoinUnit.MAX ? (
              <TextInput
                testID="BitcoinAmountInput"
                keyboardType={NUMERIC_KEYBOARD_TYPE}
                onChangeText={handleChangeText}
                placeholder={INPUT_PLACEHOLDER}
                maxLength={maxLength}
                ref={textInputRef}
                editable={!isLoading && !disabled}
                value={String(amount)}
                placeholderTextColor={disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2}
                style={[styles.input, stylesHook.input]}
                allowFontScaling
                maxFontSizeMultiplier={2}
                accessibilityLabel={loc._.enter_amount}
                accessibilityValue={{ text: `${amount} ${unitDisplayLabel}` }}
                {...otherProps}
              />
            ) : (
              <Pressable
                onPress={resetAmount}
                style={styles.maxPressable}
                accessibilityRole="button"
                accessibilityLabel={loc.units.MAX}
                accessibilityHint={loc.send.reset_amount}
              >
                <Text allowFontScaling maxFontSizeMultiplier={1.6} style={[styles.input, stylesHook.input]}>
                  {BitcoinUnit.MAX}
                </Text>
                {maxSendableAmount != null && (
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    allowFontScaling
                    maxFontSizeMultiplier={1.4}
                    style={[styles.maxEstimate, stylesHook.localCurrency]}
                    onLongPress={copyMaxEstimate}
                  >
                    {(isMaxAmountEstimate ? '≈ ' : '') +
                      removeTrailingZeros(new BigNumber(maxSendableAmount).dividedBy(100000000).toFixed(8)) +
                      ' ' +
                      loc.units[BitcoinUnit.BTC]}
                  </Text>
                )}
              </Pressable>
            )}
            {unit !== BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
              <Text
                allowFontScaling
                maxFontSizeMultiplier={1.4}
                style={[styles.cryptoCurrency, stylesHook.cryptoCurrency, { fontSize: unitFontSize }]}
              >
                {' ' + loc.units[unit]}
              </Text>
            )}
          </View>
          <View style={styles.secondaryRoot}>
            <Text
              style={[styles.secondaryText, { writingDirection: direction }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.9}
              allowFontScaling
              maxFontSizeMultiplier={1.5}
              selectable
            >
              {secondaryDisplayCurrency}
            </Text>
          </View>
        </View>
        <View style={[styles.sideSlot, stylesHook.sideSlot]}>
          {!disabled && amount !== BitcoinUnit.MAX && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc._.change_input_currency}
              accessibilityHint={`${loc._.change_input_currency}. ${unitDisplayLabel}`}
              testID="changeAmountUnitButton"
              style={styles.changeAmountUnit}
              onPress={changeAmountUnit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Image source={require('../img/round-compare-arrows-24-px.png')} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {state.outdatedRefreshRate && (
        <View style={[styles.outdatedRateContainer, stylesHook.outdatedRateContainer]}>
          <Badge badgeStyle={styles.warningBadge} />
          <BlueText style={stylesHook.outdatedRateText}>
            {loc.formatString(loc.send.outdated_rate, { date: dayjs(state.outdatedRefreshRate.LastUpdated).format('l LT') })}
          </BlueText>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.refresh}
            onPress={updateRate}
            disabled={state.isRateBeingUpdatedLocal}
            style={state.isRateBeingUpdatedLocal ? styles.disabledButton : styles.enabledButon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    alignItems: 'center',
    width: '100%',
  },
  rtlRoot: {
    flexDirection: 'row-reverse',
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  sideSlot: {
    alignItems: 'center',
    justifyContent: 'center',
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
  enabledButon: {
    opacity: 1,
  },
  outdatedRateContainer: {
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingTop: 16,
    paddingBottom: 2,
  },
  localCurrency: {
    marginHorizontal: 4,
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  input: {
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    flexShrink: 1,
    minWidth: 24,
    maxWidth: '100%',
  },
  cryptoCurrency: {
    marginHorizontal: 4,
    fontWeight: '600',
    alignSelf: 'center',
  },
  secondaryRoot: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
    minWidth: 0,
  },
  secondaryText: {
    fontSize: 16,
    color: '#9BA0A9',
    fontWeight: '600',
    maxWidth: '100%',
  },
  maxEstimate: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: '100%',
  },
  maxPressable: {
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 4,
  },
  changeAmountUnit: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
