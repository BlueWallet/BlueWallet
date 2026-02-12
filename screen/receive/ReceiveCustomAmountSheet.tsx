import React, { useCallback, useMemo, useRef, useState } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import * as AmountInput from '../../components/AmountInput';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { satoshiToBTC, fiatToBTC } from '../../blue_modules/currency';
import { ReceiveDetailsStackParamList } from '../../navigation/ReceiveDetailsStackParamList';

const ReceiveCustomAmountSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ReceiveDetailsStackParamList, 'ReceiveCustomAmount'>>();
  const route = useRoute<RouteProp<ReceiveDetailsStackParamList, 'ReceiveCustomAmount'>>();
  const { colors } = useTheme();

  const { address, currentLabel = '', currentAmount = '', currentUnit = BitcoinUnit.BTC, preferredUnit = BitcoinUnit.BTC } = route.params;

  const [label, setLabel] = useState(currentLabel);
  const [amount, setAmount] = useState(currentAmount);
  const [unit, setUnit] = useState<BitcoinUnit>(currentUnit);
  const latestLabel = useRef(currentLabel);

  const stylesHook = useMemo(
    () => ({
      customAmount: {
        borderColor: colors.formBorder,
        borderBottomColor: colors.formBorder,
        backgroundColor: colors.inputBackgroundColor,
      },
      customAmountText: {
        color: colors.foregroundColor,
      },
      modalButton: {
        backgroundColor: colors.modalButton,
      },
    }),
    [colors],
  );

  const computeBip21 = useCallback(
    (nextAmount: string, nextUnit: BitcoinUnit, nextLabel: string): string => {
      const trimmedAmount = nextAmount.trim();
      if (trimmedAmount.length === 0) {
        return nextLabel ? DeeplinkSchemaMatch.bip21encode(address, { label: nextLabel }) : DeeplinkSchemaMatch.bip21encode(address);
      }

      let normalizedAmount: string | number = trimmedAmount;
      const numericAmount = Number(trimmedAmount);

      switch (nextUnit) {
        case BitcoinUnit.BTC:
          break;
        case BitcoinUnit.SATS:
          normalizedAmount = satoshiToBTC(numericAmount);
          break;
        case BitcoinUnit.LOCAL_CURRENCY:
          if (AmountInput.conversionCache[trimmedAmount + BitcoinUnit.LOCAL_CURRENCY]) {
            normalizedAmount = satoshiToBTC(Number(AmountInput.conversionCache[trimmedAmount + BitcoinUnit.LOCAL_CURRENCY]));
          } else {
            normalizedAmount = fiatToBTC(numericAmount);
          }
          break;
        default:
          break;
      }

      const options: { [key: string]: string } = {
        amount: String(normalizedAmount),
      };

      if (nextLabel) {
        options.label = nextLabel;
      }

      return DeeplinkSchemaMatch.bip21encode(address, options);
    },
    [address],
  );

  const handleLabelChange = useCallback((value: string) => {
    latestLabel.current = value;
    setLabel(value);
  }, []);

  const handleLabelEndEditing = useCallback((event: { nativeEvent: { text: string } }) => {
    latestLabel.current = event.nativeEvent.text ?? '';
  }, []);

  const handleSave = useCallback(() => {
    const resolvedLabel = latestLabel.current ?? label;
    const encoded = computeBip21(amount, unit, resolvedLabel);
    navigation.popTo(
      'ReceiveDetails',
      {
        customLabel: resolvedLabel,
        customAmount: amount,
        customUnit: unit,
        bip21encoded: encoded,
        isCustom: true,
      },
      { merge: true },
    );
  }, [amount, unit, label, computeBip21, navigation]);

  const handleReset = useCallback(() => {
    const fallbackUnit = preferredUnit || BitcoinUnit.BTC;
    const encoded = DeeplinkSchemaMatch.bip21encode(address);
    navigation.popTo(
      'ReceiveDetails',
      {
        customLabel: '',
        customAmount: '',
        customUnit: fallbackUnit,
        bip21encoded: encoded,
        isCustom: false,
      },
      { merge: true },
    );
  }, [address, navigation, preferredUnit]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.flex}>
        <AmountInput.AmountInput unit={unit} amount={amount || ''} onChangeText={setAmount} onAmountUnitChange={setUnit} />
        <View style={[styles.customAmount, stylesHook.customAmount]}>
          <TextInput
            onChangeText={handleLabelChange}
            placeholderTextColor="#81868e"
            placeholder={loc.receive.details_label}
            value={label || ''}
            numberOfLines={1}
            onEndEditing={handleLabelEndEditing}
            style={[styles.customAmountText, stylesHook.customAmountText]}
            testID="CustomAmountDescription"
          />
        </View>
        <BlueSpacing20 />
        <BlueSpacing20 />
        <View style={styles.modalButtonContainer}>
          <Button
            testID="CustomAmountResetButton"
            style={[styles.modalButton, stylesHook.modalButton]}
            title={loc.receive.reset}
            onPress={handleReset}
          />
          <View style={styles.modalButtonSpacing} />
          <Button
            testID="CustomAmountSaveButton"
            style={[styles.modalButton, stylesHook.modalButton]}
            title={loc.receive.details_create}
            onPress={handleSave}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ReceiveCustomAmountSheet;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  customAmount: {
    flexDirection: 'row',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  modalButton: {
    paddingVertical: 14,
    minWidth: 100,
    paddingHorizontal: 16,
    borderRadius: 50,
    fontWeight: '700',
    flex: 0.5,
    alignItems: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    width: '100%',
  },
  modalButtonSpacing: {
    width: 16,
  },
  customAmountText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
  },
});
