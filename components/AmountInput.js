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
  formatBTC,
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
      const { groupSeparator, decimalSeparator } = localeSettings;
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
      // First check if we can retrieve from cache for local_currency → BTC/SATS conversion
      if (previousUnit === BitcoinUnit.LOCAL_CURRENCY) {
        const cachedSats = AmountInput.getCachedSatoshis(amount);
        if (cachedSats) {
          console.log(`Cache hit! Found cached value: ${cachedSats} sats for ${amount} ${previousUnit}`);
          // Convert string to number to ensure it's valid
          sats = typeof cachedSats === 'string' ? parseInt(cachedSats.replace(/,/g, ''), 10) : cachedSats;
          console.log(`Using cached sats value: ${sats}`);
        }
      }

      // If we don't have cached value, parse and convert normally
      if (!sats) {
        // Parse the amount using locale-aware parsing
        const numericAmount = parseNumberStringToFloat(amount.toString());
        console.log(`Parsed numeric amount:`, numericAmount);

        // Handle NaN values safely
        if (isNaN(numericAmount)) {
          // If parsing fails, default to empty string
          this.props.onChangeText('0');
          this.props.onAmountUnitChange(newUnit);
          return;
        }

        // Convert the value to satoshis based on the unit
        switch (previousUnit) {
          case BitcoinUnit.BTC:
            sats = new BigNumber(numericAmount).multipliedBy(100000000).toNumber();
            break;
          case BitcoinUnit.SATS: {
            // For SATS, remove any locale-specific separators before parsing
            const satsValue = amount.toString().replace(/,/g, '');
            sats = parseInt(satsValue, 10);
            break;
          }
          case BitcoinUnit.LOCAL_CURRENCY: {
            // Add safeguards against large values that might cause overflow
            const maxSafeValue = 1000000000; // 1 billion in local currency 
            if (numericAmount > maxSafeValue) {
              console.warn(`Very large value detected: ${numericAmount}, capping conversion`);
              sats = new BigNumber(fiatToBTC(maxSafeValue)).multipliedBy(100000000).toNumber();
            } else {
              try {
                sats = new BigNumber(fiatToBTC(numericAmount)).multipliedBy(100000000).toNumber();
              } catch (error) {
                console.error('Error converting fiat to BTC:', error);
                // If conversion fails, use 0
                sats = 0;
              }
            }
            break;
          }
        }
      }

      // Ensure sats is a valid number before proceeding
      if (isNaN(sats) || sats === null || sats === undefined) {
        console.warn('Invalid satoshi value detected, resetting to 0');
        sats = 0;
      } else {
        // Log the valid satoshi value we're using
        console.log(`Using satoshi value for conversion: ${sats}`);
      }

      // Format the output based on the new unit and locale
      let newInputValue = '0'; // Default value
      
      if (newUnit === BitcoinUnit.BTC) {
        // For BTC, always use dot as decimal separator, NEVER commas
        try {
          const btcValue = new BigNumber(sats).dividedBy(100000000);
          
          // Format BTC without trailing zeros
          newInputValue = btcValue.toFixed(8).replace(/\.?0+$/, '');
          
        } catch (error) {
          console.error('Error formatting BTC value:', error);
          newInputValue = '0';
        }
      } else if (newUnit === BitcoinUnit.SATS) {
        // For SATS, only use commas as separators, NEVER dots
        try {
          // Convert to integer for SATS (no decimals)
          const satsInt = Math.round(sats);
          const numStr = isNaN(satsInt) ? '0' : satsInt.toString();
          // Insert commas every 3 digits from the right
          newInputValue = numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        } catch (error) {
          console.error('Error formatting SATS value:', error);
          newInputValue = '0';
        }
      } else if (newUnit === BitcoinUnit.LOCAL_CURRENCY) {
        // For local currency, always use fresh device locale settings
        const deviceLocale = RNLocalize.getLocales()[0].languageTag;
        
        try {
          const localAmount = satoshiToLocalCurrency(sats, false);
          
          // Check if localAmount is valid
          if (localAmount === '...' || isNaN(parseFloat(localAmount))) {
            console.warn('Invalid local amount:', localAmount);
            newInputValue = '0.00'; 
          } else {
            // Format the amount using freshly obtained device locale
            const numAmount = parseFloat(localAmount);
            
            // Format with two decimal places only if there are non-zero decimals
            if (numAmount % 1 === 0) {
              // For whole numbers, don't show decimals
              newInputValue = new Intl.NumberFormat(deviceLocale).format(numAmount);
            } else {
              // For decimal numbers, show up to 2 decimal places
              newInputValue = new Intl.NumberFormat(deviceLocale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(numAmount);
            }
          }
        } catch (error) {
          console.error('Error formatting local currency:', error);
          newInputValue = '0.00'; // Safe fallback
        }
      }

      console.log(`CONVERSION: "${amount}" (${previousUnit}) → "${newInputValue}" (${newUnit}) | SATS: ${sats}`);

      // Sanity check - if we somehow still have NaN, reset to 0
      if (newInputValue === 'NaN' || newInputValue.includes('NaN')) {
        console.warn('NaN detected in final formatted value, resetting to 0');
        newInputValue = newUnit === BitcoinUnit.LOCAL_CURRENCY ? '0.00' : '0';
      }

      // Always cache conversions involving local currency
      if (previousUnit === BitcoinUnit.SATS && newUnit === BitcoinUnit.LOCAL_CURRENCY) {
        // Cache SATS → LOCAL_CURRENCY conversion for future retrieval
        AmountInput.setCachedSatoshis(newInputValue, amount);
        console.log(`Cached SATS→LOCAL conversion:`, { key: newInputValue, value: amount });
      } else if (previousUnit === BitcoinUnit.BTC && newUnit === BitcoinUnit.LOCAL_CURRENCY) {
        // Cache BTC → LOCAL_CURRENCY conversion (convert BTC to SATS first)
        const btcInSats = new BigNumber(amount).multipliedBy(100000000).toString();
        AmountInput.setCachedSatoshis(newInputValue, btcInSats);
        console.log(`Cached BTC→LOCAL conversion:`, { key: newInputValue, value: btcInSats });
      }

      this.props.onChangeText(newInputValue);
      this.props.onAmountUnitChange(newUnit);
    } catch (error) {
      console.error('Critical error in currency conversion:', error);
      // Provide safe fallback
      const safeValue = newUnit === BitcoinUnit.LOCAL_CURRENCY ? '0.00' : '0';
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
    const { decimalSeparator, groupingSeparator: groupSeparator } = RNLocalize.getNumberFormatSettings();
    const deviceLocale = RNLocalize.getLocales()[0].languageTag;
    
    // Get the maximum allowed decimal places for the current currency
    let maxDecimalPlaces = 2; // Default to 2 if we can't get from getDecimalPlaces
    
    try {
      maxDecimalPlaces = getDecimalPlaces(BitcoinUnit.LOCAL_CURRENCY);
    } catch (error) {
      console.error('Error getting decimal places:', error);
      // Keep the default value
    }
    
    console.log(`Using device locale: ${deviceLocale} | decimal="${decimalSeparator}" | group="${groupSeparator}" | maxDecimals=${maxDecimalPlaces}`);

    // Check if the user entered a decimal separator
    const hasPeriod = text.includes('.');
    const hasComma = text.includes(',');
    
    // If we have both period and comma, determine which is the decimal separator
    // based on position (last one is typically decimal)
    let normalizedText = text;
    let decimalPart = '';
    let integerPart = '';
    
    // Split the input into integer and decimal parts
    if (hasPeriod && hasComma) {
      // Determine which is likely the decimal separator by position
      const lastPeriodIndex = text.lastIndexOf('.');
      const lastCommaIndex = text.lastIndexOf(',');
      
      if (lastPeriodIndex > lastCommaIndex) {
        // Period is likely the decimal separator
        [integerPart, decimalPart] = text.split('.');
        // Remove any commas from integer part (they were thousand separators)
        integerPart = integerPart.replace(/,/g, '');
      } else {
        // Comma is likely the decimal separator
        [integerPart, decimalPart] = text.split(',');
        // Remove any periods from integer part (they were thousand separators)
        integerPart = integerPart.replace(/\./g, '');
      }
    } else if (hasPeriod) {
      // Only period is present, treat as decimal separator
      [integerPart, decimalPart] = text.split('.');
    } else if (hasComma) {
      // Determine if comma is used as decimal or thousand separator
      const parts = text.split(',');
      
      // If there's only one comma and less than 3 digits after it, it's likely a decimal
      if (parts.length === 2 && parts[1].length <= 2) {
        [integerPart, decimalPart] = parts;
      } else {
        // Comma is used as thousand separator, remove them
        integerPart = text.replace(/,/g, '');
      }
    } else {
      // No separators at all
      integerPart = text;
    }
    
    // Clean non-numeric characters from integer and decimal parts
    integerPart = integerPart.replace(/[^\d]/g, '');
    decimalPart = decimalPart ? decimalPart.replace(/[^\d]/g, '') : '';
    
    // Limit decimal places if needed
    if (decimalPart.length > maxDecimalPlaces) {
      decimalPart = decimalPart.substring(0, maxDecimalPlaces);
    }
    
    // ONLY format the integer part with group separators if it's long enough
    let formattedInteger = integerPart;
    
    // Only add group separators if we have at least 4 digits in the integer part
    if (integerPart.length >= 4) {
      try {
        // Remove any existing group separators (if any) before reformatting
        const cleanInteger = integerPart.replace(new RegExp('\\' + groupSeparator, 'g'), '');
        
        // Format with proper group separators for the locale
        formattedInteger = new Intl.NumberFormat(deviceLocale, {
          useGrouping: true,
          maximumFractionDigits: 0,
        }).format(parseInt(cleanInteger, 10));
      } catch (error) {
        console.error('Error formatting integer part:', error);
        formattedInteger = integerPart; // Keep original if formatting fails
      }
    }
    
    // Construct the final result
    let result = formattedInteger;
    
    // Add decimal part only if it exists or if user explicitly added a decimal separator
    if (decimalPart || hasPeriod || (hasComma && text.split(',').length === 2 && text.split(',')[1].length <= 2)) {
      result = formattedInteger + decimalSeparator + decimalPart;
    }
    
    console.log(`Formatted input: "${text}" → "${result}"`);
    this.props.onChangeText(result);
  };

  // BTC input handling - always uses dot as decimal separator
  handleBtcInput = text => {
    // Maximum 8 decimal places for BTC
    
    const maxDecimalPlaces = 8;
    
    // Remove any commas and allow only one dot
    let cleanedInput = text.replace(/,/g, '');

    // Only process decimal part if user has entered a decimal point
    if (cleanedInput.includes('.')) {
      const parts = cleanedInput.split('.');
      const integerPart = parts[0];
      let decimalPart = parts.slice(1).join('');
      
      // Limit to max decimal places for BTC
      if (decimalPart.length > maxDecimalPlaces) {
        decimalPart = decimalPart.substring(0, maxDecimalPlaces);
      }
      
      cleanedInput = `${integerPart}.${decimalPart}`;
    }

    // Validate that the input is a number
    if (cleanedInput === '.' || cleanedInput === '') {
      // Allow user to start with decimal point
      this.props.onChangeText(cleanedInput);
    } else if (!isNaN(parseFloat(cleanedInput))) {
      this.props.onChangeText(cleanedInput);
    }
  };

  // Fix the SATS input to prevent any decimals
  handleSatsInput = text => {
    // Remove all non-digits and any decimal parts
    const digitsOnly = text.replace(/\D/g, '');
    
    // Format with commas as thousands separators
    const formatted = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
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

  // Add this method to determine the font size based on amount length
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
    
    // Determine if we should show the secondary display
    let showSecondaryDisplay = false;

    // Only calculate secondaryDisplayCurrency if amount is not empty
    if (amount !== '' && amount !== BitcoinUnit.MAX) {
      showSecondaryDisplay = true;
      
      switch (unit) {
        case BitcoinUnit.BTC:
          try {
            const btcValue = parseNumberStringToFloat(amount.toString());
            if (isNaN(btcValue)) {
              secondaryDisplayCurrency = satoshiToLocalCurrency(0, true);
            } else {
              sat = new BigNumber(btcValue).multipliedBy(100000000).toString();
              secondaryDisplayCurrency = satoshiToLocalCurrency(sat, true);
            }
          } catch (error) {
            console.error('Error formatting secondary display:', error);
            secondaryDisplayCurrency = satoshiToLocalCurrency(0, true);
          }
          break;

        case BitcoinUnit.SATS:
          try {
            // For SATS, remove commas before parsing
            const plainSats = amount.toString().replace(/,/g, '');

            let satsValue;
            try {
              satsValue = parseInt(plainSats, 10);
              if (isNaN(satsValue)) satsValue = 0;
            } catch (e) {
              satsValue = 0;
            }

            secondaryDisplayCurrency = satoshiToLocalCurrency(satsValue, true);
          } catch (error) {
            secondaryDisplayCurrency = satoshiToLocalCurrency(0, true);
          }
          break;

        case BitcoinUnit.LOCAL_CURRENCY:
          try {
            let fiatValue = 0;
            try {
              // Fix the parsing of local currency values
              // First, properly handle formatted numbers with both decimal and group separators
              const { decimalSeparator, groupSeparator } = localeSettings;
              
              // Create a clean version for parsing
              let cleanAmount = amount.toString();
              
              // If we have the locale's group separator, remove it
              if (groupSeparator) {
                const groupSepRegex = new RegExp('\\' + groupSeparator, 'g');
                cleanAmount = cleanAmount.replace(groupSepRegex, '');
              }
              
              // If we have the locale's decimal separator and it's not a period,
              // replace it with a period for JS parsing
              if (decimalSeparator && decimalSeparator !== '.') {
                const decimalSepRegex = new RegExp('\\' + decimalSeparator, 'g');
                cleanAmount = cleanAmount.replace(decimalSepRegex, '.');
              }
              
              // Now parse the cleaned string
              fiatValue = parseFloat(cleanAmount);
              
              if (isNaN(fiatValue)) {
                console.warn(`Failed to parse local currency amount: "${amount}" → "${cleanAmount}"`);
                fiatValue = 0;
              } else {
                console.log(`Successfully parsed local currency: "${amount}" → "${cleanAmount}" → ${fiatValue}`);
              }
            } catch (e) {
              console.error('Error parsing local currency amount:', e);
              // Default to 0
              fiatValue = 0;
            }

            let btcValue = '0';

            // Try to use cached satoshis for more accurate conversion
            if (AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]) {
              const sats = AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY];
              // When using cached sats, ensure it's properly converted to a number
              const numericSats = typeof sats === 'string' ? parseInt(sats.replace(/,/g, ''), 10) : sats;
              btcValue = satoshiToBTC(numericSats);
              console.log(`Using cached satoshis for secondary display: ${numericSats} sats → ${btcValue} BTC`);
            } else {
              try {
                btcValue = fiatToBTC(fiatValue);
              } catch (e) {
                console.error('Error converting fiat to BTC:', e);
                btcValue = '0';
              }
            }

            try {
              const numBtcValue = parseFloat(btcValue);
              if (!isNaN(numBtcValue)) {
                // Format BTC value for display - removing trailing zeros
                secondaryDisplayCurrency = formatBTC(numBtcValue);
              } else {
                secondaryDisplayCurrency = '0';
              }
            } catch (e) {
              console.error('Error formatting BTC value:', e);
              secondaryDisplayCurrency = '0';
            }
          } catch (error) {
            console.error('Overall error in LOCAL_CURRENCY handling:', error);
            secondaryDisplayCurrency = '0';
          }
          break;
      }

      if (secondaryDisplayCurrency === 'NaN' || secondaryDisplayCurrency.includes('NaN')) {
        secondaryDisplayCurrency = unit === BitcoinUnit.LOCAL_CURRENCY ? '0' : satoshiToLocalCurrency(0, true);
      }
      
      // Clean up the secondary display to remove unnecessary decimal zeros
      if (unit === BitcoinUnit.LOCAL_CURRENCY) {
        // BTC values already use formatBTC which removes trailing zeros
      } else {
        // For local currency values, remove decimal .00 or ,00 as needed
        if (secondaryDisplayCurrency.includes('.00')) {
          const parts = secondaryDisplayCurrency.split('.00');
          if (parts.length === 2 && parts[1] === '') {
            secondaryDisplayCurrency = parts[0];
          }
        } else if (secondaryDisplayCurrency.includes(',00')) {
          const parts = secondaryDisplayCurrency.split(',00');
          if (parts.length === 2 && parts[1] === '') {
            secondaryDisplayCurrency = parts[0];
          }
        }
      }
    }

    if (amount === BitcoinUnit.MAX) secondaryDisplayCurrency = '';

    const stylesHook = StyleSheet.create({
      center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
      localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
      input: { 
        color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2,
        fontSize: this.getInputFontSize() // Use the method instead of inline style
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
                {/* Show currency symbol separately, outside the TextInput */}
                {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                  <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{getCurrencySymbol()}</Text>
                )}
                {amount !== BitcoinUnit.MAX ? (
                  <TextInput
                    {...this.props}
                    onSelectionChange={this.handleSelectionChange}
                    testID="BitcoinAmountInput"
                    keyboardType="numeric"
                    adjustsFontSizeToFit
                    onChangeText={this.handleChangeText}
                    onBlur={() => {
                      if (this.props.onBlur) this.props.onBlur();
                    }}
                    onFocus={() => {
                      // Ensure cursor is at the end when the field gets focus
                      const length = (this.props.amount && this.props.amount.toString().length) || 0;
                      setTimeout(() => {
                        if (this.textInput) {
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
                  <Text style={styles.secondaryText}>
                    {unit === BitcoinUnit.LOCAL_CURRENCY ? secondaryDisplayCurrency : secondaryDisplayCurrency}
                    {unit === BitcoinUnit.LOCAL_CURRENCY ? ` ${loc.units[BitcoinUnit.BTC]}` : null}
                  </Text>
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
