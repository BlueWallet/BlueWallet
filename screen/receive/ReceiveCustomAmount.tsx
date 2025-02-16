import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { CommonActions, RouteProp, StackActions, useRoute } from '@react-navigation/native';
import AmountInput from '../../components/AmountInput';
import Button from '../../components/Button';
import { BlueSpacing20 } from '../../BlueComponents';
import { fiatToBTC, satoshiToBTC } from '../../blue_modules/currency';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import loc from '../../loc';
import { useTheme } from '../../components/themes';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReceiveStackParamList } from '../../navigation/ReceiveStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { address } from 'bitcoinjs-lib';
import { BitcoinUnit } from '../../models/bitcoinUnits';

type NavigationProps = NativeStackNavigationProp<ReceiveStackParamList, 'ReceiveDetails'>;
type RouteProps = RouteProp<ReceiveStackParamList, 'ReceiveDetails'>;

const ReceiveCustomAmount = () => {
  const navigation = useExtendedNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { colors } = useTheme();
  // Local state for custom amount settings
  const [tempCustomLabel, setTempCustomLabel] = useState<string | undefined>();
  const [tempCustomAmount, setTempCustomAmount] = useState<number | undefined>();
  const [tempCustomUnit, setTempCustomUnit] = useState<BitcoinUnit>(BitcoinUnit.BTC);

  const handleReset = () => {
    navigation.popTo('ReceiveDetails', {
      address: route.params.address,
      customLabel: undefined,
      customAmount: undefined,
      customUnit: undefined,
      bip21encoded: undefined,
    });
  };

  const handleSave = () => {
    // Conversion similar to previous logic
    let amount = tempCustomAmount;
    switch (tempCustomUnit) {
      case BitcoinUnit.BTC:
        break;
      case BitcoinUnit.SATS:
        amount = satoshiToBTC(Number(tempCustomAmount));
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        amount = fiatToBTC(Number(tempCustomAmount));
        break;
    }
    // For example, assume we pass back custom amount data to ReceiveDetails via navigation params.
    // Also, update the bip21encoded address via DeeplinkSchemaMatch as needed. (Assumes route.params.address exists.)
    const newBip21encoded = DeeplinkSchemaMatch.bip21encode(route.params.address, { amount, label: tempCustomLabel });
    const popToAction = StackActions.popTo('ReceiveDetails', {
      customLabel: tempCustomLabel,
      customAmount: tempCustomAmount,
      customUnit: tempCustomUnit,
      bip21encoded: newBip21encoded,
    });
    navigation.dispatch(popToAction);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.elevated }]}>
      <AmountInput
        unit={tempCustomUnit}
        amount={tempCustomAmount}
        onChangeText={setTempCustomAmount}
        onAmountUnitChange={setTempCustomUnit}
      />
      <View style={[styles.inputContainer, { backgroundColor: colors.inputBackgroundColor, borderColor: colors.formBorder }]}>
        <TextInput
          onChangeText={setTempCustomLabel}
          placeholderTextColor="#81868e"
          placeholder={loc.receive.details_label}
          value={tempCustomLabel}
          style={{ color: colors.foregroundColor }}
        />
      </View>
      <BlueSpacing20 />
      <View style={styles.buttonContainer}>
        <Button title={loc.receive.reset} onPress={handleReset} />
        <View style={styles.buttonSpacing} />
        <Button title={loc.receive.details_create} onPress={handleSave} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    justifyContent: 'center',
    alignContent: 'center',
  },
  inputContainer: {
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
    marginTop: 20,
  },
  buttonSpacing: {
    width: 16,
  },
});

export default ReceiveCustomAmount;
