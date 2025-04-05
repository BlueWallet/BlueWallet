import React, { useState, useRef, forwardRef, useImperativeHandle, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import BottomModal, { BottomModalHandle } from './BottomModal';
import { useTheme } from './themes';
import loc, { formatBalance } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';

interface NetworkTransactionFees {
  fastestFee: number;
  mediumFee: number;
  slowFee: number;
}

interface FeePrecalc {
  fastestFee: number | null;
  mediumFee: number | null;
  slowFee: number | null;
  current: number | null;
}

interface SelectFeeModalProps {
  networkTransactionFees: NetworkTransactionFees;
  feePrecalc: FeePrecalc;
  feeRate: number | string;
  setCustomFee: (fee: string) => void;
  setFeePrecalc: (fn: (fp: FeePrecalc) => FeePrecalc) => void;
  feeUnit: BitcoinUnit;
}

const FeeOption = React.memo(({ label, time, fee, rate, active, disabled, onPress, colors, formatFee }: any) => (
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
));

const CustomFeeInput = React.memo(({ value, onChangeText, onSubmitEditing, onFocus, onBlur, colors }: any) => (
  <TextInput
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
));

const SelectFeeModal = forwardRef<BottomModalHandle, SelectFeeModalProps>(
  ({ networkTransactionFees, feePrecalc, feeRate, setCustomFee, setFeePrecalc, feeUnit = BitcoinUnit.BTC }, ref) => {
    const [customFeeValue, setCustomFeeValue] = useState<string>('');
    const [isCustomFeeFocused, setIsCustomFeeFocused] = useState(false);
    const feeModalRef = useRef<BottomModalHandle>(null);
    const customFeeInputRef = useRef<TextInput>(null);
    const nf = networkTransactionFees;

    const { colors } = useTheme();

    const stylesHook = StyleSheet.create({
      loading: {
        backgroundColor: colors.background,
      },
      root: {
        backgroundColor: colors.elevated,
      },
      input: {
        backgroundColor: colors.inputBackgroundColor,
        borderColor: colors.formBorder,
        color: colors.foregroundColor,
        width: '100%',
      },
      feeModalItemActive: {
        backgroundColor: colors.feeActive,
      },
      feeModalLabel: {
        color: colors.successColor,
      },
      feeModalTime: {
        backgroundColor: colors.successColor,
      },
      feeModalTimeText: {
        color: colors.background,
      },
      feeModalValue: {
        color: colors.successColor,
      },
      feeModalCustomText: {
        color: colors.buttonAlternativeTextColor,
      },
      insertCustomFeeText: {
        color: colors.foregroundColor,
      },
      selectLabel: {
        color: colors.buttonTextColor,
      },
      of: {
        color: colors.feeText,
      },
      memo: {
        borderColor: colors.formBorder,
        borderBottomColor: colors.formBorder,
        backgroundColor: colors.inputBackgroundColor,
      },
      feeLabel: {
        color: colors.feeText,
      },
      feeModalItemDisabled: {
        backgroundColor: colors.buttonDisabledBackgroundColor,
      },
      feeModalItemTextDisabled: {
        color: colors.buttonDisabledTextColor,
      },
      feeRow: {
        backgroundColor: colors.feeLabel,
      },
      feeValue: {
        color: colors.feeValue,
      },
      customFeeInput: {
        color: colors.successColor,
        borderColor: colors.formBorder,
        width: 70,
        textAlign: 'right',
        marginRight: 4,
        padding: 0,
        fontSize: 16,
      },
    });

    useImperativeHandle(ref, () => ({
      present: async () => await feeModalRef.current?.present(),
      dismiss: async () => await feeModalRef.current?.dismiss(),
    }));

    const formatFee = useCallback((fee: number) => formatBalance(fee, feeUnit, true), [feeUnit]);

    const handleSelectOption = useCallback(
      async (fee: number | null, rate: number) => {
        setFeePrecalc(fp => ({ ...fp, current: fee }));
        setCustomFee(rate.toString());
        await feeModalRef.current?.dismiss();
      },
      [setFeePrecalc, setCustomFee],
    );

    const handleCustomFeeChange = useCallback(
      (value: string) => {
        const sanitizedValue = value.replace(/[^\d.,]/g, '').replace(/([.,].*?)[.,]/g, '$1');

        if (sanitizedValue !== value) {
          setCustomFeeValue(sanitizedValue);
        } else {
          setCustomFeeValue(value);
        }

        if (sanitizedValue === '') {
          setCustomFee(networkTransactionFees.fastestFee.toString());
          setFeePrecalc(fp => ({ ...fp, current: feePrecalc.fastestFee }));
          return;
        }

        if (/^\d*[.,]?\d*$/.test(sanitizedValue)) {
          const numericValue = sanitizedValue.replace(',', '.');
          if (Number(numericValue) > 0) {
            setCustomFee(numericValue);
            setFeePrecalc(fp => ({ ...fp, current: null }));
          }
        }
      },
      [networkTransactionFees.fastestFee, feePrecalc.fastestFee, setCustomFee, setFeePrecalc],
    );

    const handleCustomFeeSubmit = useCallback(async () => {
      const numericValue = customFeeValue.replace(',', '.');
      if (numericValue && Number(numericValue) > 0) {
        setCustomFee(numericValue);
        setFeePrecalc(fp => ({ ...fp, current: null }));
        await feeModalRef.current?.dismiss();
      }
    }, [customFeeValue, setCustomFee, setFeePrecalc]);

    const options = useMemo(
      () => [
        {
          label: loc.send.fee_fast,
          time: loc.send.fee_10m,
          fee: feePrecalc.fastestFee,
          rate: nf.fastestFee,
          active: !isCustomFeeFocused && Number(feeRate) === nf.fastestFee,
        },
        {
          label: loc.send.fee_medium,
          time: loc.send.fee_3h,
          fee: feePrecalc.mediumFee,
          rate: nf.mediumFee,
          active: !isCustomFeeFocused && Number(feeRate) === nf.mediumFee,
          disabled: nf.mediumFee === nf.fastestFee,
        },
        {
          label: loc.send.fee_slow,
          time: loc.send.fee_1d,
          fee: feePrecalc.slowFee,
          rate: nf.slowFee,
          active: !isCustomFeeFocused && Number(feeRate) === nf.slowFee,
          disabled: nf.slowFee === nf.mediumFee || nf.slowFee === nf.fastestFee,
        },
      ],
      [feePrecalc, nf, feeRate, isCustomFeeFocused],
    );

    const handleCustomFeeBlur = () => {
      setIsCustomFeeFocused(false);
      const numericValue = Number(customFeeValue.replace(',', '.'));
      if (!customFeeValue || numericValue < 1) {
        setCustomFeeValue('');
        setCustomFee(networkTransactionFees.fastestFee.toString());
        setFeePrecalc(fp => ({ ...fp, current: feePrecalc.fastestFee }));
      }
    };

    const handleCustomPress = () => {
      customFeeInputRef.current?.focus();
    };

    const isCustomFeeSelected = () => {
      if (isCustomFeeFocused) return true;
      const matchesPresetOption = options.some(option => Number(feeRate) === option.rate);
      if (matchesPresetOption) {
        return false;
      }
      return true;
    };

    return (
      <BottomModal ref={feeModalRef} backgroundColor={colors.modal}>
        <View>
          {options.map(({ label, time, fee, rate, active, disabled }) => (
            <FeeOption
              key={label}
              label={label}
              time={time}
              fee={fee}
              rate={rate}
              active={active}
              disabled={disabled}
              onPress={() => handleSelectOption(fee, rate)}
              colors={colors}
              formatFee={formatFee}
              feeUnit={feeUnit}
            />
          ))}
          <TouchableOpacity
            accessibilityRole="button"
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
                  value={customFeeValue}
                  onChangeText={handleCustomFeeChange}
                  onSubmitEditing={handleCustomFeeSubmit}
                  onFocus={() => setIsCustomFeeFocused(true)}
                  onBlur={handleCustomFeeBlur}
                  colors={colors}
                />
                {customFeeValue && /^\d+(\.\d+)?$/.test(customFeeValue.toString()) && Number(customFeeValue) > 0 && (
                  <Text style={stylesHook.feeModalValue}>{loc.units.sat_vbyte}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </BottomModal>
    );
  },
);

export default SelectFeeModal;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingVertical: 20,
  },
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollViewContent: {
    flexDirection: 'row',
  },
  scrollViewIndicator: {
    top: 0,
    left: 8,
    bottom: 0,
    right: 8,
  },
  optionsContent: {
    padding: 22,
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
  inputContainer: {
    marginBottom: 10,
    width: '100%', // Ensure full width
  },
  input: {
    borderRadius: 4,
    padding: 8,
    marginVertical: 8,
    fontSize: 16,
  },
  customFeeTextInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#9aa0aa',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
    fontSize: 16,
  },
  feeModalTime: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  feeModalCustomText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createButton: {
    marginVertical: 16,
    marginHorizontal: 16,
    alignContent: 'center',
    minHeight: 44,
  },
  select: {
    marginBottom: 24,
    marginHorizontal: 24,
    alignItems: 'center',
  },
  selectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  selectWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  selectLabel: {
    fontSize: 14,
  },
  of: {
    alignSelf: 'flex-end',
    marginRight: 18,
    marginVertical: 8,
  },
  feeModalFooter: {
    paddingVertical: 46,
    flexDirection: 'row',
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  feeModalFooterSpacing: {
    paddingHorizontal: 16,
  },
  memo: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  memoText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: '#81868e',
  },
  fee: {
    flexDirection: 'row',
    marginHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
  },
  feeRow: {
    minWidth: 40,
    height: 25,
    borderRadius: 4,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  advancedOptions: {
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
  },
  feeModalCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  feeModalCloseButtonText: {
    color: '#007AFF',
  },
  customFeeInput: {
    fontSize: 16,
    height: 36,
    textAlign: 'right',
    padding: 0,
  },
  customFeeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  customFeeButton: {
    marginBottom: 44,
  },
});
