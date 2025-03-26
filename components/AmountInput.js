import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Animated, Image, LayoutAnimation, Pressable, StyleSheet, TextInput, TouchableOpacity, View, Easing } from 'react-native';
import { Badge, Icon, Text } from '@rneui/themed';
import * as RNLocalize from 'react-native-localize';

import {
  fiatToBTC,
  formatNumberByUnit,
  formatNumberWithLocale,
  getCurrencySymbol,
  getDecimalPlaces,
  isRateOutdated,
  localeSettings,
  mostRecentFetchedRate,
  parsePastedNumber,
  satoshiToBTC,
  satoshiToLocalCurrency,
  updateExchangeRate,
  updateLocaleSettings,
} from '../blue_modules/currency';
import { BlueText } from '../BlueComponents';
import confirm from '../helpers/confirm';
import loc, { getTextSizeForAmount, parseNumberStringToFloat, removeTrailingZeros } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { useTheme } from './themes';

dayjs.extend(localizedFormat);

// Create animated components once outside the class
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedImage = Animated.createAnimatedComponent(Image);

class AmountInput extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    /**
     * amount is a sting thats always in current unit denomination, e.g. '0.001' or '9.43' or '10000'
     */
    amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /**
     * callback that returns currently typed amount, in current denomination, e.g. 0.001 or 10000 or $9.34
     */
    onChangeText: PropTypes.func.isRequired,
    /**
     * callback thats fired to notify of currently selected denomination, returns <BitcoinUnit.*>
     */
    onAmountUnitChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    colors: PropTypes.object.isRequired,
    pointerEvents: PropTypes.string,
    unit: PropTypes.string,
    onBlur: PropTypes.func,
    onFocus: PropTypes.func,
  };

  /**
   * cache of conversions  fiat amount => satoshi
   * @type {{}}
   */
  static conversionCache = {};

  static getCachedSatoshis = amount => {
    if (!amount) return false;

    const cacheKey = amount + BitcoinUnit.LOCAL_CURRENCY;
    const cachedValue = AmountInput.conversionCache[cacheKey];

    if (cachedValue) {
      console.log(`Found in cache: ${cacheKey} → ${cachedValue}`);
      return cachedValue;
    }

    // Check for comma-formatted values
    const cleanKey = amount.replace(/,/g, '') + BitcoinUnit.LOCAL_CURRENCY;
    const cleanValue = AmountInput.conversionCache[cleanKey];
    if (cleanValue) {
      console.log(`Found in cache with comma-normalized key: ${cleanKey} → ${cleanValue}`);
      return cleanValue;
    }

    // If amount has decimals, try removing them for cache lookup
    const noDecimalsKey = amount.split('.')[0] + BitcoinUnit.LOCAL_CURRENCY;
    const noDecimalsValue = AmountInput.conversionCache[noDecimalsKey];
    if (noDecimalsValue) {
      console.log(`Found in cache with no-decimals key: ${noDecimalsKey} → ${noDecimalsValue}`);
      return noDecimalsValue;
    }

    // Try with device locale separators
    const { groupSeparator } = localeSettings;
    if (groupSeparator && amount.includes(groupSeparator)) {
      const normalizedAmount = amount.replace(new RegExp('\\' + groupSeparator, 'g'), '');
      const normalizedKey = normalizedAmount + BitcoinUnit.LOCAL_CURRENCY;
      const normalizedValue = AmountInput.conversionCache[normalizedKey];
      if (normalizedValue) {
        console.log(`Found in cache with locale-normalized key: ${normalizedKey} → ${normalizedValue}`);
        return normalizedValue;
      }
    }

    return false;
  };

  static setCachedSatoshis = (amount, sats) => {
    if (!amount || !sats) return;

    // Ensure sats is a string for consistent storage
    const satsString = sats.toString();
    const cacheKey = amount + BitcoinUnit.LOCAL_CURRENCY;
    AmountInput.conversionCache[cacheKey] = satsString;
    console.log(`Stored in cache: ${cacheKey} → ${satsString}`);

    // Also store with normalized keys for more reliable lookup
    if (amount.includes(',')) {
      const noCommasKey = amount.replace(/,/g, '') + BitcoinUnit.LOCAL_CURRENCY;
      AmountInput.conversionCache[noCommasKey] = satsString;
    }

    if (amount.includes('.')) {
      const noDecimalsKey = amount.split('.')[0] + BitcoinUnit.LOCAL_CURRENCY;
      AmountInput.conversionCache[noDecimalsKey] = satsString;
    }

    const { groupSeparator } = localeSettings;
    if (groupSeparator && amount.includes(groupSeparator)) {
      const normalizedAmount = amount.replace(new RegExp('\\' + groupSeparator, 'g'), '');
      const normalizedKey = normalizedAmount + BitcoinUnit.LOCAL_CURRENCY;
      AmountInput.conversionCache[normalizedKey] = satsString;
    }
  };

  constructor() {
    super();
    this.state = {
      mostRecentFetchedRate: Date(),
      isRateOutdated: false,
      isRateBeingUpdated: false,
      // Font size animation value
      fontSizeAnimated: new Animated.Value(36),
      // Text entry animation values
      textOpacity: new Animated.Value(1),
      textScale: new Animated.Value(1),
      lastAmount: '', // Track the previous amount for comparison

      // Fix secondary display animation - initialize with 1 (visible)
      unitOpacity: new Animated.Value(1),
      unitTranslateY: new Animated.Value(0),
      secondaryDisplayOpacity: new Animated.Value(1),
      iconRotation: new Animated.Value(0), // For icon rotation animation
      secondaryDisplayVisible: true, // Track visibility state explicitly
      forceShowSecondaryDisplay: true, // Add a force flag to override calculations
    };

    // Configure animation presets with better spring physics
    this.springConfig = {
      friction: 8, // Controls "bounciness", higher = less bounce
      tension: 45, // Controls speed, higher = faster
      useNativeDriver: false,
    };

    // Faster timing animation for subtle effects
    this.timingConfig = {
      duration: 120, // Faster than font size changes
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    };
  }

  componentDidMount() {
    // Ensure locale settings are up-to-date
    updateLocaleSettings();

    mostRecentFetchedRate()
      .then(mostRecentFetchedRateValue => {
        this.setState({ mostRecentFetchedRate: mostRecentFetchedRateValue });
      })
      .finally(() => {
        isRateOutdated().then(isRateOutdatedValue => this.setState({ isRateOutdated: isRateOutdatedValue }));
      });
  }

  componentDidUpdate(prevProps) {
    const currentAmount = this.props.amount || '';
    const previousAmount = prevProps.amount || '';

    // Don't animate when switching between modes (e.g., MAX to number)
    if ((currentAmount === 'MAX' && previousAmount !== 'MAX') || (currentAmount !== 'MAX' && previousAmount === 'MAX')) {
      return;
    }

    // Skip animations for programmatic changes like currency conversions
    if (currentAmount !== previousAmount && Math.abs(currentAmount.length - previousAmount.length) > 3) {
      console.log('Skipping animation for large text change');
      this.animateFontSize(false);
      return;
    }

    // If amount changed, animate and ensure cursor is at the end
    if (this.props.amount !== prevProps.amount && this.textInput) {
      // Detect type of change for different animations
      if (currentAmount.length > previousAmount.length) {
        // Text added - grow and fade in effect
        this.animateTextAddition();
      } else if (currentAmount.length < previousAmount.length) {
        // Text removed - slight shrink effect
        this.animateTextDeletion();
      }

      // Always animate font size when amount changes
      this.animateFontSize(true);

      // Ensure cursor is at the end
      const length = currentAmount.toString().length;
      setTimeout(() => {
        if (this.textInput) {
          this.textInput.setNativeProps({
            selection: { start: length, end: length },
          });
        }
      }, 0);

      // Update last amount for next comparison
      this.setState({ lastAmount: currentAmount });
    }
  }

  // Animation for text addition
  animateTextAddition = () => {
    // Reset animations to starting values
    this.state.textScale.setValue(1.04); // Slightly larger
    this.state.textOpacity.setValue(0.9); // Slightly transparent

    // Create parallel animations for a coordinated effect
    Animated.parallel([
      // Scale down to normal
      Animated.spring(this.state.textScale, {
        toValue: 1,
        ...this.springConfig,
      }),
      // Fade in to full opacity
      Animated.timing(this.state.textOpacity, {
        toValue: 1,
        ...this.timingConfig,
      }),
    ]).start();
  };

  // Animation for text deletion
  animateTextDeletion = () => {
    // Reset animations to starting values
    this.state.textScale.setValue(0.97); // Slightly smaller

    // Animate back to normal size with spring physics
    Animated.spring(this.state.textScale, {
      toValue: 1,
      ...this.springConfig,
    }).start();
  };

  // Enhanced version to animate font size transitions
  animateFontSize = (withAnimation = true) => {
    const targetSize = getTextSizeForAmount(this.props.amount);

    this.state.fontSizeAnimated.stopAnimation(currentValue => {
      // Only animate if there's an actual size change
      if (Math.abs(currentValue - targetSize) > 0.1) {
        console.log(`Animating font size from ${currentValue} to ${targetSize}`);

        if (withAnimation) {
          // Use spring animation for a more natural bounce effect
          Animated.spring(this.state.fontSizeAnimated, {
            toValue: targetSize,
            ...this.springConfig,
          }).start();
        } else {
          // Instant change without animation
          this.state.fontSizeAnimated.setValue(targetSize);
        }
      }
    });
  };

  // Animation for switching currency units
  animateUnitChange = () => {
    // Always ensure secondary display is visible
    this.setState({ secondaryDisplayVisible: true, forceShowSecondaryDisplay: true });

    // First rotate the switch icon
    Animated.timing(this.state.iconRotation, {
      toValue: this.state.iconRotation._value + 1,
      duration: 400,
      easing: Easing.elastic(1),
      useNativeDriver: true,
    }).start();

    // Prepare parallel animations for units and values
    // Exit animation
    const exitAnimation = Animated.parallel([
      // Fade out
      Animated.timing(this.state.unitOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      // Move up (or down based on previous state)
      Animated.timing(this.state.unitTranslateY, {
        toValue: -20, // Move up
        duration: 150,
        useNativeDriver: true,
      }),
      // Fade out secondary display
      Animated.timing(this.state.secondaryDisplayOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]);

    // Entry animation
    const entryAnimation = Animated.parallel([
      // Fade in
      Animated.timing(this.state.unitOpacity, {
        toValue: 1,
        duration: 200,
        delay: 100, // Slight delay for smoother transition
        useNativeDriver: true,
      }),
      // Move from below
      Animated.timing(this.state.unitTranslateY, {
        toValue: 0, // Return to normal position
        duration: 200,
        delay: 100,
        useNativeDriver: true,
      }),
      // Fade in secondary display
      Animated.timing(this.state.secondaryDisplayOpacity, {
        toValue: 1,
        duration: 200,
        delay: 100,
        useNativeDriver: true,
      }),
    ]);

    // Run the animations in sequence
    Animated.sequence([exitAnimation, entryAnimation]).start(() => {
      // Ensure all animated values are reset to fully visible state
      this.state.secondaryDisplayOpacity.setValue(1);
      this.state.unitOpacity.setValue(1);
      this.state.unitTranslateY.setValue(0);
      this.setState({ secondaryDisplayVisible: true });
    });
  };

  onAmountUnitChange(previousUnit, newUnit) {
    const amount = this.props.amount || '';
    let sats = 0;

    console.log(`UNIT CHANGE: ${previousUnit} → ${newUnit} | AMOUNT: "${amount}"`);

    // Don't attempt conversion if amount is empty
    if (amount === '') {
      this.props.onChangeText('');
      this.props.onAmountUnitChange(newUnit);
      return;
    }

    // First check if amount is "NaN" - if so, reset and bail out
    if (amount === 'NaN' || amount.includes('NaN')) {
      console.log('Found NaN in amount, resetting to 0');
      this.props.onChangeText('0');
      this.props.onAmountUnitChange(newUnit);
      return;
    }

    try {
      // *** CRITICAL FIX: Always check locale settings when parsing input ***
      const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
      console.log(`Conversion with locale settings - decimal: ${decimalSeparator}, group: ${groupingSeparator}`);

      if (previousUnit === BitcoinUnit.LOCAL_CURRENCY) {
        // For local currency, check cache first
        const cachedSats = AmountInput.getCachedSatoshis(amount);
        if (cachedSats) {
          console.log(`Cache hit! Found cached value: ${cachedSats} sats for ${amount} ${previousUnit}`);
          // Convert string to number to ensure it's valid
          sats = typeof cachedSats === 'string' ? parseInt(cachedSats.replace(/[^\d]/g, ''), 10) : cachedSats;
          console.log(`Using cached sats value: ${sats}`);
        } else {
          const numericAmount = parseNumberStringToFloat(amount.toString());
          console.log(`Parsed LOCAL_CURRENCY amount: ${numericAmount}`);

          if (isNaN(numericAmount)) {
            this.props.onChangeText('0');
            this.props.onAmountUnitChange(newUnit);
            return;
          }

          try {
            // Use high precision for fiat to BTC conversion
            const btcValue = fiatToBTC(numericAmount);
            sats = new BigNumber(btcValue).multipliedBy(100000000).toNumber();
            console.log(`Fiat ${numericAmount} → BTC ${btcValue} → SATS ${sats}`);
          } catch (error) {
            console.error('Error converting fiat to BTC:', error);
            sats = 0;
          }
        }
      } else if (previousUnit === BitcoinUnit.BTC) {
        // *** CRITICAL FIX: Properly handle locale-specific decimal separators for BTC ***
        console.log(`Parsing BTC amount: "${amount}" with decimal separator: "${decimalSeparator}"`);

        // This is the key improvement - use parseNumberStringToFloat to correctly handle the locale's decimal separator
        const parsedBtc = parseNumberStringToFloat(amount);
        if (isNaN(parsedBtc)) {
          console.warn(`Failed to parse BTC amount: "${amount}"`);
          this.props.onChangeText('0');
          this.props.onAmountUnitChange(newUnit);
          return;
        }

        // Convert to satoshis using BigNumber for precision
        sats = new BigNumber(parsedBtc).multipliedBy(100000000).toNumber();
        console.log(`BTC parsed: ${parsedBtc} → SATS: ${sats}`);
      } else if (previousUnit === BitcoinUnit.SATS) {
        // For SATS, remove any grouping separators and parse
        let normalizedAmount = amount.toString();
        if (groupingSeparator) {
          const safeGroupingSep = groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          normalizedAmount = normalizedAmount.replace(new RegExp(safeGroupingSep, 'g'), '');
        }
        normalizedAmount = normalizedAmount.replace(/\D/g, '');
        sats = parseInt(normalizedAmount || '0', 10);
        console.log(`SATS normalized: "${amount}" → "${normalizedAmount}" = ${sats}`);
      }

      const MAX_SAFE_SATS = 2100000000000000; // 21 million BTC in satoshis
      if (sats > MAX_SAFE_SATS) {
        console.warn(`Extremely large satoshi value detected: ${sats}, capping to max supply`);
        sats = MAX_SAFE_SATS;
      }

      const deviceLocale = RNLocalize.getLocales()[0].languageTag;
      console.log(`Unit change locale settings: locale=${deviceLocale}, decimal=${decimalSeparator}, group=${groupingSeparator}`);

      let newInputValue = '0'; // Default value
      if (newUnit === BitcoinUnit.BTC) {
        try {
          const btcValue = new BigNumber(sats).dividedBy(100000000);
          const formattedBtc = btcValue.toFixed(8);
          let trimmedBtc = formattedBtc.replace(/\.?0+$/, '');
          if (!trimmedBtc.includes('.')) {
            trimmedBtc += '.0';
          }
          if (decimalSeparator !== '.') {
            trimmedBtc = trimmedBtc.replace('.', decimalSeparator);
          }
          newInputValue = trimmedBtc;
          console.log(`SATS ${sats} → BTC formatted: ${newInputValue}`);
        } catch (error) {
          console.error('Error formatting BTC value:', error);
          newInputValue = `0${decimalSeparator}0`;
        }
      } else if (newUnit === BitcoinUnit.SATS) {
        try {
          const satsInt = Math.round(sats);
          newInputValue = new Intl.NumberFormat(deviceLocale, {
            useGrouping: true,
            maximumFractionDigits: 0,
          }).format(satsInt);
          console.log(`SATS formatted with locale: ${satsInt} → "${newInputValue}"`);
        } catch (error) {
          console.error('Error formatting SATS value:', error);
          newInputValue = String(Math.round(sats));
        }
      } else if (newUnit === BitcoinUnit.LOCAL_CURRENCY) {
        try {
          const localAmount = satoshiToLocalCurrency(sats, false);
          if (localAmount === '...' || isNaN(parseFloat(localAmount))) {
            newInputValue = '0.00';
          } else {
            const decimals = getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY);
            newInputValue = new Intl.NumberFormat(deviceLocale, {
              minimumFractionDigits: Math.min(2, decimals),
              maximumFractionDigits: decimals,
              useGrouping: true,
            }).format(parseFloat(localAmount));
            console.log(`SATS ${sats} → LOCAL formatted: ${newInputValue}`);
          }
        } catch (error) {
          console.error('Error formatting local currency:', error);
          newInputValue = `0${decimalSeparator}00`;
        }
      }

      if ((previousUnit === BitcoinUnit.SATS || previousUnit === BitcoinUnit.BTC) && newUnit === BitcoinUnit.LOCAL_CURRENCY) {
        AmountInput.setCachedSatoshis(newInputValue, sats.toString());
        console.log(`Cached conversion to LOCAL_CURRENCY:`, { key: newInputValue, value: sats });
      }

      this.props.onChangeText(newInputValue);
      this.props.onAmountUnitChange(newUnit);
    } catch (error) {
      console.error('Critical error in currency conversion:', error);
      const { decimalSeparator } = RNLocalize.getNumberFormatSettings();
      const safeValue = newUnit === BitcoinUnit.LOCAL_CURRENCY ? `0${decimalSeparator}00` : '0';
      this.props.onChangeText(safeValue);
      this.props.onAmountUnitChange(newUnit);
    }
  }

  changeAmountUnit = () => {
    let previousUnit = this.props.unit;
    let newUnit;

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

    // Begin the animation before the actual unit change
    this.animateUnitChange();

    // Process unit change with a slight delay to let the animation start
    setTimeout(() => {
      this.onAmountUnitChange(previousUnit, newUnit);
    }, 100);
  };

  maxLength = () => {
    switch (this.props.unit) {
      case BitcoinUnit.BTC:
        return 11;
      case BitcoinUnit.SATS:
        return 15;
      case BitcoinUnit.LOCAL_CURRENCY:
        return 20; // Increased to handle larger amounts with decimals
      default:
        return 15;
    }
  };

  textInput = React.createRef();

  handleTextInputOnPress = () => {
    if (this.textInput && this.textInput.current && typeof this.textInput.current.focus === 'function') {
      this.textInput.current.focus();
    }
  };

  handleChangeText = text => {
    text = text.trim();

    if (text === '') {
      this.props.onChangeText('');
      return;
    }

    console.log(`INPUT: "${text}" | UNIT: ${this.props.unit}`);

    try {
      // Handle input based on current unit
      switch (this.props.unit) {
        case BitcoinUnit.LOCAL_CURRENCY:
          this.handleLocalCurrencyInput(text);
          break;
        case BitcoinUnit.BTC:
          this.handleBtcInput(text);
          break;
        case BitcoinUnit.SATS:
          this.handleSatsInput(text);
          break;
        default:
          this.props.onChangeText(text);
      }
    } catch (error) {
      console.error(`Error processing input for ${this.props.unit}:`, error);
      this.props.onChangeText(text);
    }
  };

  handleLocalCurrencyInput = text => {
    // Always get fresh locale settings directly from the device
    const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;

    // Get the maximum allowed decimal places for the current currency
    let maxDecimalPlaces = 2; // Default to 2 if we can't get from getDecimalPlaces
    try {
      maxDecimalPlaces = getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY);
    } catch (error) {
      console.error('Error getting decimal places:', error);
    }

    console.log(
      `Using device locale: ${deviceLocale} | decimal="${decimalSeparator}" | group="${groupingSeparator}" | maxDecimals=${maxDecimalPlaces}`,
    );
    console.log(`Raw input text: "${text}"`);

    // CRITICAL: Determine if commas or periods are being used as decimal vs grouping separators
    const safeGroupSep = groupingSeparator ? groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const safeDecimalSep = decimalSeparator ? decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const validCharsPattern = new RegExp(`[^\\d${safeDecimalSep}${safeGroupSep}-]`, 'g');

    // Remove any characters that are not digits or our expected separators
    const sanitizedText = text.replace(validCharsPattern, '');
    console.log(`After removing invalid chars: "${sanitizedText}"`);

    let integerPart = '';
    let decimalPart = '';
    let hasDecimalSeparator = false;

    // First check: does the input contain the decimal separator from RNLocalize?
    if (sanitizedText.includes(decimalSeparator)) {
      hasDecimalSeparator = true;
      const parts = sanitizedText.split(decimalSeparator);
      integerPart = parts[0] || '';
      decimalPart = parts.length > 1 ? parts[1] : '';

      // Limit decimal places to the maximum allowed
      if (decimalPart.length > maxDecimalPlaces) {
        decimalPart = decimalPart.substring(0, maxDecimalPlaces);
      }

      // Now, VERY IMPORTANT: If the decimal separator is used, remove ALL grouping separators
      if (groupingSeparator && integerPart.includes(groupingSeparator)) {
        const groupSepRegex = new RegExp(safeGroupSep, 'g');
        integerPart = integerPart.replace(groupSepRegex, '');
        console.log(`Integer part after removing separators: "${integerPart}"`);
      }
    } else {
      integerPart = sanitizedText;

      // CRITICAL: If we have grouping separators, we must keep them intact at this stage
      if (groupingSeparator && integerPart.includes(groupingSeparator)) {
        console.log(`Removing grouping separators from integer part: "${integerPart}"`);
        const groupSepRegex = new RegExp(safeGroupSep, 'g');
        integerPart = integerPart.replace(groupSepRegex, '');
        console.log(`Integer part after removing separators: "${integerPart}"`);
      }
    }

    integerPart = integerPart.replace(/[^\d]/g, '');
    decimalPart = decimalPart.replace(/[^\d]/g, '');

    console.log(`Parsed: integer="${integerPart}", decimal="${decimalPart}"`);

    let formattedInteger = '';
    if (integerPart.length > 0) {
      for (let i = 0; i < integerPart.length; i++) {
        if (i > 0 && (integerPart.length - i) % 3 === 0) {
          formattedInteger += groupingSeparator;
        }
        formattedInteger += integerPart[i];
      }
    } else {
      formattedInteger = '0';
    }

    let formattedResult;
    if (hasDecimalSeparator || decimalPart.length > 0) {
      formattedResult = `${formattedInteger}${decimalSeparator}${decimalPart}`;
    } else if (text.endsWith(decimalSeparator)) {
      formattedResult = `${formattedInteger}${decimalSeparator}`;
    } else {
      formattedResult = formattedInteger;
    }

    console.log(`Final formatted result: "${formattedResult}"`);
    this.props.onChangeText(formattedResult);
  };

  handleBtcInput = text => {
    const { decimalSeparator } = RNLocalize.getNumberFormatSettings();
    const maxDecimalPlaces = 8;
    console.log(`BTC input with device settings - decimal: ${decimalSeparator}`);

    const safeDecimalSeparator = decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const invalidCharsPattern = new RegExp(`[^\\d${safeDecimalSeparator}\\-]`, 'g');
    let cleanedInput = text.replace(invalidCharsPattern, '');

    if (cleanedInput.includes(decimalSeparator)) {
      const parts = cleanedInput.split(decimalSeparator);
      const integerPart = parts[0];
      let decimalPart = parts.slice(1).join('');
      if (decimalPart.length > maxDecimalPlaces) {
        decimalPart = decimalPart.substring(0, maxDecimalPlaces);
      }
      cleanedInput = `${integerPart}${decimalSeparator}${decimalPart}`;
    }

    this.props.onChangeText(cleanedInput);
  };

  handleSatsInput = text => {
    const { groupingSeparator } = RNLocalize.getNumberFormatSettings();
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;
    const digitsOnly = text.replace(/\D/g, '');
    console.log(`SATS input with device locale: ${deviceLocale}, group separator: ${groupingSeparator}`);

    let formatted;
    try {
      formatted = new Intl.NumberFormat(deviceLocale, {
        useGrouping: true,
        maximumFractionDigits: 0,
      }).format(parseInt(digitsOnly || '0', 10));
    } catch (error) {
      console.error('Error using Intl.NumberFormat for SATS:', error);
      const safeGroupSeparator = groupingSeparator || ',';
      formatted = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, safeGroupSeparator);
    }

    this.props.onChangeText(formatted);
  };

  resetAmount = async () => {
    if (await confirm(loc.send.reset_amount, loc.send.reset_amount_confirm)) {
      this.props.onChangeText('');
    }
  };

  updateRate = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    this.setState({ isRateBeingUpdated: true }, async () => {
      try {
        await updateExchangeRate();
        mostRecentFetchedRate().then(mostRecentFetchedRateValue => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          this.setState({ mostRecentFetchedRate: mostRecentFetchedRateValue });
        });
      } finally {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        this.setState({ isRateBeingUpdated: false, isRateOutdated: await isRateOutdated() });
      }
    });
  };

  handleSelectionChange = event => {
    const { selection } = event.nativeEvent;
    const amount = this.props.amount || '';
    const length = amount.toString().length;

    if (selection.start === selection.end && selection.start !== length) {
      setTimeout(() => {
        if (this.textInput) {
          this.textInput.setNativeProps({
            selection: { start: length, end: length },
          });
        }
      }, 10);
    }
  };

  handlePasteText = text => {
    try {
      console.log(`Handling pasted text: "${text}"`);

      if (!text || text.trim() === '') {
        console.log('Pasted text is null, undefined, or empty');
        return;
      }

      if (text.replace(/[,.\s\d\-+]/g, '').length > 0) {
        console.log('Pasted text contains non-numeric characters, using standard text handling');
        this.handleChangeText(text);
        return;
      }

      const parsed = parsePastedNumber(text);
      const { numericValue } = parsed;

      if (isNaN(numericValue)) {
        console.log(`Failed to parse number: "${text}"`);
        this.handleChangeText(text);
        return;
      }

      const result = formatNumberByUnit(
        numericValue,
        this.props.unit,
        this.props.unit === BitcoinUnit.LOCAL_CURRENCY
          ? getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY)
          : this.props.unit === BitcoinUnit.BTC
            ? 8
            : 0,
      );
      console.log(`Final formatted result: "${text}" → "${result}"`);
      this.props.onChangeText(result);
    } catch (error) {
      console.error('Error in paste handling:', error);
      this.handleChangeText(text);
    }
  };

  formatWithLocale = (number, decimals) => {
    return formatNumberWithLocale(number, decimals);
  };

  getInputFontSize = () => {
    const targetSize = getTextSizeForAmount(this.props.amount);

    Animated.timing(this.state.fontSizeAnimated, {
      toValue: targetSize,
      duration: 150, // Fast but smooth transition
      useNativeDriver: false, // Font size changes can't use native driver
    }).start();

    return this.state.fontSizeAnimated;
  };

  render() {
    const { colors, disabled, unit } = this.props;
    const amount = this.props.amount || '';
    let secondaryDisplayCurrency = '';
    let sat;
    // Fix: Initialize with true and only set to false if conditions aren't met
    let showSecondaryDisplay = true;

    // Only calculate secondaryDisplayCurrency if amount is not empty
    if (amount !== '' && amount !== BitcoinUnit.MAX) {
      switch (unit) {
        case BitcoinUnit.BTC:
          try {
            const btcValue = parseNumberStringToFloat(amount.toString());
            if (isNaN(btcValue)) {
              secondaryDisplayCurrency = satoshiToLocalCurrency(0, true);
            } else {
              sat = new BigNumber(btcValue).multipliedBy(100000000).toString();
              const localCurrencyValue = satoshiToLocalCurrency(sat, false);
              const currencySymbol = getCurrencySymbol();
              secondaryDisplayCurrency = `${localCurrencyValue} ${currencySymbol}`;
              console.log(`BTC ${btcValue} → Local Currency: ${secondaryDisplayCurrency}`);
            }
          } catch (error) {
            console.error('Error formatting secondary display:', error);
            secondaryDisplayCurrency = satoshiToLocalCurrency(0, true);
          }
          break;

        case BitcoinUnit.SATS:
          try {
            let normalizedAmount = amount.toString();
            const { groupSeparator } = localeSettings;
            if (groupSeparator) {
              const safeGroupSep = groupSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              normalizedAmount = normalizedAmount.replace(new RegExp(safeGroupSep, 'g'), '');
            }
            normalizedAmount = normalizedAmount.replace(/\D/g, '');
            const satsValue = parseInt(normalizedAmount, 10);
            console.log(`SECONDARY DISPLAY: SATS normalized from "${amount}" to "${normalizedAmount}" = ${satsValue}`);
            if (isNaN(satsValue)) {
              const localCurrencyValue = satoshiToLocalCurrency(0, false);
              const currencySymbol = getCurrencySymbol();
              secondaryDisplayCurrency = `${localCurrencyValue} ${currencySymbol}`;
            } else {
              const localCurrencyValue = satoshiToLocalCurrency(satsValue, false);
              const currencySymbol = getCurrencySymbol();
              secondaryDisplayCurrency = `${localCurrencyValue} ${currencySymbol}`;
              console.log(`SATS ${satsValue} → Local Currency: ${secondaryDisplayCurrency}`);
            }
          } catch (error) {
            console.error('Error formatting SATS secondary display:', error);
            secondaryDisplayCurrency = satoshiToLocalCurrency(0, true);
          }
          break;

        case BitcoinUnit.LOCAL_CURRENCY:
          try {
            const cachedSats = AmountInput.getCachedSatoshis(amount);
            if (cachedSats) {
              const btcValue = satoshiToBTC(cachedSats);
              secondaryDisplayCurrency = `${btcValue} ${loc.units[BitcoinUnit.BTC]}`;
            } else {
              const fiatValue = parseNumberStringToFloat(amount.toString());
              if (isNaN(fiatValue)) {
                console.warn(`Failed to parse local currency amount: "${amount}"`);
                secondaryDisplayCurrency = `0 ${loc.units[BitcoinUnit.BTC]}`;
              } else {
                const btcValue = fiatToBTC(fiatValue);
                let formattedBtcValue;
                if (parseFloat(btcValue) >= 1000) {
                  formattedBtcValue = new BigNumber(btcValue).toFixed(2);
                } else if (parseFloat(btcValue) >= 100) {
                  formattedBtcValue = new BigNumber(btcValue).toFixed(4);
                } else {
                  formattedBtcValue = btcValue;
                }
                formattedBtcValue = removeTrailingZeros(formattedBtcValue);
                const { decimalSeparator } = RNLocalize.getNumberFormatSettings();
                if (decimalSeparator !== '.') {
                  formattedBtcValue = formattedBtcValue.replace('.', decimalSeparator);
                }
                secondaryDisplayCurrency = `${formattedBtcValue} ${loc.units[BitcoinUnit.BTC]}`;
                console.log(`Local currency ${fiatValue} → BTC: ${secondaryDisplayCurrency}`);
              }
            }
          } catch (error) {
            console.error('Error in local currency conversion:', error);
            secondaryDisplayCurrency = `0 ${loc.units[BitcoinUnit.BTC]}`;
          }
          break;
      }

      if (secondaryDisplayCurrency === 'NaN' || secondaryDisplayCurrency.includes('NaN')) {
        if (unit === BitcoinUnit.LOCAL_CURRENCY) {
          secondaryDisplayCurrency = `0 ${loc.units[BitcoinUnit.BTC]}`;
        } else {
          const currencySymbol = getCurrencySymbol();
          secondaryDisplayCurrency = `0 ${currencySymbol}`;
        }
      }
    } else {
      // Fix: Set flag to false when conditions aren't met
      showSecondaryDisplay = false;
      secondaryDisplayCurrency = '';
    }

    // Ensure we have valid data to display
    if (secondaryDisplayCurrency === '' || secondaryDisplayCurrency === 'NaN' || secondaryDisplayCurrency.includes('NaN')) {
      // Fix: Set flag to false when we don't have valid data
      showSecondaryDisplay = false;
    }

    const stylesHook = StyleSheet.create({
      center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
      localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
      input: {
        color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2,
      },
      cryptoCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
    });

    // Create transformations based on our animation values
    const animatedInputStyle = {
      fontSize: this.state.fontSizeAnimated,
      opacity: this.state.textOpacity,
      transform: [{ scale: this.state.textScale }],
    };

    // Create animations for unit switching
    const unitAnimatedStyle = {
      opacity: this.state.unitOpacity,
      transform: [{ translateY: this.state.unitTranslateY }],
    };

    const secondaryDisplayAnimatedStyle = {
      opacity: this.state.secondaryDisplayOpacity,
    };

    // Animation for the unit switching icon
    const iconAnimatedStyle = {
      transform: [
        {
          rotate: this.state.iconRotation.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '180deg'],
          }),
        },
      ],
    };

    // Configure layout animations for smooth container resizing
    const springyLayoutAnimation = {
      duration: 200,
      create: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: 0.7,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.7,
      },
      delete: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: 0.7,
      },
    };

    // Configure layout animations for smooth container resizing
    LayoutAnimation.configureNext(springyLayoutAnimation);

    // Fix: Combine component state with calculated visibility
    const shouldShowSecondaryDisplay = showSecondaryDisplay && this.state.secondaryDisplayVisible;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loc._.enter_amount}
        disabled={this.props.pointerEvents === 'none'}
        onPress={() => {
          if (this.textInput && this.textInput.current && typeof this.textInput.current.focus === 'function') {
            this.textInput.current.focus();
          }
        }}
      >
        <>
          <View style={styles.root}>
            {!disabled && <View style={[styles.center, stylesHook.center]} />}
            <View style={styles.flex}>
              <View style={styles.container}>
                {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                  <AnimatedView style={unitAnimatedStyle}>
                    <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{getCurrencySymbol()}</Text>
                  </AnimatedView>
                )}
                {amount !== BitcoinUnit.MAX ? (
                  <AnimatedTextInput
                    {...this.props}
                    onSelectionChange={this.handleSelectionChange}
                    testID="BitcoinAmountInput"
                    keyboardType={[BitcoinUnit.LOCAL_CURRENCY, BitcoinUnit.BTC].includes(unit) ? 'decimal-pad' : 'number-pad'}
                    adjustsFontSizeToFit={false}
                    onChangeText={text => {
                      try {
                        const currentTextLength = (text && text.length) || 0;
                        const currentAmount = this.props.amount || '';
                        const currentAmountLength = (currentAmount && currentAmount.toString().length) || 0;
                        const isPotentialPaste =
                          text && currentTextLength > 2 && (currentAmount === '' || currentTextLength > currentAmountLength + 2);
                        if (isPotentialPaste) {
                          console.log('Paste operation detected with significant length increase');
                          this.handlePasteText(text);
                        } else {
                          this.handleChangeText(text || '');
                        }
                      } catch (error) {
                        console.error('Error in onChangeText handler:', error);
                        this.handleChangeText(text || '');
                      }
                    }}
                    onBlur={() => {
                      if (this.props.onBlur) this.props.onBlur();
                    }}
                    onFocus={() => {
                      const amountStr = (this.props.amount && this.props.amount.toString()) || '';
                      const length = amountStr.length;

                      setTimeout(() => {
                        if (this.textInput && typeof this.textInput.setNativeProps === 'function') {
                          this.textInput.setNativeProps({
                            selection: { start: length, end: length },
                          });
                        }
                      }, 50);

                      if (this.props.onFocus) this.props.onFocus();
                    }}
                    placeholder="0"
                    maxLength={this.maxLength()}
                    ref={textInput => (this.textInput = textInput)}
                    editable={!this.props.isLoading && !disabled}
                    value={amount === BitcoinUnit.MAX ? loc.units.MAX : String(amount)}
                    placeholderTextColor={disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2}
                    style={[styles.input, stylesHook.input, animatedInputStyle]}
                    selection={undefined}
                    caretHidden={false}
                    autoCapitalize="none"
                    spellCheck={false}
                    autoCorrect={false}
                    textContentType="none"
                    contextMenuHidden={false}
                    disableFullscreenUI={true}
                  />
                ) : (
                  <Pressable onPress={this.resetAmount}>
                    <AnimatedText style={[styles.input, stylesHook.input, animatedInputStyle]}>{BitcoinUnit.MAX}</AnimatedText>
                  </Pressable>
                )}
                {unit !== BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                  <AnimatedView style={[unitAnimatedStyle, styles.unitContainer]}>
                    <Text style={[styles.cryptoCurrency, stylesHook.cryptoCurrency]}>{' ' + loc.units[unit]}</Text>
                  </AnimatedView>
                )}
              </View>

              {shouldShowSecondaryDisplay && (
                <AnimatedView
                  style={[
                    styles.secondaryRoot,
                    secondaryDisplayAnimatedStyle,
                    styles.secondaryMinHeight, // Use the StyleSheet style instead of inline
                  ]}
                >
                  <Text style={styles.secondaryText}>{secondaryDisplayCurrency}</Text>
                </AnimatedView>
              )}
            </View>
            {!disabled && amount !== BitcoinUnit.MAX && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={loc._.change_input_currency}
                testID="changeAmountUnitButton"
                style={styles.changeAmountUnit}
                onPress={this.changeAmountUnit}
              >
                <AnimatedImage source={require('../img/round-compare-arrows-24-px.png')} style={iconAnimatedStyle} />
              </TouchableOpacity>
            )}
          </View>
          {this.state.isRateOutdated && (
            <View style={styles.outdatedRateContainer}>
              <Badge status="warning" />
              <View style={styles.spacing8} />
              <BlueText>
                {loc.formatString(loc.send.outdated_rate, { date: dayjs(this.state.mostRecentFetchedRate.LastUpdated).format('l LT') })}
              </BlueText>
              <View style={styles.spacing8} />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={loc._.refresh}
                onPress={this.updateRate}
                disabled={this.state.isRateBeingUpdated}
                style={this.state.isRateBeingUpdated ? styles.disabledButton : styles.enabledButon}
              >
                <Icon name="sync" type="font-awesome-5" size={16} color={colors.buttonAlternativeTextColor} />
              </TouchableOpacity>
            </View>
          )}
        </>
      </Pressable>
    );
  }
}

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
    fontSize: 36,
    fontWeight: 'bold',
    alignSelf: 'center',
    justifyContent: 'center',
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
  secondaryMinHeight: {
    minHeight: 22,
  },
  changeAmountUnit: {
    alignSelf: 'center',
    marginRight: 16,
    paddingLeft: 16,
    paddingVertical: 16,
  },
  unitContainer: {
    minWidth: 40,
  },
});

const AmountInputWithStyle = props => {
  const { colors } = useTheme();
  return <AmountInput {...props} colors={colors} />;
};

AmountInputWithStyle.conversionCache = AmountInput.conversionCache;
AmountInputWithStyle.getCachedSatoshis = AmountInput.getCachedSatoshis;
AmountInputWithStyle.setCachedSatoshis = AmountInput.setCachedSatoshis;

export default AmountInputWithStyle;
