import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Image, LayoutAnimation, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Badge, Icon, Text } from '@rneui/themed';

import {
  fiatToBTC,
  getCurrencySymbol,
  isRateOutdated,
  localeSettings,
  formatNumberLocale,
  mostRecentFetchedRate,
  satoshiToBTC,
  satoshiToLocalCurrency,
  updateExchangeRate,
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
    return AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] || false;
  };

  static setCachedSatoshis = (amount, sats) => {
    AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] = sats;
  };

  constructor() {
    super();
    this.state = { mostRecentFetchedRate: Date(), isRateOutdated: false, isRateBeingUpdated: false };
  }

  componentDidMount() {
    mostRecentFetchedRate()
      .then(mostRecentFetchedRateValue => {
        this.setState({ mostRecentFetchedRate: mostRecentFetchedRateValue });
      })
      .finally(() => {
        isRateOutdated().then(isRateOutdatedValue => this.setState({ isRateOutdated: isRateOutdatedValue }));
      });
  }

  /**
   * here we must recalculate old amont value (which was denominated in `previousUnit`) to new denomination `newUnit`
   * and fill this value in input box, so user can switch between, for example, 0.001 BTC <=> 100000 sats
   *
   * @param previousUnit {string} one of {BitcoinUnit.*}
   * @param newUnit {string} one of {BitcoinUnit.*}
   */
  onAmountUnitChange(previousUnit, newUnit) {
    const amount = this.props.amount || 0;
    const log = `${amount}(${previousUnit}) ->`;
    let sats = 0;

    // Parse the amount using locale-aware parsing
    const numericAmount = parseNumberStringToFloat(amount.toString());

    // Convert the value to satoshis based on the unit
    switch (previousUnit) {
      case BitcoinUnit.BTC:
        sats = new BigNumber(numericAmount).multipliedBy(100000000).toString();
        break;
      case BitcoinUnit.SATS: {
        // For SATS, remove any locale-specific separators before parsing
        const satsValue = amount.toString().replace(new RegExp(`\\${localeSettings.groupSeparator}`, 'g'), '');
        sats = parseInt(satsValue, 10);
        break;
      }
      case BitcoinUnit.LOCAL_CURRENCY:
        sats = new BigNumber(fiatToBTC(numericAmount)).multipliedBy(100000000).toString();
        break;
    }

    if (previousUnit === BitcoinUnit.LOCAL_CURRENCY && AmountInput.conversionCache[amount + previousUnit]) {
      // cache hit! we reuse old value that supposedly doesnt have rounding errors
      sats = AmountInput.conversionCache[amount + previousUnit];
    }

    // Format the output based on the new unit and locale
    let newInputValue;
    if (newUnit === BitcoinUnit.BTC) {
      // For BTC, use locale's decimal separator
      const btcValue = new BigNumber(sats).dividedBy(100000000);

      // Format with locale settings
      newInputValue = btcValue.toFormat(8, {
        decimalSeparator: localeSettings.decimalSeparator,
        groupSeparator: '',
        groupSize: 3,
      });

      // Remove trailing zeros
      while (newInputValue.endsWith('0')) {
        newInputValue = newInputValue.slice(0, -1);
      }
      if (newInputValue.endsWith(localeSettings.decimalSeparator)) {
        newInputValue = newInputValue.slice(0, -1);
      }
    } else if (newUnit === BitcoinUnit.SATS) {
      // For SATS, use locale's group separator
      const satsInt = parseInt(sats);
      newInputValue = new Intl.NumberFormat(localeSettings.deviceLocale, {
        useGrouping: true,
        maximumFractionDigits: 0,
      }).format(satsInt);
    } else if (newUnit === BitcoinUnit.LOCAL_CURRENCY) {
      // For local currency, use the locale-aware formatter
      const localAmount = satoshiToLocalCurrency(sats, false); // Get raw number without formatting

      try {
        // Format the amount with the locale's decimal separator
        const numAmount = parseFloat(localAmount);
        newInputValue = new Intl.NumberFormat(localeSettings.deviceLocale, {
          useGrouping: false, // We'll add grouping later as needed
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(numAmount);
      } catch (error) {
        // Fallback if formatting fails
        newInputValue = localAmount;
      }
    }

    console.log(`${log} ${sats}(sats) -> ${newInputValue}(${newUnit})`);

    if (newUnit === BitcoinUnit.LOCAL_CURRENCY && previousUnit === BitcoinUnit.SATS) {
      // we cache conversion, so when we will need reverse conversion there wont be a rounding error
      AmountInput.conversionCache[newInputValue + newUnit] = amount;
    }

    this.props.onChangeText(newInputValue);
    this.props.onAmountUnitChange(newUnit);
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
        return undefined; // No limit for local currency
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

    const { decimalSeparator, deviceLocale } = localeSettings; // Remove unused groupSeparator

    if (this.props.unit === BitcoinUnit.BTC) {
      // Allow user to input either with their locale format or with standard formats
      // This regex accepts both dot and comma as potential decimal separators, and spaces/dots/commas as group separators
      const rawText = text.replace(/[^\d., ]/g, '');

      // We need to determine which separator the user is using as decimal
      let userDecimalSeparator = decimalSeparator;

      // If there's both a dot and a comma, determine which is the decimal separator based on position
      if (rawText.includes('.') && rawText.includes(',')) {
        const lastDotIndex = rawText.lastIndexOf('.');
        const lastCommaIndex = rawText.lastIndexOf(',');

        // The one that appears last is likely the decimal separator
        userDecimalSeparator = lastDotIndex > lastCommaIndex ? '.' : ',';
      } else if (rawText.includes('.')) {
        userDecimalSeparator = '.';
      } else if (rawText.includes(',')) {
        userDecimalSeparator = ',';
      }

      // Now process based on the determined decimal separator
      const parts = rawText.split(userDecimalSeparator);
      let integerPart = parts[0];
      const decimalPart = parts.length > 1 ? parts.slice(1).join('') : undefined;

      // Remove any non-digit characters from integer part (all separators)
      integerPart = integerPart.replace(/[^\d]/g, '');

      // Limit decimal precision to 8 places for BTC
      let formattedDecimalPart = decimalPart;
      if (formattedDecimalPart && formattedDecimalPart.length > 8) {
        formattedDecimalPart = formattedDecimalPart.substring(0, 8);
      }

      // Format integer part with locale-appropriate group separators
      let formattedIntegerPart;
      if (integerPart) {
        formattedIntegerPart = new Intl.NumberFormat(deviceLocale, {
          useGrouping: true,
          maximumFractionDigits: 0,
        }).format(parseInt(integerPart, 10));
      } else {
        formattedIntegerPart = '0';
      }

      // Reconstruct with the locale's decimal separator
      const formattedText =
        formattedDecimalPart !== undefined ? `${formattedIntegerPart}${decimalSeparator}${formattedDecimalPart}` : formattedIntegerPart;

      this.props.onChangeText(formattedText);
    } else if (this.props.unit === BitcoinUnit.SATS) {
      text = text.trim();

      if (text === '') {
        this.props.onChangeText('');
        return;
      }

      const { decimalSeparator, groupSeparator, deviceLocale } = localeSettings;

      if (this.props.unit === BitcoinUnit.BTC) {
        // For BTC - strictly follow device's locale format

        // Allow only digits and the locale-specific decimal separator
        let rawText = text.replace(new RegExp(`[^\\d${decimalSeparator}${groupSeparator}]`, 'g'), '');

        // Handle multiple decimal separators - keep only the first one
        const sepParts = rawText.split(decimalSeparator);
        if (sepParts.length > 2) {
          rawText = sepParts[0] + decimalSeparator + sepParts.slice(1).join('');
        }

        // Split the number into integer and decimal parts
        let [integerPart, decimalPart] = rawText.split(decimalSeparator);

        // Remove any existing group separators from integer part
        integerPart = integerPart.replace(new RegExp(`\\${groupSeparator}`, 'g'), '');

        // Limit decimal precision to 8 places for BTC
        if (decimalPart && decimalPart.length > 8) {
          decimalPart = decimalPart.substring(0, 8);
        }

        // Format integer part with locale-appropriate group separators
        let formattedInteger;
        if (integerPart) {
          formattedInteger = new Intl.NumberFormat(deviceLocale, {
            useGrouping: true,
            maximumFractionDigits: 0,
          }).format(parseInt(integerPart, 10));
        } else {
          formattedInteger = '0';
        }

        // Reconstruct the formatted text
        const formattedText = decimalPart !== undefined ? `${formattedInteger}${decimalSeparator}${decimalPart}` : formattedInteger;

        this.props.onChangeText(formattedText);
      } else if (this.props.unit === BitcoinUnit.SATS) {
        // For SATS - follow device's locale for grouping

        // Remove any non-numeric and non-grouping characters
        const rawText = text.replace(new RegExp(`[^\\d${groupSeparator}]`, 'g'), '');

        // Remove any existing group separators
        const digitsOnly = rawText.replace(new RegExp(`\\${groupSeparator}`, 'g'), '');

        if (digitsOnly === '') {
          this.props.onChangeText('');
          return;
        }

        // Format with locale-appropriate thousand separators
        const formattedText = new Intl.NumberFormat(deviceLocale, {
          useGrouping: true,
          maximumFractionDigits: 0,
        }).format(parseInt(digitsOnly, 10));

        this.props.onChangeText(formattedText);
      } else if (this.props.unit === BitcoinUnit.LOCAL_CURRENCY) {
        // For fiat currency - strictly follow locale's number format
        try {
          // Extract digits and locale-specific separators
          const filteredText = text.replace(new RegExp(`[^\\d${decimalSeparator}${groupSeparator}]`, 'g'), '');

          // Count decimal separators
          const decimalCount = (filteredText.match(new RegExp(`\\${decimalSeparator}`, 'g')) || []).length;

          // If we have too many decimal separators, revert to previous valid input
          if (decimalCount > 1) {
            this.props.onChangeText(this.props.amount || '');
            return;
          }

          // Split the text into integer and decimal parts
          let [integerPart, decimalPart] = filteredText.split(decimalSeparator);

          // Remove any group separators from the integer part
          integerPart = integerPart.replace(new RegExp(`\\${groupSeparator}`, 'g'), '');

          // Limit decimal precision to 2 places for fiat
          if (decimalPart && decimalPart.length > 2) {
            decimalPart = decimalPart.substring(0, 2);
          }

          // Format the integer part with appropriate group separators
          let formattedInteger;
          if (integerPart === '' || integerPart === '0') {
            formattedInteger = '0';
          } else {
            formattedInteger = new Intl.NumberFormat(deviceLocale, {
              useGrouping: true,
              maximumFractionDigits: 0,
            }).format(parseInt(integerPart, 10));
          }

          // Put it all together with the proper separators
          let formattedText;
          if (decimalPart !== undefined) {
            formattedText = `${formattedInteger}${decimalSeparator}${decimalPart}`;
          } else if (text.endsWith(decimalSeparator)) {
            formattedText = `${formattedInteger}${decimalSeparator}`;
          } else {
            formattedText = formattedInteger;
          }

          this.props.onChangeText(formattedText);
        } catch (error) {
          console.error('Error formatting local currency:', error);
          this.props.onChangeText(text);
        }
      }
    } else if (this.props.unit === BitcoinUnit.LOCAL_CURRENCY) {
      // For fiat currency - use a more flexible approach to accept different formats
      try {
        // Accept any combination of digits, dots, commas and spaces
        const filteredText = text.replace(/[^\d., ]/g, '');

        // Try to detect which separator the user is using as decimal
        let userDecimalSeparator = decimalSeparator;

        // If there's both a dot and a comma, determine which is the decimal separator
        if (filteredText.includes('.') && filteredText.includes(',')) {
          const lastDotIndex = filteredText.lastIndexOf('.');
          const lastCommaIndex = filteredText.lastIndexOf(',');

          // The one that appears last is likely the decimal separator
          userDecimalSeparator = lastDotIndex > lastCommaIndex ? '.' : ',';
        } else if (filteredText.includes('.')) {
          userDecimalSeparator = '.';
        } else if (filteredText.includes(',')) {
          userDecimalSeparator = ',';
        }

        // Split based on the determined decimal separator
        const parts = filteredText.split(userDecimalSeparator);
        let integerPart = parts[0];
        let decimalPart = parts.length > 1 ? parts.slice(1).join('') : undefined;

        // Remove any non-digit characters from integer part
        integerPart = integerPart.replace(/[^\d]/g, '');

        // Limit decimal precision to 2 places for fiat
        if (decimalPart && decimalPart.length > 2) {
          decimalPart = decimalPart.substring(0, 2);
        }

        // Format integer part with locale-appropriate group separators
        let formattedIntegerPart;
        if (integerPart === '' || integerPart === '0') {
          formattedIntegerPart = '0';
        } else {
          formattedIntegerPart = new Intl.NumberFormat(deviceLocale, {
            useGrouping: true,
            maximumFractionDigits: 0,
          }).format(parseInt(integerPart, 10));
        }

        // Put it all together with the proper separators
        let formattedText;
        if (decimalPart !== undefined) {
          formattedText = `${formattedIntegerPart}${decimalSeparator}${decimalPart}`;
        } else if (text.includes(userDecimalSeparator) && parts.length > 1) {
          formattedText = `${formattedIntegerPart}${decimalSeparator}`;
        } else {
          formattedText = formattedIntegerPart;
        }

        this.props.onChangeText(formattedText);
      } catch (error) {
        console.error('Error formatting local currency:', error);
        this.props.onChangeText(text);
      }
    }
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

  handleSelectionChange = event => {
    const { selection } = event.nativeEvent;
    if (selection.start !== selection.end || selection.start !== this.props.amount?.length) {
      this.textInput?.setNativeProps({ selection: { start: this.props.amount?.length, end: this.props.amount?.length } });
    }
  };

  render() {
    const { colors, disabled, unit } = this.props;
    const amount = this.props.amount || 0;
    let secondaryDisplayCurrency = '';
    let sat;

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
          const plainSats = amount.toString().replace(new RegExp(`\\${localeSettings.groupSeparator}`, 'g'), '');

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
            fiatValue = parseNumberStringToFloat(amount.toString());
            if (isNaN(fiatValue)) fiatValue = 0;
          } catch (e) {
            // Default to 0
          }

          let btcValue = '0';

          if (AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY]) {
            const sats = AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY];
            btcValue = satoshiToBTC(sats);
          } else {
            try {
              btcValue = fiatToBTC(fiatValue);
            } catch (e) {
              btcValue = '0';
            }
          }

          try {
            const numBtcValue = parseFloat(btcValue);
            if (!isNaN(numBtcValue)) {
              secondaryDisplayCurrency = new Intl.NumberFormat(localeSettings.deviceLocale, {
                maximumFractionDigits: 8,
                minimumFractionDigits: 2,
              }).format(numBtcValue);
            } else {
              secondaryDisplayCurrency = '0';
            }
          } catch (e) {
            secondaryDisplayCurrency = '0';
          }
        } catch (error) {
          secondaryDisplayCurrency = '0';
        }
        break;
    }

    if (secondaryDisplayCurrency === 'NaN' || secondaryDisplayCurrency.includes('NaN')) {
      secondaryDisplayCurrency = unit === BitcoinUnit.LOCAL_CURRENCY ? '0' : satoshiToLocalCurrency(0, true);
    }

    if (amount === BitcoinUnit.MAX) secondaryDisplayCurrency = '';

    const stylesHook = StyleSheet.create({
      center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
      localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
      input: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2, fontSize: amount.length > 10 ? 20 : 36 },
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
                  <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{getCurrencySymbol() + ' '}</Text>
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
                      if (this.props.onFocus) this.props.onFocus();
                    }}
                    placeholder="0"
                    maxLength={this.maxLength()}
                    ref={textInput => (this.textInput = textInput)}
                    editable={!this.props.isLoading && !disabled}
                    value={amount === BitcoinUnit.MAX ? loc.units.MAX : String(amount)}
                    placeholderTextColor={disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2}
                    style={[styles.input, stylesHook.input]}
                  />
                ) : (
                  <Pressable onPress={this.resetAmount}>
                    <Text style={[styles.input, stylesHook.input]}>{BitcoinUnit.MAX}</Text>
                  </Pressable>
                )}
                {unit !== BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                  <Text style={[styles.cryptoCurrency, stylesHook.cryptoCurrency]}>{' ' + loc.units[unit]}</Text>
                )}
              </View>
              <View style={styles.secondaryRoot}>
                <Text style={styles.secondaryText}>
                  {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX ? secondaryDisplayCurrency : secondaryDisplayCurrency}
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

const AmountInputWithStyle = props => {
  const { colors } = useTheme();

  return <AmountInput {...props} colors={colors} />;
};

// expose static methods
AmountInputWithStyle.conversionCache = AmountInput.conversionCache;
AmountInputWithStyle.getCachedSatoshis = AmountInput.getCachedSatoshis;
AmountInputWithStyle.setCachedSatoshis = AmountInput.setCachedSatoshis;

export default AmountInputWithStyle;
