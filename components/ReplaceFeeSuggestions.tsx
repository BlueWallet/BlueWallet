import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlueText } from '../BlueComponents';
import loc, { formatStringAddTwoWhiteSpaces } from '../loc';
import NetworkTransactionFees, { NetworkTransactionFee, NetworkTransactionFeeType } from '../models/networkTransactionFees';
import { useTheme } from './themes';
import { DismissKeyboardInputAccessory, DismissKeyboardInputAccessoryViewID } from './DismissKeyboardInputAccessory';

interface ReplaceFeeSuggestionsProps {
  onFeeSelected: (fee: number) => void;
  transactionMinimum?: number;
}

const ReplaceFeeSuggestions: React.FC<ReplaceFeeSuggestionsProps> = ({ onFeeSelected, transactionMinimum = 1 }) => {
  const [networkFees, setNetworkFees] = useState<NetworkTransactionFee | null>(null);
  const [selectedFeeType, setSelectedFeeType] = useState<NetworkTransactionFeeType>(NetworkTransactionFeeType.FAST);
  const [customFeeValue, setCustomFeeValue] = useState<string>('1');
  const customTextInput = useRef<TextInput>(null);
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    activeButton: {
      backgroundColor: colors.incomingBackgroundColor,
    },
    buttonText: {
      color: colors.successColor,
    },
    timeContainer: {
      backgroundColor: colors.successColor,
    },
    timeText: {
      color: colors.background,
    },
    rateText: {
      color: colors.successColor,
    },
    customFeeInput: {
      backgroundColor: colors.inputBackgroundColor,
      borderBottomColor: colors.formBorder,
      borderColor: colors.formBorder,
    },
    alternativeText: {
      color: colors.alternativeTextColor,
    },
  });

  const fetchNetworkFees = useCallback(async () => {
    try {
      const cachedNetworkTransactionFees = JSON.parse((await AsyncStorage.getItem(NetworkTransactionFee.StorageKey)) || '{}');

      if (cachedNetworkTransactionFees && 'fastestFee' in cachedNetworkTransactionFees) {
        setNetworkFees(cachedNetworkTransactionFees);
        onFeeSelected(cachedNetworkTransactionFees.fastestFee);
        setSelectedFeeType(NetworkTransactionFeeType.FAST);
      }
    } catch (_) {}
    const fees = await NetworkTransactionFees.recommendedFees();
    setNetworkFees(fees);
    onFeeSelected(fees.fastestFee);
    setSelectedFeeType(NetworkTransactionFeeType.FAST);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchNetworkFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFeeSelection = (feeType: NetworkTransactionFeeType) => {
    if (feeType !== NetworkTransactionFeeType.CUSTOM) {
      Keyboard.dismiss();
    }
    if (networkFees) {
      let selectedFee: number;
      switch (feeType) {
        case NetworkTransactionFeeType.FAST:
          selectedFee = networkFees.fastestFee;
          break;
        case NetworkTransactionFeeType.MEDIUM:
          selectedFee = networkFees.mediumFee;
          break;
        case NetworkTransactionFeeType.SLOW:
          selectedFee = networkFees.slowFee;
          break;
        case NetworkTransactionFeeType.CUSTOM:
          selectedFee = Number(customFeeValue);
          break;
      }
      onFeeSelected(selectedFee);
      setSelectedFeeType(feeType);
    }
  };

  const handleCustomFeeChange = (customFee: string) => {
    const sanitizedFee = customFee.replace(/[^0-9]/g, '');
    setCustomFeeValue(sanitizedFee);
    handleFeeSelection(NetworkTransactionFeeType.CUSTOM);
  };

  return (
    <View>
      {networkFees &&
        [
          {
            label: loc.send.fee_fast,
            time: loc.send.fee_10m,
            type: NetworkTransactionFeeType.FAST,
            rate: networkFees.fastestFee,
            active: selectedFeeType === NetworkTransactionFeeType.FAST,
          },
          {
            label: formatStringAddTwoWhiteSpaces(loc.send.fee_medium),
            time: loc.send.fee_3h,
            type: NetworkTransactionFeeType.MEDIUM,
            rate: networkFees.mediumFee,
            active: selectedFeeType === NetworkTransactionFeeType.MEDIUM,
          },
          {
            label: loc.send.fee_slow,
            time: loc.send.fee_1d,
            type: NetworkTransactionFeeType.SLOW,
            rate: networkFees.slowFee,
            active: selectedFeeType === NetworkTransactionFeeType.SLOW,
          },
        ].map(({ label, type, time, rate, active }) => (
          <TouchableOpacity
            accessibilityRole="button"
            key={label}
            onPress={() => handleFeeSelection(type)}
            style={[styles.button, active && stylesHook.activeButton]}
          >
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonText, stylesHook.buttonText]}>{label}</Text>
              <View style={[styles.timeContainer, stylesHook.timeContainer]}>
                <Text style={stylesHook.timeText}>~{time}</Text>
              </View>
            </View>
            <View style={styles.rateContainer}>
              <Text style={stylesHook.rateText}>{rate} sat/byte</Text>
            </View>
          </TouchableOpacity>
        ))}
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => customTextInput.current?.focus()}
        style={[styles.button, selectedFeeType === NetworkTransactionFeeType.CUSTOM && stylesHook.activeButton]}
      >
        <View style={styles.buttonContent}>
          <Text style={[styles.buttonText, stylesHook.buttonText]}>{formatStringAddTwoWhiteSpaces(loc.send.fee_custom)}</Text>
        </View>
        <View style={[styles.buttonContent, styles.customFeeInputContainer]}>
          <TextInput
            onChangeText={handleCustomFeeChange}
            keyboardType="numeric"
            value={customFeeValue}
            ref={customTextInput}
            maxLength={9}
            style={[styles.customFeeInput, stylesHook.customFeeInput]}
            onFocus={() => handleCustomFeeChange(customFeeValue)}
            placeholder={loc.send.fee_satvbyte}
            placeholderTextColor="#81868e"
            inputAccessoryViewID={DismissKeyboardInputAccessoryViewID}
          />
          <DismissKeyboardInputAccessory />
          <Text style={stylesHook.rateText}>sat/byte</Text>
        </View>
      </TouchableOpacity>
      <BlueText style={stylesHook.alternativeText}>{loc.formatString(loc.send.fee_replace_minvb, { min: transactionMinimum })}</BlueText>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
    borderRadius: 8,
  },
  buttonContent: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '600',
  },
  timeContainer: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  rateContainer: {
    justifyContent: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
  },
  customFeeInputContainer: {
    marginTop: 5,
  },
  customFeeInput: {
    borderBottomWidth: 0.5,
    borderRadius: 4,
    borderWidth: 1.0,
    color: '#81868e',
    flex: 1,
    marginRight: 10,
    minHeight: 33,
    paddingRight: 5,
    paddingLeft: 5,
  },
});

export default ReplaceFeeSuggestions;
