import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import BottomModal, { BottomModalHandle } from './BottomModal';
import { useTheme } from './themes';
import loc, { formatBalance } from '../loc';
import { SecondButton } from './SecondButton';
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

interface Option {
  label: string;
  time: string;
  fee: number | null;
  rate: number;
  active: boolean;
  disabled?: boolean;
}

interface SelectFeeModalProps {
  networkTransactionFees: NetworkTransactionFees;
  feePrecalc: FeePrecalc;
  feeRate: number | string;
  setCustomFee: (fee: string) => void;
  setFeePrecalc: (fn: (fp: FeePrecalc) => FeePrecalc) => void;
  feeUnit: BitcoinUnit;
}

const SelectFeeModal = forwardRef<BottomModalHandle, SelectFeeModalProps>(
  ({ networkTransactionFees, feePrecalc, feeRate, setCustomFee, setFeePrecalc, feeUnit = BitcoinUnit.BTC }, ref) => {
    const [customFee, setCustomFeeState] = useState('');
    const feeModalRef = useRef<BottomModalHandle>(null);
    const customModalRef = useRef<BottomModalHandle>(null);
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
    });

    useImperativeHandle(ref, () => ({
      present: async () => feeModalRef.current?.present(),
      dismiss: async () => feeModalRef.current?.dismiss(),
    }));

    const options: Option[] = [
      {
        label: loc.send.fee_fast,
        time: loc.send.fee_10m,
        fee: feePrecalc.fastestFee,
        rate: nf.fastestFee,
        active: Number(feeRate) === nf.fastestFee,
      },
      {
        label: loc.send.fee_medium,
        time: loc.send.fee_3h,
        fee: feePrecalc.mediumFee,
        rate: nf.mediumFee,
        active: Number(feeRate) === nf.mediumFee,
        disabled: nf.mediumFee === nf.fastestFee,
      },
      {
        label: loc.send.fee_slow,
        time: loc.send.fee_1d,
        fee: feePrecalc.slowFee,
        rate: nf.slowFee,
        active: Number(feeRate) === nf.slowFee,
        disabled: nf.slowFee === nf.mediumFee || nf.slowFee === nf.fastestFee,
      },
    ];

    const formatFee = (fee: number) => formatBalance(fee, feeUnit, true);

    const handleCustomFeeSubmit = async () => {
      if (!/^\d+$/.test(customFee) || Number(customFee) <= 0) {
        // Handle error if necessary
        return;
      }
      const fee = Number(customFee) < 1 ? '1' : customFee;
      setCustomFee(fee);
      await customModalRef.current?.dismiss();
      await feeModalRef.current?.dismiss();
    };

    const handleCancel = async () => {
      setCustomFeeState('');
      await customModalRef.current?.dismiss();
    };

    const handlePressCustom = async () => {
      await customModalRef.current?.present();
    };

    const handleSelectOption = async (fee: number | null, rate: number) => {
      setFeePrecalc(fp => ({ ...fp, current: fee }));
      await feeModalRef.current?.dismiss();
      setCustomFee(rate.toString());
    };

    return (
      <BottomModal
        ref={feeModalRef}
        backgroundColor={colors.modal}
        footer={
          <View style={styles.feeModalFooter}>
            <TouchableOpacity testID="feeCustom" accessibilityRole="button" onPress={handlePressCustom}>
              <Text style={[styles.feeModalCustomText, stylesHook.feeModalCustomText]}>{loc.send.fee_custom}</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View>
          {options.map(({ label, time, fee, rate, active, disabled }) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={label}
              disabled={disabled}
              onPress={() => handleSelectOption(fee, rate)}
              style={[styles.feeModalItem, active && styles.feeModalItemActive, active && !disabled && stylesHook.feeModalItemActive]}
            >
              <View style={styles.feeModalRow}>
                <Text style={[styles.feeModalLabel, disabled ? stylesHook.feeModalItemTextDisabled : stylesHook.feeModalLabel]}>
                  {label}
                </Text>
                <View style={[styles.feeModalTime, disabled ? stylesHook.feeModalItemDisabled : stylesHook.feeModalTime]}>
                  <Text style={stylesHook.feeModalTimeText}>~{time}</Text>
                </View>
              </View>
              <View style={styles.feeModalRow}>
                <Text style={disabled ? stylesHook.feeModalItemTextDisabled : stylesHook.feeModalValue}>{fee && formatFee(fee)}</Text>
                <Text style={disabled ? stylesHook.feeModalItemTextDisabled : stylesHook.feeModalValue}>
                  {rate} {loc.units.sat_vbyte}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <BottomModal
          ref={customModalRef}
          blurTint="regular"
          onCloseModalPressed={handleCancel}
          backgroundColor={colors.modal}
          footer={
            <View style={[styles.feeModalFooter, styles.feeModalFooterSpacing]}>
              <SecondButton title={loc._.ok} onPress={handleCustomFeeSubmit} disabled={!customFee || Number(customFee) <= 0} />
            </View>
          }
          footerDefaultMargins
        >
          <View>
            <Text style={[styles.feeModalLabel, stylesHook.insertCustomFeeText]}>{loc.send.insert_custom_fee}</Text>
            <View style={styles.optionsContent} />
            <TextInput
              style={[styles.input, stylesHook.input]}
              keyboardType="numeric"
              placeholder={loc.send.create_fee}
              value={customFee}
              onChangeText={setCustomFeeState}
              autoFocus
            />
          </View>
        </BottomModal>
      </BottomModal>
    );
  },
);

export default SelectFeeModal;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
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
});
