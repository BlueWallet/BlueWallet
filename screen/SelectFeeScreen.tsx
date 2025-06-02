import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../components/themes';
import loc, { formatBalance } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SendDetailsStackParamList } from '../navigation/SendDetailsStackParamList';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NetworkTransactionFeeType } from '../models/networkTransactionFees';

interface FeeOptionProps {
  label: string;
  time: string;
  fee: number | null;
  rate: number;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  formatFee: (fee: number) => string;
  feeUnit: BitcoinUnit;
}

interface CustomFeeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmitEditing: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

const FeeOption = React.memo<FeeOptionProps>(
  ({ label, time, fee, rate, active, disabled, onPress, formatFee }) => {
    const { colors } = useTheme();
    return (
      <TouchableOpacity
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[styles.feeModalItem, active && styles.feeModalItemActive, active && !disabled && { backgroundColor: colors.feeActive }]}
      >
        <View style={styles.feeModalRow}>
          <Text style={[styles.feeModalLabel, { color: disabled ? colors.buttonDisabledTextColor : colors.successColor }]}>{label}</Text>
          <View style={[styles.feeModalTime, { backgroundColor: disabled ? colors.buttonDisabledBackgroundColor : colors.successColor }]}>
            <Text style={{ color: colors.background }}>~{time}</Text>
          </View>
        </View>
        <View style={styles.feeModalRow}>
          <Text style={{ color: disabled ? colors.buttonDisabledTextColor : colors.successColor }}>{fee && formatFee(fee)}</Text>
          <Text style={{ color: disabled ? colors.buttonDisabledTextColor : colors.successColor }}>
            {rate} {loc.units.sat_vbyte}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.label === nextProps.label &&
      prevProps.time === nextProps.time &&
      prevProps.fee === nextProps.fee &&
      prevProps.rate === nextProps.rate &&
      prevProps.active === nextProps.active &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.onPress === nextProps.onPress &&
      prevProps.formatFee === nextProps.formatFee &&
      prevProps.feeUnit === nextProps.feeUnit
    );
  },
);

const CustomFeeInput = React.forwardRef<TextInput, CustomFeeInputProps>(
  ({ value, onChangeText, onSubmitEditing, onFocus, onBlur }, ref) => {
    const { colors } = useTheme();
    return (
      <TextInput
        ref={ref}
        style={[styles.customFeeInput, { color: colors.successColor, borderColor: colors.formBorder }]}
        keyboardType="numeric"
        placeholder={loc.send.insert_custom_fee}
        value={value}
        placeholderTextColor={colors.placeholderTextColor}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        onBlur={onBlur}
        enablesReturnKeyAutomatically
        returnKeyType="done"
        accessibilityLabel={loc.send.create_fee}
        testID="feeCustom"
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.onChangeText === nextProps.onChangeText &&
      prevProps.onSubmitEditing === nextProps.onSubmitEditing &&
      prevProps.onFocus === nextProps.onFocus &&
      prevProps.onBlur === nextProps.onBlur
    );
  },
);

type SelectFeeScreenNavigationProp = NativeStackNavigationProp<SendDetailsStackParamList, 'SelectFee'>;
type SelectFeeScreenRouteProp = RouteProp<SendDetailsStackParamList, 'SelectFee'>;

const SelectFeeScreen = () => {
  const navigation = useNavigation<SelectFeeScreenNavigationProp>();
  const route = useRoute<SelectFeeScreenRouteProp>();

  const { networkTransactionFees, feePrecalc, feeRate, feeUnit = BitcoinUnit.BTC, walletID, customFee } = route.params;

  console.debug('SelectFeeScreen: Screen initialized');
  console.debug('SelectFeeScreen: route.params:', route.params);
  console.debug('SelectFeeScreen: networkTransactionFees:', networkTransactionFees);
  console.debug('SelectFeeScreen: feePrecalc:', feePrecalc);
  console.debug('SelectFeeScreen: feeRate:', feeRate);
  console.debug('SelectFeeScreen: customFee:', customFee);

  const [customFeeValue, setCustomFeeValue] = useState<string>(customFee || '');
  const [isCustomFeeFocused, setIsCustomFeeFocused] = useState(false);
  const customFeeInputRef = useRef<TextInput>(null);
  const nf = networkTransactionFees;

  const { colors } = useTheme();

  const stylesHook = StyleSheet.create({
    container: {
      backgroundColor: colors.elevated,
      paddingHorizontal: 16,
      paddingVertical: 8, // Add some vertical padding for formSheet
    },
    feeModalItemActive: {
      backgroundColor: colors.feeActive,
    },
    feeModalLabel: {
      color: colors.successColor,
    },
    feeModalValue: {
      color: colors.successColor,
    },
  });

  const formatFee = useCallback((fee: number) => formatBalance(fee, feeUnit, true), [feeUnit]);

  const handleFeeOptionPress = useCallback(
    (rate: number, feeType: NetworkTransactionFeeType) => {
      console.debug('SelectFeeScreen: handleFeeOptionPress called');
      console.debug('SelectFeeScreen: rate:', rate);
      console.debug('SelectFeeScreen: feeType:', feeType);
      console.debug('SelectFeeScreen: walletID:', walletID);

      // Navigate back and pass the actual rate value along with the fee type
      navigation.popTo('SendDetails', {
        walletID,
        selectedFeeRate: rate.toString(),
        selectedFeeType: feeType,
      });

      console.debug('SelectFeeScreen: Navigation popTo called with params:', {
        walletID,
        selectedFeeRate: rate.toString(),
        selectedFeeType: feeType,
      });
    },
    [navigation, walletID],
  );

  const handleCustomFeeChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d.,]/g, '');

    const singleDecimalValue = cleanValue.replace(/([.,].*?)[.,]/g, '$1');

    setCustomFeeValue(singleDecimalValue);
  }, []);

  const handleCustomFeeSubmit = useCallback(() => {
    console.debug('SelectFeeScreen: handleCustomFeeSubmit called');
    console.debug('SelectFeeScreen: customFeeValue:', customFeeValue);

    const numericValue = customFeeValue.replace(',', '.');
    console.debug('SelectFeeScreen: numericValue:', numericValue);

    if (numericValue && Number(numericValue) > 0) {
      console.debug('SelectFeeScreen: Valid custom fee, navigating with:', {
        walletID,
        selectedFeeRate: numericValue,
        selectedFeeType: NetworkTransactionFeeType.CUSTOM,
      });

      navigation.popTo('SendDetails', {
        walletID,
        selectedFeeRate: numericValue,
        selectedFeeType: NetworkTransactionFeeType.CUSTOM,
      });
    } else {
      console.debug('SelectFeeScreen: Invalid custom fee value');
    }
  }, [customFeeValue, navigation, walletID]);

  const options = useMemo(
    () => [
      {
        label: loc.send.fee_fast,
        time: loc.send.fee_10m,
        fee: feePrecalc.fastestFee,
        rate: nf.fastestFee,
        feeType: NetworkTransactionFeeType.FAST,
        active: !isCustomFeeFocused && Number(feeRate) === nf.fastestFee,
      },
      {
        label: loc.send.fee_medium,
        time: loc.send.fee_3h,
        fee: feePrecalc.mediumFee,
        rate: nf.mediumFee,
        feeType: NetworkTransactionFeeType.MEDIUM,
        active: !isCustomFeeFocused && Number(feeRate) === nf.mediumFee,
        disabled: nf.mediumFee === nf.fastestFee,
      },
      {
        label: loc.send.fee_slow,
        time: loc.send.fee_1d,
        fee: feePrecalc.slowFee,
        rate: nf.slowFee,
        feeType: NetworkTransactionFeeType.SLOW,
        active: !isCustomFeeFocused && Number(feeRate) === nf.slowFee,
        disabled: nf.slowFee === nf.mediumFee || nf.slowFee === nf.fastestFee,
      },
    ],
    [feePrecalc, nf, feeRate, isCustomFeeFocused],
  );

  const handleCustomFeeBlur = () => {
    setIsCustomFeeFocused(false);
    const numericValue = Number(customFeeValue.replace(',', '.'));
    if (!customFeeValue || numericValue === 0) {
      setCustomFeeValue('');
    }
  };

  const handleCustomPress = () => {
    customFeeInputRef.current?.focus();
  };

  const handleCustomFocus = useCallback(() => {
    setIsCustomFeeFocused(true);
  }, []);

  const isCustomFeeSelected = () => {
    if (isCustomFeeFocused) return true;
    const matchesPresetOption = options.some(option => Number(feeRate) === option.rate);
    if (matchesPresetOption) {
      return false;
    }
    return true;
  };

  return (
    <View style={[stylesHook.container, styles.screenContainer]}>
      <View style={styles.contentContainer}>
        {options.map(({ label, time, fee, rate, active, disabled, feeType }) => (
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
            feeUnit={feeUnit}
          />
        ))}
        <TouchableOpacity
          accessibilityRole="button"
          testID="feeCustomContainerButton"
          onPress={handleCustomPress}
          style={[
            styles.feeModalItem,
            styles.customFeeButton,
            isCustomFeeSelected() && styles.feeModalItemActive,
            isCustomFeeSelected() && stylesHook.feeModalItemActive,
          ]}
        >
          <View style={styles.feeModalRow}>
            <Text style={[styles.feeModalLabel, stylesHook.feeModalLabel]}>{loc.send.fee_custom}</Text>
            <View style={styles.customFeeContainer}>
              <CustomFeeInput
                ref={customFeeInputRef}
                value={customFeeValue}
                onChangeText={handleCustomFeeChange}
                onSubmitEditing={handleCustomFeeSubmit}
                onFocus={handleCustomFocus}
                onBlur={handleCustomFeeBlur}
              />
              {customFeeValue && /^\d+(\.\d+)?$/.test(customFeeValue) && Number(customFeeValue) > 0 && (
                <Text style={stylesHook.feeModalValue}>{loc.units.sat_vbyte}</Text>
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
    minHeight: 300, // Minimum height for formSheet presentation
    maxHeight: 500, // Maximum height to prevent overflow
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
