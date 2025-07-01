import React, { useRef, useCallback, useReducer, useEffect, FC } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Keyboard } from 'react-native';
import { useTheme } from '../components/themes';
import loc, { formatBalance } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { SendDetailsStackParamList } from '../navigation/SendDetailsStackParamList';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NetworkTransactionFeeType } from '../models/networkTransactionFees';

enum FeeScreenActions {
  SET_CUSTOM_FEE_VALUE = 'SET_CUSTOM_FEE_VALUE',
  SET_CUSTOM_FEE_FOCUSED = 'SET_CUSTOM_FEE_FOCUSED',
  SET_CUSTOM_FEE_BLURRED = 'SET_CUSTOM_FEE_BLURRED',
  CLEAR_CUSTOM_FEE = 'CLEAR_CUSTOM_FEE',
  SET_OPTIONS = 'SET_OPTIONS',
}

interface FeeOption {
  label: string;
  time: string;
  fee: number | null;
  rate: number;
  feeType: NetworkTransactionFeeType;
  active: boolean;
  disabled?: boolean;
}

interface FeeScreenState {
  customFeeValue: string;
  isCustomFeeFocused: boolean;
  options: FeeOption[];
  isCustomFeeSelected: boolean;
}

type FeeScreenAction =
  | { type: FeeScreenActions.SET_CUSTOM_FEE_VALUE; payload: string }
  | { type: FeeScreenActions.SET_CUSTOM_FEE_FOCUSED }
  | { type: FeeScreenActions.SET_CUSTOM_FEE_BLURRED }
  | { type: FeeScreenActions.CLEAR_CUSTOM_FEE }
  | { type: FeeScreenActions.SET_OPTIONS; payload: { options: FeeOption[]; currentFeeRate: number } };

const feeScreenReducer = (state: FeeScreenState, action: FeeScreenAction): FeeScreenState => {
  switch (action.type) {
    case FeeScreenActions.SET_CUSTOM_FEE_VALUE:
      return { ...state, customFeeValue: action.payload };
    case FeeScreenActions.SET_CUSTOM_FEE_FOCUSED:
      return {
        ...state,
        isCustomFeeFocused: true,
        isCustomFeeSelected: true,
        options: state.options.map(opt => ({ ...opt, active: false })),
      };
    case FeeScreenActions.SET_CUSTOM_FEE_BLURRED:
      return { ...state, isCustomFeeFocused: false };
    case FeeScreenActions.CLEAR_CUSTOM_FEE:
      return { ...state, customFeeValue: '' };
    case FeeScreenActions.SET_OPTIONS: {
      const { options, currentFeeRate } = action.payload;
      const matchesPresetOption = options.some(option => currentFeeRate === option.rate);
      const updatedOptions = options.map(option => ({
        ...option,
        active: !state.isCustomFeeFocused && currentFeeRate === option.rate,
      }));
      return {
        ...state,
        options: updatedOptions,
        isCustomFeeSelected: state.isCustomFeeFocused || !matchesPresetOption,
      };
    }
    default:
      return state;
  }
};

interface FeeOptionProps {
  label: string;
  time: string;
  fee: number | null;
  rate: number;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  formatFee: (fee: number) => string;
  colors: any;
}

const FeeOption: FC<FeeOptionProps> = ({ label, time, fee, rate, active, disabled, onPress, formatFee, colors }) => {
  const stylesHook = StyleSheet.create({
    feeModalItemActiveBackground: {
      backgroundColor: colors.feeActive,
    },
    feeOptionText: {
      color: colors.successColor,
    },
    feeOptionTextDisabled: {
      color: colors.buttonDisabledTextColor,
    },
    feeTimeBackground: {
      backgroundColor: colors.successColor,
    },
    feeTimeBackgroundDisabled: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    feeTimeText: {
      color: colors.background,
    },
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.feeModalItem, active && styles.feeModalItemActive, active && !disabled && stylesHook.feeModalItemActiveBackground]}
    >
      <View style={styles.feeModalRow}>
        <Text style={[styles.feeModalLabel, disabled ? stylesHook.feeOptionTextDisabled : stylesHook.feeOptionText]}>{label}</Text>
        <View style={[styles.feeModalTime, disabled ? stylesHook.feeTimeBackgroundDisabled : stylesHook.feeTimeBackground]}>
          <Text style={stylesHook.feeTimeText}>~{time}</Text>
        </View>
      </View>
      <View style={styles.feeModalRow}>
        <Text style={disabled ? stylesHook.feeOptionTextDisabled : stylesHook.feeOptionText}>{fee && formatFee(fee)}</Text>
        <Text style={disabled ? stylesHook.feeOptionTextDisabled : stylesHook.feeOptionText}>
          {rate} {loc.units.sat_vbyte}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

type SelectFeeScreenNavigationProp = NativeStackNavigationProp<SendDetailsStackParamList, 'SelectFee'>;
type SelectFeeScreenRouteProp = RouteProp<SendDetailsStackParamList, 'SelectFee'>;

const SelectFeeScreen = () => {
  const navigation = useNavigation<SelectFeeScreenNavigationProp>();
  const route = useRoute<SelectFeeScreenRouteProp>();
  const { colors } = useTheme();

  const { networkTransactionFees, feePrecalc, feeRate, feeUnit = BitcoinUnit.BTC, walletID, customFee } = route.params;

  const [state, dispatch] = useReducer(feeScreenReducer, {
    customFeeValue: customFee || '',
    isCustomFeeFocused: false,
    options: [],
    isCustomFeeSelected: false,
  });

  const customFeeInputRef = useRef<TextInput>(null);
  const nf = networkTransactionFees;

  const stylesHook = StyleSheet.create({
    container: {
      backgroundColor: colors.elevated,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    feeModalItemActiveBackground: {
      backgroundColor: colors.feeActive,
    },
    customLabelColor: {
      color: colors.successColor,
    },
    satVbyteText: {
      color: colors.successColor,
    },
    customFeeInputColors: {
      color: colors.successColor,
      borderColor: colors.formBorder,
    },
    feeTimeBackground: {
      backgroundColor: colors.successColor,
    },
    feeTimeBackgroundDisabled: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    feeTimeText: {
      color: colors.background,
    },
  });

  const formatFee = useCallback((fee: number) => formatBalance(fee, feeUnit, true), [feeUnit]);

  useEffect(() => {
    const options: FeeOption[] = [
      {
        label: loc.send.fee_fast,
        time: loc.send.fee_10m,
        fee: feePrecalc.fastestFee,
        rate: nf.fastestFee,
        feeType: NetworkTransactionFeeType.FAST,
        active: false,
      },
      {
        label: loc.send.fee_medium,
        time: loc.send.fee_3h,
        fee: feePrecalc.mediumFee,
        rate: nf.mediumFee,
        feeType: NetworkTransactionFeeType.MEDIUM,
        active: false,
        disabled: nf.mediumFee === nf.fastestFee,
      },
      {
        label: loc.send.fee_slow,
        time: loc.send.fee_1d,
        fee: feePrecalc.slowFee,
        rate: nf.slowFee,
        feeType: NetworkTransactionFeeType.SLOW,
        active: false,
        disabled: nf.slowFee === nf.mediumFee || nf.slowFee === nf.fastestFee,
      },
    ];
    dispatch({ type: FeeScreenActions.SET_OPTIONS, payload: { options, currentFeeRate: Number(feeRate) } });
  }, [feePrecalc, nf, feeRate]);

  const navigateWithFee = useCallback(
    (feeRateValue: string, feeType: NetworkTransactionFeeType) => {
      navigation.popTo('SendDetails', { walletID, selectedFeeRate: feeRateValue, selectedFeeType: feeType }, { merge: true });
    },
    [navigation, walletID],
  );

  const handleFeeOptionPress = useCallback(
    (rate: number, feeType: NetworkTransactionFeeType) => {
      navigateWithFee(rate.toString(), feeType);
    },
    [navigateWithFee],
  );

  const handleCustomFeeChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d.,]/g, '').replace(/([.,].*?)[.,]/g, '$1');
    dispatch({ type: FeeScreenActions.SET_CUSTOM_FEE_VALUE, payload: cleanValue });
  }, []);

  const handleCustomFeeSubmit = useCallback(() => {
    const numericValue = state.customFeeValue.replace(',', '.');
    if (numericValue && Number(numericValue) >= 0) {
      navigateWithFee(numericValue, NetworkTransactionFeeType.CUSTOM);
    }
  }, [state.customFeeValue, navigateWithFee]);

  const handleCustomFeeBlur = useCallback(() => {
    dispatch({ type: FeeScreenActions.SET_CUSTOM_FEE_BLURRED });
    const numericValue = Number(state.customFeeValue.replace(',', '.'));
    if (!state.customFeeValue || numericValue < 0) {
      dispatch({ type: FeeScreenActions.CLEAR_CUSTOM_FEE });
    }
  }, [state.customFeeValue]);

  const handleCustomFocus = useCallback(() => dispatch({ type: FeeScreenActions.SET_CUSTOM_FEE_FOCUSED }), []);
  const handleCustomPress = useCallback(() => customFeeInputRef.current?.focus(), []);

  useFocusEffect(
    useCallback(() => {
      Keyboard.dismiss();
      return () => Keyboard.dismiss();
    }, []),
  );

  return (
    <View style={[stylesHook.container, styles.screenContainer]}>
      <View style={styles.contentContainer}>
        {state.options.map(({ label, time, fee, rate, active, disabled, feeType }) => (
          <FeeOption
            key={label}
            label={label}
            time={time}
            fee={fee}
            rate={rate}
            active={active}
            disabled={disabled}
            onPress={() => handleFeeOptionPress(rate, feeType)}
            formatFee={formatFee}
            colors={colors}
          />
        ))}
        <TouchableOpacity
          accessibilityRole="button"
          testID="feeCustomContainerButton"
          onPress={handleCustomPress}
          style={[
            styles.feeModalItem,
            styles.customFeeButton,
            state.isCustomFeeSelected && styles.feeModalItemActive,
            state.isCustomFeeSelected && stylesHook.feeModalItemActiveBackground,
          ]}
        >
          <View style={styles.feeModalRow}>
            <Text style={[styles.feeModalLabel, stylesHook.customLabelColor]}>{loc.send.fee_custom}</Text>
            <View style={styles.customFeeContainer}>
              <TextInput
                ref={customFeeInputRef}
                style={[styles.customFeeInput, stylesHook.customFeeInputColors]}
                keyboardType="numeric"
                placeholder={loc.send.insert_custom_fee}
                value={state.customFeeValue}
                placeholderTextColor={colors.placeholderTextColor}
                onChangeText={handleCustomFeeChange}
                onSubmitEditing={handleCustomFeeSubmit}
                onFocus={handleCustomFocus}
                onBlur={handleCustomFeeBlur}
                enablesReturnKeyAutomatically
                returnKeyType="done"
                accessibilityLabel={loc.send.create_fee}
                testID="feeCustom"
              />
              {state.customFeeValue && /^\d+(\.\d+)?$/.test(state.customFeeValue) && Number(state.customFeeValue) > 0 && (
                <Text style={stylesHook.satVbyteText}>{loc.units.sat_vbyte}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SelectFeeScreen;

const styles = StyleSheet.create({
  screenContainer: {
    minHeight: 300,
    maxHeight: 500,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  feeModalItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
  },
  feeModalItemActive: {
    borderRadius: 8,
  },
  feeModalRow: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeModalLabel: {
    fontSize: 22,
    fontWeight: '600',
  },
  customFeeInput: {
    fontSize: 16,
    height: 36,
    textAlign: 'right',
    padding: 0,
    width: 70,
    marginRight: 4,
  },
  customFeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  customFeeButton: {
    marginBottom: 44,
  },
  feeModalTime: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});
