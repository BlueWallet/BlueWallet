import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import AmountInput from '../../components/AmountInput';
import Button from '../../components/Button';
import { fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import loc from '../../loc';
import { useTheme } from '../../components/themes';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReceiveStackParamList } from '../../navigation/ReceiveStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { BitcoinUnit } from '../../models/bitcoinUnits';

type NavigationProps = NativeStackNavigationProp<ReceiveStackParamList, 'ReceiveCustomAmount'>;
type RouteProps = RouteProp<ReceiveStackParamList, 'ReceiveCustomAmount'>;

interface LocalState {
  customLabel: string;
  customAmount: string | number;
  customUnit: BitcoinUnit;
}

const ReceiveCustomAmount = () => {
  const navigation = useExtendedNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();

  // Store initial values from route params
  const initialLabel = route.params.customLabel || '';
  const initialAmount = route.params.customAmount ? route.params.customAmount.toString() : '';

  const [state, setState] = useState<LocalState>({
    customLabel: initialLabel,
    customAmount: initialAmount,
    customUnit: route.params.customUnit || BitcoinUnit.BTC,
  });

  const handleUpdateState = (updates: Partial<LocalState>) => {
    setState(current => ({ ...current, ...updates }));
  };

  const handleReset = () => {
    navigation.popTo('ReceiveDetails', {
      address: route.params.address,
      customLabel: undefined,
      customAmount: undefined,
      customUnit: undefined,
      walletID: route.params.walletID,
    });
  };

  const handleSave = () => {
    let btcAmount: number | undefined;
    const numericAmount = Number(state.customAmount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      switch (state.customUnit) {
        case BitcoinUnit.BTC:
          btcAmount = numericAmount;
          break;
        case BitcoinUnit.SATS:
          btcAmount = parseFloat(satoshiToBTC(numericAmount));
          break;
        case BitcoinUnit.LOCAL_CURRENCY:
          btcAmount = parseFloat(fiatToBTC(numericAmount));
          break;
      }
    }

    const bip21Options: { amount?: string; label?: string } = {};
    if (btcAmount && btcAmount > 0) {
      bip21Options.amount = btcAmount.toString();
    }
    if (state.customLabel) {
      bip21Options.label = state.customLabel;
    }

    const bip21encoded = DeeplinkSchemaMatch.bip21encode(route.params.address, bip21Options);

    navigation.popTo('ReceiveDetails', {
      address: route.params.address,
      customLabel: state.customLabel,
      customAmount: numericAmount,
      customUnit: state.customUnit,
      bip21encoded,
      walletID: route.params.walletID,
    });
  };

  // Disable create button if both inputs are empty or if both match the initial values
  const isCreateDisabled =
    (!state.customLabel.trim() && !state.customAmount.toString().trim()) ||
    (state.customLabel === initialLabel && state.customAmount.toString() === initialAmount);

  return (
    <View style={{ backgroundColor: colors.elevated }}>
      <View>
        <View style={styles.contentContainer}>
          <AmountInput
            unit={state.customUnit}
            amount={state.customAmount ? Number(state.customAmount) : undefined}
            onChangeText={(value: string | number) => handleUpdateState({ customAmount: value })}
            onAmountUnitChange={(unit: BitcoinUnit) => handleUpdateState({ customUnit: unit })}
          />
          <TextInput
            onChangeText={(text: string) => handleUpdateState({ customLabel: text })}
            placeholderTextColor="#81868e"
            placeholder={loc.receive.details_label}
            value={state.customLabel}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackgroundColor,
                borderColor: colors.formBorder,
                color: colors.foregroundColor,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <Button title={loc.receive.reset} onPress={handleReset} />
        <View style={styles.buttonSpacing} />
        <Button title={loc.receive.details_create} onPress={handleSave} disabled={isCreateDisabled} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: 22,
  },
  input: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    height: 44,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 22,
    paddingBottom: Platform.select({ ios: 44, android: 22 }),
  },
  buttonSpacing: {
    width: 16,
  },
});

export default ReceiveCustomAmount;
