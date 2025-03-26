import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Image, LayoutAnimation, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Badge, Icon, Text } from '@rneui/themed';
import * as RNLocalize from 'react-native-localize';

import {
  fiatToBTC,
  getCurrencySymbol,
  getDecimalPlaces,
  isRateOutdated,
  localeSettings,
  mostRecentFetchedRate,
  satoshiToBTC,
  satoshiToLocalCurrency,
  updateExchangeRate,
  updateLocaleSettings,
} from '../blue_modules/currency';
import { BlueText } from '../BlueComponents';
import confirm from '../helpers/confirm';
import loc, { parseNumberStringToFloat } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { useTheme } from './themes';

dayjs.extend(localizedFormat);

class AmountInput extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    /**
     * amount is a sting thats always in current unit denomination, e.g. '0.001' or '9.43' or '10000'
     */
    amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /**
     * callback that returns currently typed amount, in current denomination, e.g. 0.001 or 10000 or $9.34
     * (btc, sat, fiat)
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

    // Try with normalized amount (without group separators) as fallback
    try {
      // Check for comma-formatted values
      if (amount.includes(',')) {
        const cleanKey = amount.replace(/,/g, '') + BitcoinUnit.LOCAL_CURRENCY;
        const cleanValue = AmountInput.conversionCache[cleanKey];
        if (cleanValue) {
          console.log(`Found in cache with comma-normalized key: ${cleanKey} → ${cleanValue}`);
          return cleanValue;
        }
      }

      // If amount has decimals, try removing them for cache lookup
      if (amount.includes('.')) {
        const noDecimalsKey = amount.split('.')[0] + BitcoinUnit.LOCAL_CURRENCY;
        const noDecimalsValue = AmountInput.conversionCache[noDecimalsKey];
        if (noDecimalsValue) {
          console.log(`Found in cache with no-decimals key: ${noDecimalsKey} → ${noDecimalsValue}`);
          return noDecimalsValue;
        }
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
    } catch (error) {
      console.log('Error in normalized cache lookup:', error);
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
    try {
      // Store without commas
      if (amount.includes(',')) {
        const noCommasKey = amount.replace(/,/g, '') + BitcoinUnit.LOCAL_CURRENCY;
        AmountInput.conversionCache[noCommasKey] = satsString;
      }

      // Store without decimal part if it exists
      if (amount.includes('.')) {
        const noDecimalsKey = amount.split('.')[0] + BitcoinUnit.LOCAL_CURRENCY;
        AmountInput.conversionCache[noDecimalsKey] = satsString;
      }

      // Store with device locale separators normalized
      const { groupSeparator } = localeSettings;
      if (groupSeparator && amount.includes(groupSeparator)) {
        const normalizedAmount = amount.replace(new RegExp('\\' + groupSeparator, 'g'), '');
        const normalizedKey = normalizedAmount + BitcoinUnit.LOCAL_CURRENCY;
        AmountInput.conversionCache[normalizedKey] = satsString;
      }
    } catch (error) {
      console.log('Error in normalized cache storage:', error);
    }
  };

  constructor() {
    super();
    this.state = { mostRecentFetchedRate: Date(), isRateOutdated: false, isRateBeingUpdated: false };
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
    // If amount changed, ensure cursor is at the end
    if (this.props.amount !== prevProps.amount && this.textInput) {
      const length = (this.props.amount && this.props.amount.toString().length) || 0;
      // Use a timeout to ensure the cursor update happens after React's render cycle
      setTimeout(() => {
        if (this.textInput) {
          this.textInput.setNativeProps({
            selection: { start: length, end: length },
          });
        }
      }, 0);
    }
  }

  /**
   * here we must recalculate old amont value (which was denominated in `previousUnit`) to new denomination `newUnit`
   * and fill this value in input box, so user can switch between, for example, 0.001 BTC <=> 100000 sats
   *
   * @param previousUnit {string} one of {BitcoinUnit.*}
   * @param newUnit {string} one of {BitcoinUnit.*}
   */
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
          // If no cache, parse using our locale-aware function
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

        // Remove any non-digit characters including grouping separators
        if (groupingSeparator) {
          const safeGroupingSep = groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          normalizedAmount = normalizedAmount.replace(new RegExp(safeGroupingSep, 'g'), '');
        }

        // Remove any other non-digit characters
        normalizedAmount = normalizedAmount.replace(/\D/g, '');

        // Parse to integer
        sats = parseInt(normalizedAmount || '0', 10);
        console.log(`SATS normalized: "${amount}" → "${normalizedAmount}" = ${sats}`);
      }

      // Safety check for extremely large values
      const MAX_SAFE_SATS = 2100000000000000; // 21 million BTC in satoshis
      if (sats > MAX_SAFE_SATS) {
        console.warn(`Extremely large satoshi value detected: ${sats}, capping to max supply`);
        sats = MAX_SAFE_SATS;
      }

      // Get fresh device locale settings for formatting
      const deviceLocale = RNLocalize.getLocales()[0].languageTag;
      console.log(`Unit change locale settings: locale=${deviceLocale}, decimal=${decimalSeparator}, group=${groupingSeparator}`);

      // Format the output based on the new unit and locale
      let newInputValue = '0'; // Default value

      if (newUnit === BitcoinUnit.BTC) {
        // *** IMPROVED BTC FORMATTING: Use BigNumber and respect locale ***
        try {
          // Convert to BTC - with proper decimal places
          const btcValue = new BigNumber(sats).dividedBy(100000000);

          // Format to string first with 8 decimal places max
          const formattedBtc = btcValue.toFixed(8);

          // Remove trailing zeros, but ensure we have at least one decimal place
          let trimmedBtc = formattedBtc.replace(/\.?0+$/, '');
          if (!trimmedBtc.includes('.')) {
            trimmedBtc += '.0';
          }

          // Replace the decimal separator with device's if needed
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
        // *** IMPROVED SATS FORMATTING: Use Intl.NumberFormat with correct locale ***
        try {
          // Ensure we have an integer
          const satsInt = Math.round(sats);

          // Use Intl.NumberFormat with device locale
          newInputValue = new Intl.NumberFormat(deviceLocale, {
            useGrouping: true,
            maximumFractionDigits: 0,
          }).format(satsInt);

          console.log(`SATS formatted with locale: ${satsInt} → "${newInputValue}"`);
        } catch (error) {
          console.error('Error formatting SATS value:', error);
          // Fallback to simple string without formatting
          newInputValue = String(Math.round(sats));
        }
      } else if (newUnit === BitcoinUnit.LOCAL_CURRENCY) {
        try {
          const localAmount = satoshiToLocalCurrency(sats, false);

          if (localAmount === '...' || isNaN(parseFloat(localAmount))) {
            newInputValue = '0.00';
          } else {
            const decimals = getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY);

            // Use Intl.NumberFormat for consistent locale-aware formatting
            newInputValue = new Intl.NumberFormat(deviceLocale, {
              minimumFractionDigits: Math.min(2, decimals),
              maximumFractionDigits: decimals,
              useGrouping: true,
            }).format(parseFloat(localAmount));

            console.log(`SATS ${sats} → LOCAL formatted: ${newInputValue}`);
          }
        } catch (error) {
          console.error('Error formatting local currency:', error);
          // Use a safe default with proper decimal separator
          newInputValue = `0${decimalSeparator}00`;
        }
      }

      console.log(`FINAL CONVERSION: "${amount}" (${previousUnit}) → "${newInputValue}" (${newUnit}) | SATS: ${sats}`);

      // Always cache conversions involving local currency
      if ((previousUnit === BitcoinUnit.SATS || previousUnit === BitcoinUnit.BTC) && newUnit === BitcoinUnit.LOCAL_CURRENCY) {
        AmountInput.setCachedSatoshis(newInputValue, sats.toString());
        console.log(`Cached conversion to LOCAL_CURRENCY:`, { key: newInputValue, value: sats });
      }

      this.props.onChangeText(newInputValue);
      this.props.onAmountUnitChange(newUnit);
    } catch (error) {
      console.error('Critical error in currency conversion:', error);
      // Provide safe fallback with proper decimal separator
      const { decimalSeparator } = RNLocalize.getNumberFormatSettings();
      const safeValue = newUnit === BitcoinUnit.LOCAL_CURRENCY ? `0${decimalSeparator}00` : '0';
      this.props.onChangeText(safeValue);
      this.props.onAmountUnitChange(newUnit);
    }
  }

  /**
   * responsible for cycling currently selected denomination, BTC->SAT->LOCAL_CURRENCY->BTC
   */
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
    this.onAmountUnitChange(previousUnit, newUnit);
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

  // Local currency input handling with proper locale awareness
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
    // This explicitly uses RNLocalize settings rather than locale conventions

    // For safe regex handling, escape any special characters
    const safeDecimalSep = decimalSeparator ? decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const safeGroupSep = groupingSeparator ? groupingSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    // Remove any characters that are not digits or our expected separators
    const validCharsPattern = new RegExp(`[^\\d${safeDecimalSep}${safeGroupSep}-]`, 'g');
    const sanitizedText = text.replace(validCharsPattern, '');
    console.log(`After removing invalid chars: "${sanitizedText}"`);

    let integerPart = '';
    let decimalPart = '';
    let hasDecimalSeparator = false;

    // First check: does the input contain the decimal separator from RNLocalize?
    if (sanitizedText.includes(decimalSeparator)) {
      hasDecimalSeparator = true;
      const parts = sanitizedText.split(decimalSeparator);

      // Take only the first part before the first decimal separator
      integerPart = parts[0] || '';

      // Take the first part after the first decimal separator
      decimalPart = parts.length > 1 ? parts[1] : '';

      // Limit decimal places to the maximum allowed
      if (decimalPart.length > maxDecimalPlaces) {
        decimalPart = decimalPart.substring(0, maxDecimalPlaces);
      }

      // Now, VERY IMPORTANT: If the decimal separator is used, remove ALL grouping separators
      // This is because we're now dealing with the integer part specifically
      if (groupingSeparator && integerPart.includes(groupingSeparator)) {
        console.log(`Removing grouping separators from integer part: "${integerPart}"`);
        const groupSepRegex = new RegExp(safeGroupSep, 'g');
        integerPart = integerPart.replace(groupSepRegex, '');
        console.log(`Integer part after removing separators: "${integerPart}"`);
      }
    } else {
      // No decimal separator - this is all integer part
      integerPart = sanitizedText;

      // CRITICAL: If we have grouping separators, we must keep them intact at this stage
      // We'll only format them later
    }

    // Remove any non-digits from both parts (but keep the separators intact for now)
    integerPart = integerPart.replace(/[^\d]/g, '');
    decimalPart = decimalPart.replace(/[^\d]/g, '');

    console.log(`Parsed: integer="${integerPart}", decimal="${decimalPart}"`);

    // Now format the integer part with proper group separators
    let formattedInteger = '';

    if (integerPart.length > 0) {
      // Manual formatting to ensure consistent grouping
      for (let i = 0; i < integerPart.length; i++) {
        // Add grouping separator every 3 digits from the right
        if (i > 0 && (integerPart.length - i) % 3 === 0) {
          formattedInteger += groupingSeparator;
        }
        formattedInteger += integerPart[i];
      }
    } else {
      formattedInteger = '0'; // Default to '0' for empty input
    }

    // Combine the parts back together with the correct separators
    let formattedResult;
    if (hasDecimalSeparator || decimalPart.length > 0) {
      // If there was a decimal separator in the input or we have decimal digits
      formattedResult = `${formattedInteger}${decimalSeparator}${decimalPart}`;
    } else if (text.endsWith(decimalSeparator)) {
      // Special case: user just added a decimal separator at the end
      formattedResult = `${formattedInteger}${decimalSeparator}`;
    } else {
      // No decimal part
      formattedResult = formattedInteger;
    }

    console.log(`Final formatted result: "${formattedResult}"`);
    this.props.onChangeText(formattedResult);
  };

  // BTC input handling - respect device locale for decimal separator
  handleBtcInput = text => {
    // Get fresh device locale settings
    const { decimalSeparator } = RNLocalize.getNumberFormatSettings();
    const maxDecimalPlaces = 8;

    console.log(`BTC input with device settings - decimal: ${decimalSeparator}`);

    // Remove any characters that are not digits or decimal separator
    const safeDecimalSeparator = decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create a regex that excludes decimal separator and digits
    const invalidCharsPattern = new RegExp(`[^\\d${safeDecimalSeparator}\\-]`, 'g');
    let cleanedInput = text.replace(invalidCharsPattern, '');

    // Only process decimal part if user has entered a decimal separator
    if (cleanedInput.includes(decimalSeparator)) {
      const parts = cleanedInput.split(decimalSeparator);
      // Take only first occurrence of decimal separator
      const integerPart = parts[0];
      let decimalPart = parts.slice(1).join('');

      // Limit to max decimal places for BTC
      if (decimalPart.length > maxDecimalPlaces) {
        decimalPart = decimalPart.substring(0, maxDecimalPlaces);
      }

      cleanedInput = `${integerPart}${decimalSeparator}${decimalPart}`;
    }

    // Pass the formatted value
    this.props.onChangeText(cleanedInput);
  };

  // Fix the SATS input to prevent any decimals and use device locale for grouping
  handleSatsInput = text => {
    // Get fresh device locale settings
    const { groupingSeparator } = RNLocalize.getNumberFormatSettings();
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;

    console.log(`SATS input with device locale: ${deviceLocale}, group separator: ${groupingSeparator}`);

    // Remove all non-digits including any decimal separators
    const digitsOnly = text.replace(/\D/g, '');

    // Format with device-appropriate thousands separators
    let formatted;
    try {
      formatted = new Intl.NumberFormat(deviceLocale, {
        useGrouping: true,
        maximumFractionDigits: 0,
      }).format(parseInt(digitsOnly || '0', 10));
    } catch (error) {
      console.error('Error using Intl.NumberFormat for SATS:', error);
      // Fallback to simple regex-based formatting with device group separator
      const safeGroupSeparator = groupingSeparator || ',';
      formatted = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, safeGroupSeparator);
    }

    this.props.onChangeText(formatted);
  };

  resetAmount = async () => {
    if (await confirm(loc.send.reset_amount, loc.send.reset_amount_confirm)) {
      this.props.onChangeText();
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

  // Improved cursor handling method
  handleSelectionChange = event => {
    // Always force cursor to the end when typing
    const { selection } = event.nativeEvent;
    const amount = this.props.amount || '';
    const length = amount.toString().length;

    // Only intervene if cursor isn't at the end (but don't interfere with selection)
    if (selection.start === selection.end && selection.start !== length) {
      // Use a timeout to avoid conflicts with native cursor behaviors
      setTimeout(() => {
        if (this.textInput) {
          this.textInput.setNativeProps({
            selection: { start: length, end: length },
          });
        }
      }, 10);
    }
  };

  // Enhanced method to handle pasted text with better format detection and conversion
  handlePasteText = text => {
    try {
      console.log(`Handling pasted text: "${text}"`);

      // Check for empty text
      if (!text || text.trim() === '') return;

      // Get device's separator settings (what we need to convert TO)
      const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
      console.log(`Device separators - decimal: ${decimalSeparator}, group: ${groupingSeparator}`);

      // Special case: check for non-numeric text that might have been pasted by mistake
      if (text.replace(/[,.\s\d\-+]/g, '').length > 0) {
        console.log('Pasted text contains non-numeric characters, using standard text handling');
        this.handleChangeText(text);
        return;
      }

      // Analyze separators in the pasted text
      const hasPeriod = text.includes('.');
      const hasComma = text.includes(',');

      // Extract integer and decimal parts based on the format detection
      let integerPart = '';
      let decimalPart = '';

      // STEP 1: EXTRACT INTEGER AND DECIMAL PARTS
      if (hasPeriod && hasComma) {
        // Format has both separators - need to determine which is which
        const lastPeriod = text.lastIndexOf('.');
        const lastComma = text.lastIndexOf(',');

        if (lastPeriod > lastComma) {
          // US format: 1,234.56 (period is decimal)
          const parts = text.split('.');
          integerPart = parts[0].replace(/,/g, ''); // Remove thousands separators
          decimalPart = parts[1] || '';
          console.log(`Detected US format (1,234.56): integer=${integerPart}, decimal=${decimalPart}`);
        } else {
          // EU format: 1.234,56 (comma is decimal)
          const parts = text.split(',');
          integerPart = parts[0].replace(/\./g, ''); // Remove thousands separators
          decimalPart = parts[1] || '';
          console.log(`Detected EU format (1.234,56): integer=${integerPart}, decimal=${decimalPart}`);
        }
      } else if (hasPeriod) {
        // Only has periods - assume it's a decimal separator
        const parts = text.split('.');
        if (parts.length === 2) {
          // Single period - treat as decimal: 1234.56
          integerPart = parts[0];
          decimalPart = parts[1];
          console.log(`Detected decimal period format (1234.56): integer=${integerPart}, decimal=${decimalPart}`);
        } else {
          // Multiple periods - strip them all as grouping: 1.234.567
          integerPart = text.replace(/\./g, '');
          console.log(`Detected multiple periods - treating as grouping: integer=${integerPart}`);
        }
      } else if (hasComma) {
        // Only has commas
        const parts = text.split(',');
        if (parts.length === 2) {
          // Single comma - treat as decimal: 1234,56
          integerPart = parts[0];
          decimalPart = parts[1];
          console.log(`Detected decimal comma format (1234,56): integer=${integerPart}, decimal=${decimalPart}`);
        } else {
          // Multiple commas - strip them all as grouping: 1,234,567
          integerPart = text.replace(/,/g, '');
          console.log(`Detected multiple commas - treating as grouping: integer=${integerPart}`);
        }
      } else {
        // No separators - just digits
        integerPart = text;
        console.log(`No separators detected: integer=${integerPart}`);
      }

      // Clean up any leftover non-digits
      integerPart = integerPart.replace(/\D/g, '');
      decimalPart = decimalPart.replace(/\D/g, '');

      // STEP 2: DETERMINE DECIMALS TO USE BASED ON CURRENT UNIT
      let maxDecimals;
      switch (this.props.unit) {
        case BitcoinUnit.LOCAL_CURRENCY:
          try {
            maxDecimals = getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY);
          } catch (e) {
            maxDecimals = 2;
          }
          break;
        case BitcoinUnit.BTC:
          maxDecimals = 8;
          break;
        case BitcoinUnit.SATS:
          maxDecimals = 0; // no decimals for sats
          break;
        default:
          maxDecimals = 2;
      }

      // Limit decimal part length if needed
      if (decimalPart.length > maxDecimals) {
        decimalPart = decimalPart.substring(0, maxDecimals);
      }

      // STEP 3: FORMAT WITH PROPER DEVICE SEPARATORS

      // Format integer part with grouping separators
      let formattedInteger = '';
      if (integerPart) {
        for (let i = 0; i < integerPart.length; i++) {
          // Add grouping separator every 3 digits from right
          if (i > 0 && (integerPart.length - i) % 3 === 0) {
            formattedInteger += groupingSeparator;
          }
          formattedInteger += integerPart[i];
        }
      } else {
        formattedInteger = '0';
      }

      // Build final result
      let result;
      if (decimalPart && maxDecimals > 0) {
        result = `${formattedInteger}${decimalSeparator}${decimalPart}`;
      } else {
        result = formattedInteger;
      }

      console.log(`Final formatted result: "${text}" → "${result}"`);
      this.props.onChangeText(result);
    } catch (error) {
      console.error('Error in paste handling:', error);
      // Fall back to standard handling
      this.handleChangeText(text);
    }
  };

  // Rename to formatNumberWithLocale to avoid duplication - enhanced version
  formatNumberWithLocale = (number, decimals) => {
    try {
      // Handle NaN and Infinity
      if (!isFinite(number)) {
        console.warn(`Attempt to format non-finite number: ${number}`);
        return '0';
      }

      const { decimalSeparator, groupingSeparator } = RNLocalize.getNumberFormatSettings();
      const deviceLocale = RNLocalize.getLocales()[0].languageTag;

      // Safety check: ensure decimals is a positive number
      decimals = Math.max(0, Math.min(20, decimals || 0));

      // Format with appropriate decimal places
      let formatted;

      try {
        // Try using Intl.NumberFormat first (more accurate for locales)
        formatted = new Intl.NumberFormat(deviceLocale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals,
          useGrouping: true,
        }).format(number);
      } catch (intlError) {
        console.warn('Intl.NumberFormat error, using manual formatting:', intlError);

        // Manual formatting as fallback - with extra safety
        try {
          // First get the fixed string representation
          const fixedString = number.toFixed(decimals);

          // Split into integer and decimal parts
          const parts = fixedString.split('.');
          const integerPart = parts[0] || '0';
          const decimalPart = parts.length > 1 ? parts[1] : '';

          // Format integer part with grouping separators
          let formattedInteger = '';
          for (let i = 0; i < integerPart.length; i++) {
            if (i > 0 && (integerPart.length - i) % 3 === 0) {
              formattedInteger += groupingSeparator || ','; // Fallback to comma if null
            }
            formattedInteger += integerPart[i];
          }

          // Combine with decimal part if available
          if (decimalPart) {
            formatted = `${formattedInteger}${decimalSeparator || '.'}${decimalPart}`;
          } else {
            formatted = formattedInteger;
          }
        } catch (manualError) {
          console.error('Manual formatting failed:', manualError);
          // Ultimate fallback
          formatted = String(number);
        }
      }

      return formatted;
    } catch (error) {
      console.error('Error formatting number for device locale:', error);
      // Simple fallback if all formatting fails
      return String(number);
    }
  };

  getInputFontSize = () => {
    const { amount } = this.props;
    if (!amount) return 36; // Default size
    if (amount.length > 15) {
      return 16; // Very long numbers (e.g., with decimals)
    } else if (amount.length > 10) {
      return 20; // Long numbers
    }
    return 36; // Default size
  };

  render() {
    const { colors, disabled, unit } = this.props;
    const amount = this.props.amount || '';
    let secondaryDisplayCurrency = '';
    let sat;
    let showSecondaryDisplay = false;

    // Only calculate secondaryDisplayCurrency if amount is not empty
    if (amount !== '' && amount !== BitcoinUnit.MAX) {
      showSecondaryDisplay = true;
      switch (unit) {
        case BitcoinUnit.BTC:
          try {
            // Convert BTC to satoshis for accurate conversion - using locale-aware parsing
            const btcValue = parseNumberStringToFloat(amount.toString());
            if (isNaN(btcValue)) {
              secondaryDisplayCurrency = satoshiToLocalCurrency(0, true);
            } else {
              sat = new BigNumber(btcValue).multipliedBy(100000000).toString();
              // Get the formatted local currency value without currency symbol first
              const localCurrencyValue = satoshiToLocalCurrency(sat, false);
              // Then get the currency symbol separately
              const currencySymbol = getCurrencySymbol();
              // Combine in the proper order: amount followed by currency
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
            // For SATS, carefully remove all non-digit characters before parsing
            let normalizedAmount = amount.toString();

            // First, use the built-in device locale settings to handle proper formatting
            const { groupSeparator } = localeSettings;
            if (groupSeparator) {
              // Escape special regex characters
              const safeGroupSep = groupSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              normalizedAmount = normalizedAmount.replace(new RegExp(safeGroupSep, 'g'), '');
            }

            // Remove any other non-digit characters to be safe
            normalizedAmount = normalizedAmount.replace(/\D/g, '');
            // Parse as integer
            const satsValue = parseInt(normalizedAmount, 10);
            console.log(`SECONDARY DISPLAY: SATS normalized from "${amount}" to "${normalizedAmount}" = ${satsValue}`);
            if (isNaN(satsValue)) {
              // Get the formatted local currency value without currency symbol first
              const localCurrencyValue = satoshiToLocalCurrency(0, false);
              // Then get the currency symbol separately
              const currencySymbol = getCurrencySymbol();
              // Combine in the proper order: amount followed by currency
              secondaryDisplayCurrency = `${localCurrencyValue} ${currencySymbol}`;
            } else {
              // Get the formatted local currency value without currency symbol first
              const localCurrencyValue = satoshiToLocalCurrency(satsValue, false);
              // Then get the currency symbol separately
              const currencySymbol = getCurrencySymbol();
              // Combine in the proper order: amount followed by currency
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
            // For local currency conversions, try to use cached values first
            const cachedSats = AmountInput.getCachedSatoshis(amount);
            if (cachedSats) {
              // Convert cached satoshis to BTC
              const btcValue = satoshiToBTC(cachedSats);
              // Format as amount followed by unit
              secondaryDisplayCurrency = `${btcValue} ${loc.units[BitcoinUnit.BTC]}`;
            } else {
              // If no valid cached value, fall back to parsing the amount and converting
              const fiatValue = parseNumberStringToFloat(amount.toString());
              if (isNaN(fiatValue)) {
                console.warn(`Failed to parse local currency amount: "${amount}"`);
                secondaryDisplayCurrency = `0 ${loc.units[BitcoinUnit.BTC]}`;
              } else {
                // Convert fiat to BTC

                const btcValue = fiatToBTC(fiatValue);

                // For large BTC values, format with fewer decimal places
                let formattedBtcValue;
                if (parseFloat(btcValue) >= 1000) {
                  formattedBtcValue = new BigNumber(btcValue).toFixed(2); // Show only 2 decimals for large amounts
                } else if (parseFloat(btcValue) >= 100) {
                  formattedBtcValue = new BigNumber(btcValue).toFixed(4); // Show 4 decimals
                } else {
                  formattedBtcValue = btcValue; // Use default
                }

                // Remove trailing zeros
                formattedBtcValue = removeTrailingZeros(formattedBtcValue);

                // Replace decimal point with device's decimal separator if needed
                const { decimalSeparator } = RNLocalize.getNumberFormatSettings();
                if (decimalSeparator !== '.') {
                  formattedBtcValue = formattedBtcValue.replace('.', decimalSeparator);
                }

                // Format as amount followed by unit
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
        // Format correctly based on the current unit
        if (unit === BitcoinUnit.LOCAL_CURRENCY) {
          secondaryDisplayCurrency = `0 ${loc.units[BitcoinUnit.BTC]}`;
        } else {
          const currencySymbol = getCurrencySymbol();
          secondaryDisplayCurrency = `0 ${currencySymbol}`;
        }
      }
    }

    if (amount === BitcoinUnit.MAX) {
      secondaryDisplayCurrency = '';
    }

    const stylesHook = StyleSheet.create({
      center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
      localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
      input: {
        color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2,
        fontSize: this.getInputFontSize(), // Use the method instead of inline style
      },
      cryptoCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
    });

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
                  <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{getCurrencySymbol()}</Text>
                )}
                {amount !== BitcoinUnit.MAX ? (
                  <TextInput
                    {...this.props}
                    onSelectionChange={this.handleSelectionChange}
                    testID="BitcoinAmountInput"
                    keyboardType={[BitcoinUnit.LOCAL_CURRENCY, BitcoinUnit.BTC].includes(unit) ? 'decimal-pad' : 'number-pad'}
                    adjustsFontSizeToFit
                    onChangeText={text => {
                      try {
                        // Check both text and this.props.amount for null/undefined
                        const currentTextLength = (text && text.length) || 0;
                        const currentAmount = this.props.amount || '';
                        const currentAmountLength = (currentAmount && currentAmount.toString().length) || 0;

                        // Special handling for pasted text - test with safe length checks
                        const isPotentialPaste =
                          text && currentTextLength > 2 && (currentAmount === '' || currentTextLength > currentAmountLength + 2);

                        if (isPotentialPaste) {
                          // This is likely a paste operation if there's a sudden large increase in text length
                          console.log('Paste operation detected with significant length increase');
                          this.handlePasteText(text);
                        } else {
                          // Normal typing
                          this.handleChangeText(text || '');
                        }
                      } catch (error) {
                        console.error('Error in onChangeText handler:', error);
                        // Ultimate fallback - just pass the text to handleChangeText
                        this.handleChangeText(text || '');
                      }
                    }}
                    onBlur={() => {
                      if (this.props.onBlur) this.props.onBlur();
                    }}
                    onFocus={() => {
                      // Ensure cursor is at the end when the field gets focus - with null checks
                      const amountStr = (this.props.amount && this.props.amount.toString()) || '';
                      const length = amountStr.length;

                      setTimeout(() => {
                        if (this.textInput && typeof this.textInput.setNativeProps === 'function') {
                          this.textInput.setNativeProps({
                            selection: { start: length, end: length },
                          });
                        }
                      }, 50); // Slightly longer timeout for focus events

                      if (this.props.onFocus) this.props.onFocus();
                    }}
                    placeholder="0"
                    maxLength={this.maxLength()}
                    ref={textInput => (this.textInput = textInput)}
                    editable={!this.props.isLoading && !disabled}
                    value={amount === BitcoinUnit.MAX ? loc.units.MAX : String(amount)}
                    placeholderTextColor={disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2}
                    style={[
                      styles.input,
                      stylesHook.input,
                      // Dynamic font size is now handled in stylesHook.input
                    ]}
                    // Remove selection prop to allow native behavior
                    selection={undefined}
                    // Additional props that help with cursor behavior
                    caretHidden={false}
                    autoCapitalize="none"
                    spellCheck={false}
                    autoCorrect={false}
                    textContentType="none"
                    contextMenuHidden={false}
                    disableFullscreenUI={true} // Android-specific: helps prevent cursor issues
                  />
                ) : (
                  <Pressable onPress={this.resetAmount}>
                    <Text style={[styles.input, stylesHook.input]}>{BitcoinUnit.MAX}</Text>
                  </Pressable>
                )}
                {/* Show BTC/SATS symbol separately */}
                {unit !== BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                  <Text style={[styles.cryptoCurrency, stylesHook.cryptoCurrency]}>{' ' + loc.units[unit]}</Text>
                )}
              </View>
              {/* Only show secondary display if we have a valid amount */}
              {showSecondaryDisplay && (
                <View style={styles.secondaryRoot}>
                  <Text style={styles.secondaryText}>{secondaryDisplayCurrency}</Text>
                </View>
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
                <Image source={require('../img/round-compare-arrows-24-px.png')} />
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

// Helper function to remove trailing zeros from a number string
function removeTrailingZeros(numberStr) {
  if (!numberStr.includes('.')) return numberStr;
  return numberStr.replace(/\.?0+$/, match => (match === '.' ? '.0' : ''));
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
  changeAmountUnit: {
    alignSelf: 'center',
    marginRight: 16,
    paddingLeft: 16,
    paddingVertical: 16,
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
