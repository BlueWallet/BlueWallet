import React, { Component } from 'react';
import {
  Image,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  TextInputProps,
} from 'react-native';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { Badge, Icon, Text } from '@rneui/themed';

import {
  fiatToBTC,
  getCurrencySymbol,
  isRateOutdated,
  mostRecentFetchedRate,
  satoshiToBTC,
  updateExchangeRate,
} from '../blue_modules/currency';
import { BlueText } from '../BlueComponents';
import confirm from '../helpers/confirm';
import loc, { formatBalancePlain, formatBalanceWithoutSuffix, removeTrailingZeros } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { useTheme } from './themes';

dayjs.extend(localizedFormat);

interface AmountInputProps extends TextInputProps {
  isLoading?: boolean;
  /**
   * amount is a string or number that's always in current unit denomination, e.g. '0.001' or '9.43' or '10000'
   */
  amount?: number | string;
  /**
   * callback that returns currently typed amount, in current denomination, e.g. 0.001 or 10000 or $9.34
   * (btc, sat, fiat)
   */
  onChangeText: (text?: string) => void;
  /**
   * callback thats fired to notify of currently selected denomination, returns <BitcoinUnit.*>
   */
  onAmountUnitChange: (newUnit: BitcoinUnit) => void;
  disabled?: boolean;
  colors: Record<string, string | number>;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
  unit?: BitcoinUnit;
  onBlur?: () => void;
  onFocus?: () => void;
}

interface CurrencyRate {
  LastUpdated: Date | null;
}
interface AmountInputState {
  mostRecentFetchedRate: CurrencyRate;
  isRateOutdated: boolean;
  isRateBeingUpdated: boolean;
}

class AmountInput extends Component<AmountInputProps, AmountInputState> {
  /**
   * cache of conversions fiat amount => satoshi
   */
  static conversionCache: Record<string, string> = {};

  static getCachedSatoshis = (amount: string | number) => {
    return AmountInput.conversionCache[String(amount) + BitcoinUnit.LOCAL_CURRENCY] || false;
  };

  static setCachedSatoshis = (amount: string | number, sats: string) => {
    AmountInput.conversionCache[String(amount) + BitcoinUnit.LOCAL_CURRENCY] = sats;
  };

  private textInput = React.createRef<TextInput>();

  constructor(props: AmountInputProps) {
    super(props);
    this.state = {
      mostRecentFetchedRate: { LastUpdated: new Date() },
      isRateOutdated: false,
      isRateBeingUpdated: false,
    };
  }

  async componentDidMount() {
    try {
      const mostRecentFetchedRateValue = await mostRecentFetchedRate();
      this.setState({ mostRecentFetchedRate: mostRecentFetchedRateValue });
    } finally {
      const isRateOutdatedValue = await isRateOutdated();
      this.setState({ isRateOutdated: isRateOutdatedValue });
    }
  }

  /**
   * here we must recalculate old amount value (which was denominated in `previousUnit`) to new denomination `newUnit`
   * and fill this value in input box, so user can switch between, for example, 0.001 BTC <=> 100000 sats
   *
   * @param previousUnit one of {BitcoinUnit.*}
   * @param newUnit one of {BitcoinUnit.*}
   */
  onAmountUnitChange(previousUnit: BitcoinUnit, newUnit: BitcoinUnit) {
    const { amount = 0 } = this.props;
    const log = `${amount}(${previousUnit}) ->`;
    let sats = '0';

    switch (previousUnit) {
      case BitcoinUnit.BTC:
        sats = new BigNumber(amount).multipliedBy(100000000).toString();
        break;
      case BitcoinUnit.SATS:
        sats = String(amount);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        sats = new BigNumber(fiatToBTC(Number(amount))).multipliedBy(100000000).toString();
        break;
    }

    if (previousUnit === BitcoinUnit.LOCAL_CURRENCY && AmountInput.conversionCache[String(amount) + previousUnit]) {
      // cache hit! we reuse old value that supposedly doesn't have rounding errors
      sats = AmountInput.conversionCache[String(amount) + previousUnit];
    }

    const newInputValue = formatBalancePlain(Number(sats), newUnit, false);
    console.log(`${log} ${sats}(sats) -> ${newInputValue}(${newUnit})`);

    if (newUnit === BitcoinUnit.LOCAL_CURRENCY && previousUnit === BitcoinUnit.SATS) {
      // we cache conversion, so when we will need reverse conversion there won't be a rounding error
      AmountInput.conversionCache[newInputValue + newUnit] = String(amount);
    }

    this.props.onChangeText(newInputValue);
    this.props.onAmountUnitChange(newUnit);
  }

  /**
   * responsible for cycling currently selected denomination, BTC->SAT->LOCAL_CURRENCY->BTC
   */
  changeAmountUnit = () => {
    const { unit } = this.props;
    let previousUnit = unit || BitcoinUnit.BTC;
    let newUnit: BitcoinUnit;

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
    const { unit } = this.props;
    switch (unit) {
      case BitcoinUnit.BTC:
        return 11;
      case BitcoinUnit.SATS:
        return 15;
      default:
        return 15;
    }
  };

  handleTextInputOnPress = () => {
    this.textInput.current?.focus();
  };

  handleChangeText = (text: string) => {
    const { unit } = this.props;
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

      if (text.startsWith('.')) {
        text = '0.';
      }
    } else if (unit === BitcoinUnit.LOCAL_CURRENCY) {
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
    this.props.onChangeText(text);
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
        const mostRecentFetchedRateValue = await mostRecentFetchedRate();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        this.setState({ mostRecentFetchedRate: mostRecentFetchedRateValue });
      } finally {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const outdated = await isRateOutdated();
        this.setState({ isRateBeingUpdated: false, isRateOutdated: outdated });
      }
    });
  };

  handleSelectionChange = (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    const { selection } = event.nativeEvent;
    const { amount } = this.props;
    const amountStr = String(amount || '');
    if (selection.start !== selection.end || selection.start !== amountStr.length) {
      this.textInput?.current?.setNativeProps({ selection: { start: amountStr.length, end: amountStr.length } });
    }
  };

  render() {
    const { colors, disabled, unit, pointerEvents, isLoading, onBlur, onFocus } = this.props;
    const { isRateBeingUpdated } = this.state;
    const amount = this.props.amount ?? 0;
    const amountStr = String(amount);
    const amountNumber = parseFloat(amountStr);

    let secondaryDisplayCurrency = formatBalanceWithoutSuffix(Number(amountStr), BitcoinUnit.LOCAL_CURRENCY, false);

    // if main display is sat or btc - secondary display is fiat
    // if main display is fiat - secondary display is btc
    let sat: string;
    switch (unit) {
      case BitcoinUnit.BTC:
        sat = new BigNumber(amountNumber).multipliedBy(100000000).toString();
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(Number(sat), BitcoinUnit.LOCAL_CURRENCY, false);
        break;
      case BitcoinUnit.SATS:
        sat = isNaN(amountNumber) ? '0' : String(amountNumber);
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(Number(sat), BitcoinUnit.LOCAL_CURRENCY, false);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        {
          const cacheHit = AmountInput.conversionCache[String(isNaN(amountNumber) ? 0 : amountNumber) + BitcoinUnit.LOCAL_CURRENCY];
          if (cacheHit) {
            // cache hit! we reuse old value that supposedly doesn't have rounding errors
            secondaryDisplayCurrency = satoshiToBTC(Number(cacheHit));
          } else {
            secondaryDisplayCurrency = fiatToBTC(isNaN(amountNumber) ? 0 : amountNumber);
          }
        }
        break;
      default:
        break;
    }

    if (amount === BitcoinUnit.MAX) secondaryDisplayCurrency = ''; // we don't want to display NaN

    const stylesHook = StyleSheet.create({
      center: { padding: amount === BitcoinUnit.MAX ? 0 : 15 },
      localCurrency: { color: disabled ? String(colors.buttonDisabledTextColor) : String(colors.alternativeTextColor2) },
      input: {
        color: disabled ? String(colors.buttonDisabledTextColor) : String(colors.alternativeTextColor2),
        fontSize: amountStr.length > 10 ? 20 : 36,
      },
      cryptoCurrency: { color: disabled ? String(colors.buttonDisabledTextColor) : String(colors.alternativeTextColor2) },
    });

    return (
      <TouchableWithoutFeedback
        accessibilityRole="button"
        accessibilityLabel={loc._.enter_amount}
        disabled={pointerEvents === 'none'}
        onPress={() => this.textInput.current?.focus()}
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
                    testID="BitcoinAmountInput"
                    keyboardType="numeric"
                    onChangeText={this.handleChangeText}
                    onSelectionChange={this.handleSelectionChange}
                    onBlur={() => {
                      if (onBlur) onBlur();
                    }}
                    onFocus={() => {
                      if (onFocus) onFocus();
                    }}
                    placeholder="0"
                    maxLength={this.maxLength()}
                    ref={this.textInput}
                    editable={!isLoading && !disabled}
                    value={amount === BitcoinUnit.MAX ? loc.units.MAX : amountNumber >= 0 ? amountStr : undefined}
                    placeholderTextColor={disabled ? String(colors.buttonDisabledTextColor) : String(colors.alternativeTextColor2)}
                    style={[styles.input, stylesHook.input]}
                  />
                ) : (
                  <Pressable onPress={this.resetAmount}>
                    <Text style={[styles.input, stylesHook.input]}>{BitcoinUnit.MAX}</Text>
                  </Pressable>
                )}
                {unit !== BitcoinUnit.LOCAL_CURRENCY && amount !== BitcoinUnit.MAX && (
                  <Text style={[styles.cryptoCurrency, stylesHook.cryptoCurrency]}>{' ' + loc.units[unit || BitcoinUnit.BTC]}</Text>
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
                disabled={isRateBeingUpdated}
                style={isRateBeingUpdated ? styles.disabledButton : styles.enabledButon}
              >
                <Icon name="sync" type="font-awesome-5" size={16} color={colors.buttonAlternativeTextColor} />
              </TouchableOpacity>
            </View>
          )}
        </>
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

const AmountInputWithStyle: React.FC<Partial<AmountInputProps>> = props => {
  const { colors } = useTheme();
  return <AmountInput {...(props as AmountInputProps)} colors={colors} />;
};

// expose static methods
(AmountInputWithStyle as any).conversionCache = AmountInput.conversionCache;
(AmountInputWithStyle as any).getCachedSatoshis = AmountInput.getCachedSatoshis;
(AmountInputWithStyle as any).setCachedSatoshis = AmountInput.setCachedSatoshis;

export default AmountInputWithStyle;
