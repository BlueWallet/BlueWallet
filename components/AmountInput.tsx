import Clipboard from '@react-native-clipboard/clipboard';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
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
import Animated, { Easing, FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { fiatToBTC, getCurrencySymbol } from '../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import confirm from '../helpers/confirm';
import loc, { formatBalancePlain, formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { getCachedSatoshis, setCachedSatoshis } from './AmountInput.cache';
import { useAmountInputController } from './AmountInput.hooks';
import { amountInputSelectionReducer, amountInputValueReducer, createInitialAmountInputSelectionState } from './AmountInput.reducer';
import {
  getAmountInputDisplayModel,
  getMaxEstimateText,
  getSecondaryAmountDisplay,
  satoshisToBtc,
  shouldResetAmountSelection,
} from './AmountInput.utils';
import Badge from './Badge';
import BlueText from './BlueText';
import Icon from './Icon';
import { useTheme } from './themes';

export { clearCachedSatoshis, conversionCache, getCachedSatoshis, setCachedSatoshis } from './AmountInput.cache';

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

const sizerLayoutTransition = LinearTransition.duration(SIZER_LAYOUT_DURATION_MS)
  .easing(Easing.out(Easing.quad))
  .reduceMotion(ReduceMotion.System);
const charLayoutTransition = LinearTransition.duration(CHAR_LAYOUT_DURATION_MS)
  .easing(Easing.out(Easing.quad))
  .reduceMotion(ReduceMotion.System);
const charEntering = FadeIn.duration(CHAR_FADE_IN_DURATION_MS).reduceMotion(ReduceMotion.System);
const charExiting = FadeOut.duration(CHAR_FADE_OUT_DURATION_MS).reduceMotion(ReduceMotion.System);

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
    onFocus,
    onSelectionChange,
    accessibilityLabel,
    accessibilityState,
    allowFontScaling = true,
    maxFontSizeMultiplier,
    selectTextOnFocus = false,
    style: styleOverride,
    ...otherProps
  } = props;
  const { isRateBeingUpdated, outdatedRefreshRate, numberFormat, refreshInputSettings, updateRate } = useAmountInputController(unit);

  const {
    amountCharacters,
    displayAmount,
    displayJustifyContent,
    endSelection,
    inputFontSize,
    inputTextAlign,
    isCryptoUnit,
    measureAmountText,
  } = useMemo(() => getAmountInputDisplayModel(amount, unit, numberFormat, loc.units.MAX), [amount, numberFormat, unit]);

  const [{ selection: inputSelection }, dispatchSelection] = useReducer(
    amountInputSelectionReducer,
    endSelection,
    createInitialAmountInputSelectionState,
  );

  useEffect(() => {
    dispatchSelection({ type: 'displayChanged', endSelection });
  }, [endSelection]);

  const amountAccessibilityLabel =
    accessibilityLabel ?? `${loc._.enter_amount}, ${unit === BitcoinUnit.LOCAL_CURRENCY ? getCurrencySymbol() : loc.units[unit]}`;

  const secondaryDisplayCurrency = useMemo(
    () =>
      getSecondaryAmountDisplay(amount, unit, {
        btcUnitLabel: loc.units[BitcoinUnit.BTC],
        cachedSatoshis: unit === BitcoinUnit.LOCAL_CURRENCY ? getCachedSatoshis(amount) : undefined,
        fiatToBTC,
        formatLocalCurrency: satoshis => formatBalanceWithoutSuffix(satoshis, BitcoinUnit.LOCAL_CURRENCY, false),
      }),
    [amount, unit],
  );

  const changeAmountUnit = useCallback(() => {
    const result = amountInputValueReducer(
      { amount, displayAmount: displayAmount ?? '', unit },
      {
        type: 'unitCycleRequested',
        cachedSatoshis: unit === BitcoinUnit.LOCAL_CURRENCY ? getCachedSatoshis(amount) : undefined,
        conversionFunctions: { fiatToBTC, formatBalancePlain },
      },
    );

    if (result.cacheWrite) setCachedSatoshis(result.cacheWrite.localAmount, result.cacheWrite.satoshis);
    if (result.shouldNotifyAmount) onChangeText(result.amount);
    if (result.shouldNotifyUnit) onAmountUnitChange(result.unit);
  }, [amount, displayAmount, onChangeText, onAmountUnitChange, unit]);

  const handleTextInputOnPress = useCallback(() => {
    refreshInputSettings();
    textInputRef?.current?.focus();
  }, [refreshInputSettings]);

  const handleInputFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    event => {
      refreshInputSettings();
      onFocus?.(event);
    },
    [onFocus, refreshInputSettings],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      const result = amountInputValueReducer(
        { amount, displayAmount: displayAmount ?? '', unit },
        {
          type: 'nativeTextChanged',
          text,
          settings: refreshInputSettings(),
        },
      );
      if (result.shouldNotifyAmount) onChangeText(result.amount);
    },
    [amount, displayAmount, onChangeText, refreshInputSettings, unit],
  );

  const resetAmount = useCallback(async () => {
    if (await confirm(loc.send.reset_amount, loc.send.reset_amount_confirm)) {
      const result = amountInputValueReducer({ amount, displayAmount: displayAmount ?? '', unit }, { type: 'resetConfirmed' });
      if (result.shouldNotifyAmount) onChangeText(result.amount);
    }
  }, [amount, displayAmount, onChangeText, unit]);

  const copyMaxEstimate = useCallback(() => {
    if (maxSendableAmount == null) return;
    const btcValue = satoshisToBtc(maxSendableAmount);
    Clipboard.setString(btcValue);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
  }, [maxSendableAmount]);

  const maxEstimateText = useMemo(
    () => getMaxEstimateText(maxSendableAmount, isMaxAmountEstimate, loc.units[BitcoinUnit.BTC]),
    [isMaxAmountEstimate, maxSendableAmount],
  );

  const handleSelectionChange = useCallback(
    (event: TextInputSelectionChangeEvent) => {
      const { selection } = event.nativeEvent;
      onSelectionChange?.(event);
      dispatchSelection({ type: 'nativeSelectionChanged', selection, endSelection });

      if (shouldResetAmountSelection(selection, endSelection)) {
        // The animated amount display only supports append/delete-at-end edits.
        // Correct the native cursor immediately; the controlled `selection`
        // reducer state below keeps it locked there across renders and value changes.
        textInputRef.current?.setNativeProps({ selection: endSelection });
      }
    },
    [endSelection, onSelectionChange],
  );

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
    <Pressable accessible={false} disabled={disabled} onPress={handleTextInputOnPress} testID="AmountInputPressable">
      <View style={styles.root}>
        {!disabled && <View style={styles.sideRail} />}
        <View style={styles.flex}>
          <View style={[styles.container, stylesHook.container]}>
            {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
              <Text
                accessible={false}
                importantForAccessibility="no"
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
                style={[styles.localCurrency, stylesHook.localCurrency]}
              >
                {getCurrencySymbol()}
              </Text>
            )}
            {amount !== BitcoinUnit.MAX ? (
              <Animated.View layout={sizerLayoutTransition} style={styles.inputSizer} testID="AmountInputSizer">
                <Text
                  style={[styles.input, styles.inputMeasure, stylesHook.input, androidFontPaddingStyle]}
                  numberOfLines={1}
                  allowFontScaling={allowFontScaling}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  testID="AmountInputMeasureText"
                >
                  {measureAmountText}
                </Text>
                <Animated.View
                  accessible={false}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  layout={charLayoutTransition}
                  style={[styles.inputDisplay, stylesHook.inputDisplay]}
                  pointerEvents="none"
                  testID="AmountInputVisualCharacters"
                >
                  {amountCharacters.map((char, index) => (
                    <Animated.Text
                      key={index}
                      testID={`AmountInputCharacter-${index}`}
                      entering={charEntering}
                      exiting={charExiting}
                      layout={charLayoutTransition}
                      allowFontScaling={allowFontScaling}
                      maxFontSizeMultiplier={maxFontSizeMultiplier}
                      style={[styles.inputGlyph, stylesHook.inputGlyph, androidFontPaddingStyle]}
                    >
                      {char}
                    </Animated.Text>
                  ))}
                </Animated.View>
                <TextInput
                  {...otherProps}
                  accessibilityLabel={amountAccessibilityLabel}
                  accessibilityState={{
                    ...accessibilityState,
                    busy: isLoading || accessibilityState?.busy,
                    disabled: isLoading || disabled,
                  }}
                  allowFontScaling={allowFontScaling}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  underlineColorAndroid="transparent"
                  onSelectionChange={handleSelectionChange}
                  testID="BitcoinAmountInput"
                  inputMode={unit === BitcoinUnit.SATS ? 'numeric' : 'decimal'}
                  keyboardType={unit === BitcoinUnit.SATS ? 'number-pad' : 'decimal-pad'}
                  onFocus={handleInputFocus}
                  onChangeText={handleChangeText}
                  placeholder="0"
                  ref={textInputRef}
                  editable={!isLoading && !disabled}
                  selection={inputSelection}
                  selectTextOnFocus={selectTextOnFocus}
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={loc.send.reset_amount}
                accessibilityState={{ disabled: isLoading || disabled }}
                accessibilityValue={{ text: maxEstimateText ?? loc.units.MAX }}
                disabled={isLoading || disabled}
                onPress={resetAmount}
                onLongPress={maxEstimateText ? copyMaxEstimate : undefined}
                style={styles.maxPressable}
                testID="AmountInputMaxButton"
              >
                <Text
                  accessible={false}
                  importantForAccessibility="no"
                  allowFontScaling={allowFontScaling}
                  maxFontSizeMultiplier={maxFontSizeMultiplier}
                  numberOfLines={1}
                  style={[styles.input, styles.maxLabel, stylesHook.input]}
                >
                  {BitcoinUnit.MAX}
                </Text>
                {maxEstimateText && (
                  <Text
                    accessible={false}
                    importantForAccessibility="no"
                    allowFontScaling={allowFontScaling}
                    maxFontSizeMultiplier={maxFontSizeMultiplier}
                    style={[styles.maxEstimate, stylesHook.localCurrency]}
                  >
                    {maxEstimateText}
                  </Text>
                )}
              </Pressable>
            )}
            {unit !== BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
              <Text
                accessible={false}
                importantForAccessibility="no"
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
                style={[styles.cryptoCurrency, stylesHook.cryptoCurrency]}
              >
                {loc.units[unit]}
              </Text>
            )}
          </View>
          {secondaryDisplayCurrency.length > 0 && (
            <View style={styles.secondaryRoot} testID="AmountInputSecondaryDisplay">
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={maxFontSizeMultiplier}
                style={styles.secondaryText}
                selectable
              >
                {secondaryDisplayCurrency}
              </Text>
            </View>
          )}
        </View>
        {!disabled &&
          (amount !== BitcoinUnit.MAX ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={loc._.change_input_currency}
              accessibilityState={{ disabled: false }}
              hitSlop={{ left: 10, right: 10 }}
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
          <BlueText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
          >
            {loc.formatString(loc.send.outdated_rate, {
              date: dayjs(outdatedRefreshRate.LastUpdated).format('l LT'),
            })}
          </BlueText>
          <View style={styles.spacing8} />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.refresh}
            accessibilityState={{ disabled: isRateBeingUpdated }}
            onPress={updateRate}
            disabled={isRateBeingUpdated}
            hitSlop={14}
            style={isRateBeingUpdated ? styles.disabledButton : undefined}
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
