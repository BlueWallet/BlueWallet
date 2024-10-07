import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Badge, Icon, Text } from '@rneui/themed';
import {
  btcToSatoshi,
  fiatToBTC,
  getCurrencySymbol,
  isRateOutdated as checkIsRateOutdated, // Renamed to avoid shadowing
  mostRecentFetchedRate,
  satoshiToBTC,
  updateExchangeRate,
} from '../blue_modules/currency';
import { BlueText } from '../BlueComponents';
import loc, { formatBalance, formatBalancePlain, formatBalanceWithoutSuffix, removeTrailingZeros } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { BlueCurrentTheme, useTheme } from './themes';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import ActionSheet from '../screen/ActionSheet';

dayjs.extend(localizedFormat);

class AmountInput extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    /**
     * amount is a string that's always in current unit denomination, e.g. '0.001' or '9.43' or '10000'
     */
    amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /**
     * callback that returns currently typed amount, in current denomination, e.g. 0.001 or 10000 or $9.34
     * (btc, sat, fiat)
     */
    onChangeText: PropTypes.func.isRequired,
    /**
     * callback that's fired to notify of currently selected denomination, returns <BitcoinUnit.*>
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
   * cache of conversions fiat amount => satoshi
   * @type {{}}
   */
  static conversionCache = {};

  static getCachedSatoshis = amount => {
    return AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] || false;
  };

  static setCachedSatoshis = (amount, sats) => {
    AmountInput.conversionCache[amount + BitcoinUnit.LOCAL_CURRENCY] = sats;
  };

  constructor(props) {
    super(props);
    this.state = {
      mostRecentFetchedRate: Date(),
      isRateOutdated: false,
      isRateBeingUpdated: false,
      showErrorMessage: false,
      shakeAnimation: new Animated.Value(0),
      opacityAnimation: new Animated.Value(1),
      hasInteracted: false, // New state to track first interaction
    };
  }

  componentDidMount() {
    mostRecentFetchedRate()
      .then(mostRecentFetchedRateValue => {
        this.setState({ mostRecentFetchedRate: mostRecentFetchedRateValue });
      })
      .finally(() => {
        checkIsRateOutdated().then(isRateOutdatedValue => this.setState({ isRateOutdated: isRateOutdatedValue }));
      });
  }

  componentDidUpdate(prevProps, prevState) {
    const { showErrorMessage, isRateOutdated: currentIsRateOutdated } = this.state;

    // Start shake animation if either showErrorMessage or isRateOutdated becomes true
    if ((showErrorMessage && !prevState.showErrorMessage) || (currentIsRateOutdated && !prevState.isRateOutdated)) {
      this.startShakeAnimation();
    }

    // Stop shake animation if both showErrorMessage and isRateOutdated become false
    if (!showErrorMessage && prevState.showErrorMessage && !currentIsRateOutdated && prevState.isRateOutdated) {
      this.stopShakeAnimation();
    }
  }

  /**
   * Recalculate old amount value (denominated in `previousUnit`) to new denomination `newUnit`
   * and fill this value in input box, so user can switch between, for example, 0.001 BTC <=> 100000 sats
   *
   * @param previousUnit {string} one of {BitcoinUnit.*}
   * @param newUnit {string} one of {BitcoinUnit.*}
   */
  onAmountUnitChange(previousUnit, newUnit) {
    const amount = this.props.amount || 0;
    let sats = 0;

    switch (previousUnit) {
      case BitcoinUnit.BTC: {
        sats = new BigNumber(amount).multipliedBy(100000000).toString();
        break;
      }
      case BitcoinUnit.SATS:
        sats = amount;
        break;
      case BitcoinUnit.LOCAL_CURRENCY: {
        sats = new BigNumber(fiatToBTC(amount)).multipliedBy(100000000).toString();
        break;
      }
      default:
        sats = '0';
    }

    if (previousUnit === BitcoinUnit.LOCAL_CURRENCY && AmountInput.conversionCache[amount + previousUnit]) {
      // cache hit! we reuse old value that supposedly doesn't have rounding errors
      sats = AmountInput.conversionCache[amount + previousUnit];
    }

    const newInputValue = formatBalancePlain(sats, newUnit, false);

    if (newUnit === BitcoinUnit.LOCAL_CURRENCY && previousUnit === BitcoinUnit.SATS) {
      // Cache conversion to prevent rounding errors
      AmountInput.conversionCache[newInputValue + newUnit] = amount;
    }

    this.props.onChangeText(newInputValue);
    this.props.onAmountUnitChange(newUnit);
  }

  /**
   * Cycle currently selected denomination: BTC -> SAT -> LOCAL_CURRENCY -> BTC
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
      default:
        return 15;
    }
  };

  textInput = React.createRef();

  handleTextInputOnPress = () => {
    if (this.textInput && this.textInput.current) {
      this.textInput.current.focus();
    }
  };

  handleChangeText = text => {
    if (!this.state.hasInteracted) {
      this.setState({ hasInteracted: true });
    }

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
      text = text.replace(/,/gi, '.');
      if (text.split('.').length > 2) {
        // Remove all but the first dot
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
      text = text.replace(/[^\d.,-]/g, ''); // Remove all but numbers, dots & commas
      text = text.replace(/(\..*)\./g, '$1');
    }
    this.props.onChangeText(text);
  };

  resetAmount = async () => {
    ActionSheet.showActionSheetWithOptions(
      {
        title: loc.send.reset_amount,
        message: loc.send.reset_amount_confirm,
        options: [loc._.ok, loc._.cancel],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      async buttonIndex => {
        if (buttonIndex === 0) {
          this.props.onChangeText('');
        }
      },
    );
  };

  startShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(this.state.shakeAnimation, {
        toValue: 10,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(this.state.shakeAnimation, {
        toValue: -10,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(this.state.shakeAnimation, {
        toValue: 7,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(this.state.shakeAnimation, {
        toValue: -7,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.spring(this.state.shakeAnimation, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5,
      }),
    ]).start();
  };

  stopShakeAnimation = () => {
    // No specific stop action needed for shake animation as it's a sequence
    // It completes automatically
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
        checkIsRateOutdated().then(isRateOutdatedValue => {
          this.setState({ isRateBeingUpdated: false, isRateOutdated: isRateOutdatedValue });
        });
      }
    });
  };

  triggerError = () => {
    if (!this.state.hasInteracted) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    this.setState({ showErrorMessage: true }, () => {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      this.startShakeAnimation();
    });
  };

  handleBlur = () => {
    const { unit, amount } = this.props;
    let amountInSatoshis = 0;

    if (unit === BitcoinUnit.BTC) {
      amountInSatoshis = btcToSatoshi(amount);
    } else if (unit === BitcoinUnit.SATS) {
      amountInSatoshis = parseInt(amount, 10);
    } else if (unit === BitcoinUnit.LOCAL_CURRENCY) {
      const btcAmount = fiatToBTC(parseFloat(amount));
      amountInSatoshis = btcToSatoshi(btcAmount);
    }

    // Show error if amount is 500 or less satoshis
    if (amountInSatoshis <= 500) {
      this.triggerError();
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      this.setState({ showErrorMessage: false });
    }

    if (this.props.onBlur) {
      this.props.onBlur();
    }
  };

  render() {
    const { colors, disabled, unit } = this.props;
    const amount = this.props.amount || 0;
    const { shakeAnimation, showErrorMessage, opacityAnimation, isRateOutdated: rateIsOutdated } = this.state;

    const shakeStyle = {
      transform: [
        {
          translateX: shakeAnimation,
        },
      ],
    };
    const opacityStyle = {
      opacity: opacityAnimation,
    };

    let secondaryDisplayCurrency;

    switch (unit) {
      case BitcoinUnit.BTC: {
        const sats = new BigNumber(amount).multipliedBy(100000000).toString();
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(sats, BitcoinUnit.LOCAL_CURRENCY, false);
        break;
      }
      case BitcoinUnit.SATS:
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(
          Number.isNaN(Number(amount)) ? '0' : amount.toString(),
          BitcoinUnit.LOCAL_CURRENCY,
          false,
        );
        break;
      case BitcoinUnit.LOCAL_CURRENCY: {
        const parsedAmount = Number.isNaN(Number(amount)) ? 0 : parseFloat(amount);
        secondaryDisplayCurrency = fiatToBTC(parsedAmount);
        if (AmountInput.conversionCache[`${parsedAmount}${BitcoinUnit.LOCAL_CURRENCY}`]) {
          const cachedSats = AmountInput.conversionCache[`${parsedAmount}${BitcoinUnit.LOCAL_CURRENCY}`];
          secondaryDisplayCurrency = satoshiToBTC(cachedSats);
        }
        break;
      }
      default:
        secondaryDisplayCurrency = '';
    }

    if (amount === BitcoinUnit.MAX) secondaryDisplayCurrency = ''; // Avoid displaying NaN

    const inputTextColor = showErrorMessage
      ? colors.outgoingBackgroundColor
      : disabled
        ? colors.buttonDisabledTextColor
        : colors.alternativeTextColor2;

    const stylesHook = StyleSheet.create({
      center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
      localCurrency: {
        color: disabled ? colors.buttonDisabledTextColor : showErrorMessage ? colors.outgoingTextColor : colors.alternativeTextColor2,
      },
      input: { color: inputTextColor, fontSize: amount.toString().length > 10 ? 20 : 36 },
      cryptoCurrency: {
        color: disabled ? colors.buttonDisabledTextColor : showErrorMessage ? colors.outgoingTextColor : colors.alternativeTextColor2,
      },
    });

    return (
      <View
        style={styles.touchableContainer}
        onStartShouldSetResponder={() => true}
        onResponderRelease={this.handleTextInputOnPress}
        accessibilityLabel={loc._.enter_amount}
        accessibilityRole="button"
      >
        <Animated.View style={[styles.root, shakeStyle]}>
          {!disabled && <View style={[styles.center, stylesHook.center]} />}
          <View style={styles.flex}>
            <View style={styles.container}>
              {unit === BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{getCurrencySymbol() + ' '}</Text>
              )}
              {amount !== BitcoinUnit.MAX ? (
                <TextInput
                  {...this.props}
                  caretHidden
                  testID="BitcoinAmountInput"
                  keyboardType="numeric"
                  adjustsFontSizeToFit
                  onChangeText={this.handleChangeText}
                  onBlur={this.handleBlur}
                  onFocus={() => {
                    if (this.props.onFocus) this.props.onFocus();
                  }}
                  maxLength={this.maxLength()}
                  ref={textInput => (this.textInput = textInput)}
                  editable={!this.props.isLoading && !disabled}
                  value={amount === BitcoinUnit.MAX ? loc.units.MAX : parseFloat(amount) >= 0 ? String(amount) : ''}
                  placeholder="0"
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
              accessibilityLabel={loc._.change_input_currency}
              testID="changeAmountUnitButton"
              style={styles.changeAmountUnit}
              onPress={this.changeAmountUnit}
            >
              <Image source={require('../img/round-compare-arrows-24-px.png')} />
            </TouchableOpacity>
          )}
        </Animated.View>
        {rateIsOutdated && (
          <View style={styles.outdatedRateContainer}>
            <Animated.View style={opacityStyle}>
              <Badge status="warning" />
            </Animated.View>
            <View style={styles.spacing8} />
            <BlueText>
              {loc.formatString(loc.send.outdated_rate, { date: dayjs(this.state.mostRecentFetchedRate.LastUpdated).format('l LT') })}
            </BlueText>
            <View style={styles.spacing8} />
            {this.state.isRateBeingUpdated ? (
              <ActivityIndicator />
            ) : (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={loc._.refresh} onPress={this.updateRate}>
                <Icon name="sync" type="font-awesome-5" size={16} color={colors.buttonAlternativeTextColor} />
              </TouchableOpacity>
            )}
          </View>
        )}
        {showErrorMessage && (
          <View style={styles.amountLowContainer}>
            <View style={styles.spacing8} />
            <Animated.View style={opacityStyle}>
              <Badge status="error" />
            </Animated.View>
            <View style={styles.spacing8} />
            <Text style={styles.errorText}>
              {loc.formatString(loc.send.details_amount_field_is_less_than_minimum_amount_sat, { amount: formatBalance(500, unit) })}
            </Text>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  touchableContainer: {
    flex: 1,
  },
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
  amountLowContainer: {
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    backgroundColor: BlueCurrentTheme.colors.outgoingBackgroundColor,
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
  errorText: {
    color: BlueCurrentTheme.colors.outgoingTextColor,
    margin: 16,
    textAlign: 'center',
    fontWeight: 'bold',
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

// Expose static methods
AmountInputWithStyle.conversionCache = AmountInput.conversionCache;
AmountInputWithStyle.getCachedSatoshis = AmountInput.getCachedSatoshis;
AmountInputWithStyle.setCachedSatoshis = AmountInput.setCachedSatoshis;

export default AmountInputWithStyle;
