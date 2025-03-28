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
  preferredFiatCurrency,
  formatSatsInternal, // Import the function directly
} from '../blue_modules/currency';
import { BlueText } from '../BlueComponents';
import confirm from '../helpers/confirm';
import loc, { getTextSizeForAmount, parseNumberStringToFloat } from '../loc';
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

    try {
      const cachedValue = AmountInput.conversionCache[cacheKey];

      // For logging purposes
      if (cachedValue) {
        console.log(`Cache lookup exact match: ${cacheKey} → ${JSON.stringify(cachedValue)}`);
      }

      // First ensure we have a valid result before trying to use it
      if (cachedValue) {
        // Store as JSON object with both value and precision
        if (typeof cachedValue === 'object' && cachedValue.value) {
          console.log(`Found in cache: ${cacheKey} → ${cachedValue.value} with precision ${cachedValue.precision}`);

          // Validate the cached value to ensure it's a valid number
          const validNumber = !isNaN(parseInt(cachedValue.value, 10));
          if (validNumber) {
            return cachedValue.value; // Return the value directly, not the object
          } else {
            console.log(`Invalid cached value (NaN): ${cachedValue.value}`);
            return false;
          }
        } else if (!isNaN(parseInt(cachedValue, 10))) {
          // Legacy format - just the value as string or number
          console.log(`Found in cache (legacy format): ${cacheKey} → ${cachedValue}`);
          return cachedValue;
        } else {
          console.log(`Invalid cached value: ${cachedValue}`);
          return false;
        }
      }

      // No direct match, try normalized versions
      const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

      // 1. Try to find amount with standardized decimal separator
      const amountWithStandardizedDecimal = amount.replace(',', '.').replace(decimalSeparator, '.');
      const standardizedKey = amountWithStandardizedDecimal + BitcoinUnit.LOCAL_CURRENCY;
      const standardizedValue = AmountInput.conversionCache[standardizedKey];

      if (standardizedValue) {
        console.log(`Found in cache with standardized decimal: ${standardizedKey} → ${JSON.stringify(standardizedValue)}`);
        if (typeof standardizedValue === 'object' && standardizedValue.value) {
          return standardizedValue.value; // Return the value directly
        } else if (!isNaN(parseInt(standardizedValue, 10))) {
          return standardizedValue;
        }
      }

      // 2. Try to find without grouping separators
      if (groupingSeparator) {
        const safeGroupSep = groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const normalizedAmount = amount.replace(new RegExp(safeGroupSep, 'g'), '');
        const normalizedKey = normalizedAmount + BitcoinUnit.LOCAL_CURRENCY;
        const normalizedValue = AmountInput.conversionCache[normalizedKey];

        if (normalizedValue) {
          console.log(`Found in cache with removed group separators: ${normalizedKey} → ${JSON.stringify(normalizedValue)}`);
          if (typeof normalizedValue === 'object' && normalizedValue.value) {
            return normalizedValue.value; // Return the value directly
          } else if (!isNaN(parseInt(normalizedValue, 10))) {
            return normalizedValue;
          }
        }
      }

      // 3. Try with integer part only
      if (amount.includes(decimalSeparator)) {
        const integerPart = amount.split(decimalSeparator)[0];
        if (integerPart) {
          const integerOnlyKey = integerPart + BitcoinUnit.LOCAL_CURRENCY;
          const integerOnlyValue = AmountInput.conversionCache[integerOnlyKey];

          if (integerOnlyValue) {
            console.log(`Found in cache with integer part only: ${integerOnlyKey} → ${JSON.stringify(integerOnlyValue)}`);
            if (typeof integerOnlyValue === 'object' && integerOnlyValue.value) {
              return integerOnlyValue.value; // Return the value directly
            } else if (!isNaN(parseInt(integerOnlyValue, 10))) {
              return integerOnlyValue;
            }
          }
        }
      }

      console.log(
        `Cache miss for: "${amount}" - available keys:`,
        Object.keys(AmountInput.conversionCache).filter(k => k.endsWith(BitcoinUnit.LOCAL_CURRENCY)),
      );
      return false;
    } catch (error) {
      console.error('Error accessing cache:', error);
      return false;
    }
  };

  static setCachedSatoshis = (amount, sats) => {
    if (!amount || !sats) return;

    try {
      // Always get fresh locale settings
      const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();

      // Store as an object with value and precision for consistent handling
      const cacheObject = {
        value: String(sats),
        precision: amount.includes(decimalSeparator) ? amount.split(decimalSeparator)[1].length : 0,
        timestamp: Date.now(),
      };

      // 1. Store with exact key
      const cacheKey = amount + BitcoinUnit.LOCAL_CURRENCY;
      AmountInput.conversionCache[cacheKey] = cacheObject;
      console.log(`Stored in cache with exact key: ${cacheKey} → ${String(sats)}`);

      // 2. Store with standardized decimal separator
      const amountWithStandardizedDecimal = amount.replace(',', '.').replace(decimalSeparator, '.');
      const standardizedKey = amountWithStandardizedDecimal + BitcoinUnit.LOCAL_CURRENCY;
      AmountInput.conversionCache[standardizedKey] = cacheObject;

      // 3. Store with no grouping separators
      if (groupingSeparator) {
        const safeGroupSep = groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const normalizedAmount = amount.replace(new RegExp(safeGroupSep, 'g'), '');
        const normalizedKey = normalizedAmount + BitcoinUnit.LOCAL_CURRENCY;
        AmountInput.conversionCache[normalizedKey] = cacheObject;
        console.log(`Also stored with normalized key: ${normalizedKey} → ${String(sats)}`);
      }

      // 4. Store with just integer part
      if (amount.includes(decimalSeparator)) {
        const integerPart = amount.split(decimalSeparator)[0];
        if (integerPart.length > 0) {
          const integerOnlyKey = integerPart + BitcoinUnit.LOCAL_CURRENCY;
          AmountInput.conversionCache[integerOnlyKey] = cacheObject;
          console.log(`Also stored with integer-only key: ${integerOnlyKey} → ${String(sats)}`);
        }
      }
    } catch (error) {
      console.error('Error setting cache:', error);
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

      // Always keep the secondary display visible
      unitOpacity: new Animated.Value(1),
      unitTranslateY: new Animated.Value(0),
      secondaryDisplayOpacity: new Animated.Value(1),
      iconOpacity: new Animated.Value(1), // Separate animated value just for the icon
      secondaryDisplayVisible: true, // Always true
      forceShowSecondaryDisplay: true, // Always true to force display
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

    // Reset the icon opacity to 1 before starting animation (important)
    this.state.iconOpacity.setValue(1);

    // Simple fade out and in for the button - just once
    Animated.sequence([
      // Quick fade out
      Animated.timing(this.state.iconOpacity, {
        toValue: 0.3, // Don't go completely invisible
        duration: 100,
        useNativeDriver: true,
      }),
      // Fade back in
      Animated.timing(this.state.iconOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Continue with the rest of the animations for other elements
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
      // Get locale settings
      const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
      console.log(`Conversion with locale settings - decimal: ${decimalSeparator}, group: ${groupingSeparator}`);

      if (previousUnit === BitcoinUnit.LOCAL_CURRENCY) {
        // For local currency, check cache first
        const cachedResult = AmountInput.getCachedSatoshis(amount);
        if (cachedResult) {
          // Handle cached value
          console.log(`Using cached value for ${amount}: ${cachedResult}`);
          sats = parseInt(cachedResult, 10);
        } else {
          const numericAmount = parseNumberStringToFloat(amount.toString());
          console.log(`No valid cache hit. Parsed LOCAL_CURRENCY amount: ${numericAmount}`);

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

            // Important: Cache this calculated value for the EXACT current amount format
            AmountInput.setCachedSatoshis(amount, sats);
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
        // Handle SATS input - remove any grouping separators first
        let sanitizedAmount = amount.toString();
        if (groupingSeparator) {
          const groupSepRegex = new RegExp(groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          sanitizedAmount = sanitizedAmount.replace(groupSepRegex, '');
        }
        // Parse as integer
        sats = parseInt(sanitizedAmount, 10) || 0;
        console.log(`SATS parsed: ${sanitizedAmount} → ${sats}`);
      }

      let newInputValue = '0'; // Default value
      if (newUnit === BitcoinUnit.BTC) {
        try {
          // Ensure sats is a valid number before continuing
          if (isNaN(sats)) {
            console.warn('Invalid sats value detected, resetting to 0');
            sats = 0;
          }

          const btcValue = new BigNumber(sats).dividedBy(100000000);
          const formattedBtc = btcValue.toFixed(8);

          // CRITICAL FIX: Handle "trailing zero" formatting using our device decimal separator
          let trimmedBtc;
          // If the BTC value is a whole number with only zeroes after decimal
          if (/\.0+$/.test(formattedBtc)) {
            // We want to retain at least one decimal place for better editing
            trimmedBtc = `${formattedBtc.split('.')[0]}${decimalSeparator}0`;
          } else {
            // For other values, keep significant decimals but replace the separator
            // First remove trailing zeros after the last significant digit
            const withoutTrailingZeros = formattedBtc.replace(/(\.\d*?)0+$/, '$1');
            // Now replace the decimal point with device's decimal separator
            trimmedBtc = withoutTrailingZeros.replace('.', decimalSeparator);
          }

          newInputValue = trimmedBtc;
          console.log(`SATS ${sats} → BTC formatted: ${newInputValue}`);
        } catch (error) {
          console.error('Error formatting BTC value:', error);
          newInputValue = `0${decimalSeparator}0`;
        }
      } else if (newUnit === BitcoinUnit.LOCAL_CURRENCY) {
        try {
          const localAmount = satoshiToLocalCurrency(sats, false);
          if (localAmount === '...' || isNaN(parseFloat(localAmount))) {
            newInputValue = `0${decimalSeparator}00`;
          } else {
            const decimals = getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY);
            const numValue = parseFloat(localAmount);
            const parts = numValue.toFixed(decimals).split('.');
            const integerPart = parts[0];
            const decimalPart = parts.length > 1 ? parts[1] : '';
            let formattedInteger = '';
            for (let i = 0; i < integerPart.length; i++) {
              if (i > 0 && (integerPart.length - i) % 3 === 0) {
                formattedInteger += groupingSeparator;
              }
              formattedInteger += integerPart[i];
            }

            if (decimals > 0) {
              const paddedDecimalPart = decimalPart.padEnd(decimals, '0');
              newInputValue = `${formattedInteger}${decimalSeparator}${paddedDecimalPart}`;
            } else {
              newInputValue = formattedInteger;
            }

            console.log(`SATS ${sats} → LOCAL custom formatted: ${newInputValue}`);
          }
        } catch (error) {
          console.error('Error formatting local currency:', error);
          newInputValue = `0${decimalSeparator}00`;
        }
      } else if (newUnit === BitcoinUnit.SATS) {
        // Format with grouping separators
        try {
          const formattedSats = formatSatsInternal(sats);
          newInputValue = formattedSats;
          console.log(`SATS ${sats} formatted: ${newInputValue}`);
        } catch (error) {
          console.error('Error formatting SATS:', error);
          newInputValue = '0';
        }
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

    this.animateUnitChange();

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
        return 20;
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
      const previousAmount = this.props.amount;

      switch (this.props.unit) {
        case BitcoinUnit.LOCAL_CURRENCY:
          this.handleLocalCurrencyInput(text);

          if (previousAmount && previousAmount !== text) {
            const cachedSats = AmountInput.getCachedSatoshis(previousAmount);
            if (cachedSats) {
              const previousPlain = previousAmount.replace(/[.,\s]/g, '');
              const currentPlain = text.replace(/[.,\s]/g, '');

              if (previousPlain === currentPlain) {
                AmountInput.setCachedSatoshis(text, cachedSats);
              }
            }
          }
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
    const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;

    let maxDecimalPlaces = 2;
    try {
      maxDecimalPlaces = getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY);
    } catch (error) {
      console.error('Error getting decimal places:', error);
    }

    console.log(
      `Using device locale: ${deviceLocale} | decimal="${decimalSeparator}" | group="${groupingSeparator}" | maxDecimals=${maxDecimalPlaces}`,
    );
    console.log(`Raw input text: "${text}"`);

    const safeGroupSep = groupingSeparator ? groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    // Remove unused variable declaration and directly escape decimalSeparator in the regex

    if (text === decimalSeparator) {
      this.props.onChangeText(`0${decimalSeparator}`);
      return;
    }

    // Escape decimalSeparator directly where needed
    const escapedDecimalSep = decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const validCharsPattern = new RegExp(`[^\\d${escapedDecimalSep}${safeGroupSep}-]`, 'g');

    const sanitizedText = text.replace(validCharsPattern, '');
    console.log(`After removing invalid chars: "${sanitizedText}"`);

    let integerPart = '';
    let decimalPart = '';
    let hasDecimalSeparator = false;

    if (sanitizedText.includes(decimalSeparator)) {
      hasDecimalSeparator = true;
      const parts = sanitizedText.split(decimalSeparator);
      integerPart = parts[0] || '';
      decimalPart = parts.length > 1 ? parts[1] : '';

      if (decimalPart.length > maxDecimalPlaces) {
        decimalPart = decimalPart.substring(0, maxDecimalPlaces);
      }

      if (groupingSeparator && integerPart.includes(groupingSeparator)) {
        const groupSepRegex = new RegExp(safeGroupSep, 'g');
        integerPart = integerPart.replace(groupSepRegex, '');
        console.log(`Integer part after removing separators: "${integerPart}"`);
      }
    } else {
      integerPart = sanitizedText;

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
      if (decimalPart.length > 0 && !decimalPart.split('').every(digit => digit === '0')) {
        formattedResult = `${formattedInteger}${decimalSeparator}${decimalPart}`;
      } else if (text.endsWith(decimalSeparator)) {
        formattedResult = `${formattedInteger}${decimalSeparator}`;
      } else {
        formattedResult = formattedInteger;
      }
    } else {
      formattedResult = formattedInteger;
    }

    console.log(`Final formatted result: "${formattedResult}"`);

    const previousAmount = this.props.amount;

    this.props.onChangeText(formattedResult);

    if (previousAmount && previousAmount !== formattedResult) {
      const cachedSats = AmountInput.getCachedSatoshis(previousAmount);
      if (cachedSats) {
        let prevIntPart = previousAmount;
        let newIntPart = formattedResult;

        if (groupingSeparator) {
          const groupSepRegex = new RegExp(groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          prevIntPart = prevIntPart.replace(groupSepRegex, '');
          newIntPart = newIntPart.replace(groupSepRegex, '');
        }

        if (prevIntPart.includes(decimalSeparator)) {
          prevIntPart = prevIntPart.split(decimalSeparator)[0];
        }
        if (newIntPart.includes(decimalSeparator)) {
          newIntPart = newIntPart.split(decimalSeparator)[0];
        }

        if (prevIntPart === newIntPart) {
          console.log(`Updating cache for decimal change format: ${formattedResult} → ${cachedSats}`);
          AmountInput.setCachedSatoshis(formattedResult, cachedSats);
        }
      }
    }
  };

  handleBtcInput = text => {
    const { decimalSeparator } = RNLocalize.getNumberFormatSettings();
    const maxDecimalPlaces = 8;
    console.log(`BTC input with device settings - decimal: ${decimalSeparator}`);

    // Important: Allow exact input of the decimal separator even when it's the first character
    if (text === decimalSeparator) {
      // If the user just typed the decimal separator, allow it and prepend a zero
      this.props.onChangeText(`0${decimalSeparator}`);
      return;
    }

    // Handle the case when the text starts with decimal separator
    if (text.startsWith(decimalSeparator)) {
      text = `0${text}`;
    }

    const safeDecimalSeparator = decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const invalidCharsPattern = new RegExp(`[^\\d${safeDecimalSeparator}\\-]`, 'g');
    let cleanedInput = text.replace(invalidCharsPattern, '');

    if (cleanedInput.includes(decimalSeparator)) {
      const parts = cleanedInput.split(decimalSeparator);
      const integerPart = parts[0] || '0'; // Default to '0' if empty
      let decimalPart = parts.slice(1).join('');
      if (decimalPart.length > maxDecimalPlaces) {
        decimalPart = decimalPart.substring(0, maxDecimalPlaces);
      }
      cleanedInput = `${integerPart}${decimalSeparator}${decimalPart}`;
    }

    this.props.onChangeText(cleanedInput);
  };

  handleSatsInput = text => {
    try {
      const digitsOnly = text.replace(/\D/g, '');
      const number = parseInt(digitsOnly || '0', 10);

      // Use the exportable formatSatsInternal function that handles locale consistently
      const formatted = formatSatsInternal(number);
      this.props.onChangeText(formatted);
    } catch (error) {
      console.error('Error formatting SATS value:', error);
      // Fallback to just the digits
      this.props.onChangeText(text.replace(/\D/g, ''));
    }
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
      duration: 150,
      useNativeDriver: false,
    }).start();

    return this.state.fontSizeAnimated;
  };

  render() {
    const { colors, disabled, unit } = this.props;
    const amount = this.props.amount || '';
    let secondaryDisplayCurrency = '';
    let sat;

    if (amount !== '' && amount !== BitcoinUnit.MAX) {
      switch (unit) {
        case BitcoinUnit.BTC:
          try {
            const btcValue = parseNumberStringToFloat(amount.toString());
            if (isNaN(btcValue)) {
              secondaryDisplayCurrency = satoshiToLocalCurrency(0, true);
            } else {
              sat = new BigNumber(btcValue).multipliedBy(100000000).toString();

              // Use the same formatting rules for both main display and secondary display
              const formattedValue = formatNumberWithLocale(
                satoshiToLocalCurrency(sat, false),
                getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY),
              );

              secondaryDisplayCurrency = `${preferredFiatCurrency.endPointKey}${getCurrencySymbol()} ${formattedValue}`;
            }
          } catch (error) {
            console.error('Error formatting secondary display:', error);
            secondaryDisplayCurrency = satoshiToLocalCurrency(0, true);
          }
          break;

        case BitcoinUnit.SATS:
          try {
            let normalizedAmount = amount.toString();
            const { groupingSeparator } = localeSettings;
            if (groupingSeparator) {
              const safeGroupSep = groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              normalizedAmount = normalizedAmount.replace(new RegExp(safeGroupSep, 'g'), '');
            }
            normalizedAmount = normalizedAmount.replace(/\D/g, '');
            const satsValue = parseInt(normalizedAmount, 10);

            if (isNaN(satsValue)) {
              secondaryDisplayCurrency = `${getCurrencySymbol()} 0`;
            } else {
              // Use the same formatting rules for both main display and secondary display
              const formattedValue = formatNumberWithLocale(
                satoshiToLocalCurrency(satsValue, false),
                getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY),
              );

              secondaryDisplayCurrency = `${formattedValue} ${getCurrencySymbol()}`;
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
              // Consistent formatting using the same function for both displays
              const btcValue = satoshiToBTC(cachedSats);

              // Format the BTC value consistently with the input display
              const formattedBtcValue = formatNumberWithLocale(btcValue, 8);

              secondaryDisplayCurrency = `${formattedBtcValue} ${loc.units[BitcoinUnit.BTC]}`;
            } else {
              const fiatValue = parseNumberStringToFloat(amount.toString());
              if (isNaN(fiatValue)) {
                secondaryDisplayCurrency = `0 ${loc.units[BitcoinUnit.BTC]}`;
              } else {
                const btcValue = fiatToBTC(fiatValue);

                // Use consistent formatting for all display values
                const formattedBtcValue = formatNumberWithLocale(btcValue, 8);

                secondaryDisplayCurrency = `${formattedBtcValue} ${loc.units[BitcoinUnit.BTC]}`;
              }
            }
          } catch (error) {
            console.error('Error in local currency conversion:', error);
            secondaryDisplayCurrency = `0 ${loc.units[BitcoinUnit.BTC]}`;
          }
          break;
      }
    }

    if (secondaryDisplayCurrency === 'NaN' || secondaryDisplayCurrency.includes('NaN')) {
      if (unit === BitcoinUnit.LOCAL_CURRENCY) {
        secondaryDisplayCurrency = `0 ${loc.units[BitcoinUnit.BTC]}`;
      } else {
        const currencySymbol = getCurrencySymbol();
        secondaryDisplayCurrency = `0 ${currencySymbol}`;
      }
    }

    const stylesHook = StyleSheet.create({
      center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
      localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
      input: {
        color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2,
      },
      unitText: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
    });

    const animatedInputStyle = {
      fontSize: this.state.fontSizeAnimated,
      opacity: this.state.textOpacity,
      transform: [{ scale: this.state.textScale }],
    };

    const unitAnimatedStyle = {
      opacity: this.state.unitOpacity,
      transform: [{ translateY: this.state.unitTranslateY }],
    };

    const secondaryDisplayAnimatedStyle = {
      opacity: this.state.secondaryDisplayOpacity,
    };

    const iconAnimatedStyle = {
      opacity: this.state.iconOpacity,
    };

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

    LayoutAnimation.configureNext(springyLayoutAnimation);

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
                  <AnimatedView style={[unitAnimatedStyle, styles.localCurrencyContainer]}>
                    <Text style={[styles.localCurrencyCode, stylesHook.localCurrency]}>{preferredFiatCurrency?.endPointKey}</Text>
                    <Text style={[styles.localCurrencySymbol, stylesHook.localCurrency]}>{getCurrencySymbol()}</Text>
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
                {amount !== BitcoinUnit.MAX && unit !== BitcoinUnit.LOCAL_CURRENCY && (
                  <AnimatedView style={[unitAnimatedStyle, styles.unitContainer]}>
                    <Text style={[styles.unitText, stylesHook.unitText]}>{' ' + loc.units[unit]}</Text>
                  </AnimatedView>
                )}
              </View>

              <AnimatedView style={[styles.secondaryRoot, secondaryDisplayAnimatedStyle, styles.secondaryMinHeight]}>
                <Text style={styles.secondaryText}>{secondaryDisplayCurrency}</Text>
              </AnimatedView>
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
  localCurrencyContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  localCurrencyCode: {
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginBottom: 2,
  },
  localCurrencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    alignSelf: 'center',
  },

  input: {
    fontSize: 36,
    fontWeight: 'bold',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 15,
    marginHorizontal: 4,
    fontWeight: '600',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  secondaryRoot: {
    alignItems: 'center',
    marginBottom: 22,
    marginTop: 8,
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
