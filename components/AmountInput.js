import React, { Component } from 'react';
import PropTypes from 'prop-types';
import BigNumber from 'bignumber.js';
import { Text } from 'react-native-elements';
import { Image, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { BitcoinUnit } from '../models/bitcoinUnits';
import loc, { formatBalanceWithoutSuffix, formatBalancePlain, removeTrailingZeros } from '../loc';
const currency = require('../blue_modules/currency');

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

  /**
   * here we must recalculate old amont value (which was denominated in `previousUnit`) to new denomination `newUnit`
   * and fill this value in input box, so user can switch between, for example, 0.001 BTC <=> 100000 sats
   *
   * @param previousUnit {string} one of {BitcoinUnit.*}
   * @param newUnit {string} one of {BitcoinUnit.*}
   */
  onAmountUnitChange(previousUnit, newUnit) {
    const amount = this.props.amount || 0;
    console.log('was:', amount, previousUnit, '; converting to', newUnit);
    let sats = 0;
    switch (previousUnit) {
      case BitcoinUnit.BTC:
        sats = new BigNumber(amount).multipliedBy(100000000).toString();
        break;
      case BitcoinUnit.SATS:
        sats = amount;
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        sats = new BigNumber(currency.fiatToBTC(amount)).multipliedBy(100000000).toString();
        break;
    }
    if (previousUnit === BitcoinUnit.LOCAL_CURRENCY && AmountInput.conversionCache[amount + previousUnit]) {
      // cache hit! we reuse old value that supposedly doesnt have rounding errors
      sats = AmountInput.conversionCache[amount + previousUnit];
    }
    console.log('so, in sats its', sats);

    const newInputValue = formatBalancePlain(sats, newUnit, false);
    console.log('and in', newUnit, 'its', newInputValue);

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
        return 10;
      case BitcoinUnit.SATS:
        return 15;
      default:
        return 15;
    }
  };

  textInput = React.createRef();

  handleTextInputOnPress = () => {
    this.textInput.current.focus();
  };

  handleChangeText = text => {
    text = text.trim();
    if (this.props.unit !== BitcoinUnit.LOCAL_CURRENCY) {
      text = text.replace(',', '.');
      const split = text.split('.');
      if (split.length >= 2) {
        text = `${parseInt(split[0], 10)}.${split[1]}`;
      } else {
        text = `${parseInt(split[0], 10)}`;
      }

      text = this.props.unit === BitcoinUnit.BTC ? text.replace(/[^0-9.]/g, '') : text.replace(/[^0-9]/g, '');

      if (text.startsWith('.')) {
        text = '0.';
      }
    } else if (this.props.unit === BitcoinUnit.LOCAL_CURRENCY) {
      text = text.replace(/,/gi, '');
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
    this.props.onChangeText(text);
  };

  render() {
    const { colors, disabled, unit } = this.props;
    const amount = this.props.amount || 0;
    let secondaryDisplayCurrency = formatBalanceWithoutSuffix(amount, BitcoinUnit.LOCAL_CURRENCY, false);

    // if main display is sat or btc - secondary display is fiat
    // if main display is fiat - secondary dislay is btc
    let sat;
    switch (unit) {
      case BitcoinUnit.BTC:
        sat = new BigNumber(amount).multipliedBy(100000000).toString();
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(sat, BitcoinUnit.LOCAL_CURRENCY, false);
        break;
      case BitcoinUnit.SATS:
        secondaryDisplayCurrency = formatBalanceWithoutSuffix((isNaN(amount) ? 0 : amount).toString(), BitcoinUnit.LOCAL_CURRENCY, false);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        secondaryDisplayCurrency = currency.fiatToBTC(parseFloat(isNaN(amount) ? 0 : amount));
        if (AmountInput.conversionCache[isNaN(amount) ? 0 : amount + BitcoinUnit.LOCAL_CURRENCY]) {
          // cache hit! we reuse old value that supposedly doesn't have rounding errors
          const sats = AmountInput.conversionCache[isNaN(amount) ? 0 : amount + BitcoinUnit.LOCAL_CURRENCY];
          secondaryDisplayCurrency = currency.satoshiToBTC(sats);
        }
        break;
    }

    if (amount === BitcoinUnit.MAX) secondaryDisplayCurrency = ''; // we don't want to display NaN

    const stylesHook = StyleSheet.create({
      center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
      localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
      input: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2, fontSize: amount.length > 10 ? 20 : 36 },
      cryptoCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
    });

    return (
      <TouchableWithoutFeedback disabled={this.props.pointerEvents === 'none'} onPress={() => this.textInput.focus()}>
        <View style={styles.root}>
          {!disabled && <View style={[styles.center, stylesHook.center]} />}
          <View style={styles.flex}>
            <View style={styles.container}>
              {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{currency.getCurrencySymbol() + ' '}</Text>
              )}
              <TextInput
                {...this.props}
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
                value={amount === BitcoinUnit.MAX ? loc.units.MAX : parseFloat(amount) >= 0 ? String(amount) : undefined}
                placeholderTextColor={disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2}
                style={[styles.input, stylesHook.input]}
              />
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
              testID="changeAmountUnitButton"
              style={styles.changeAmountUnit}
              onPress={this.changeAmountUnit}
            >
              <Image source={require('../img/round-compare-arrows-24-px.png')} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableWithoutFeedback>
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
