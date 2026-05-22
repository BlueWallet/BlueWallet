import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import { ReceiveDetailsStackParamList } from '../../navigation/ReceiveDetailsStackParamList';

const ReceiveAddressLabelSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ReceiveDetailsStackParamList, 'ReceiveAddressLabel'>>();
  const route = useRoute<RouteProp<ReceiveDetailsStackParamList, 'ReceiveAddressLabel'>>();
  const { addressMetadata, saveToDisk } = useStorage();
  const { colors } = useTheme();
  const { address } = route.params;
  const [label, setLabel] = useState(addressMetadata[address]?.label ?? '');

  const stylesHook = useMemo(
    () => ({
      input: {
        borderColor: colors.formBorder,
        borderBottomColor: colors.formBorder,
        backgroundColor: colors.inputBackgroundColor,
      },
      inputText: {
        color: colors.foregroundColor,
      },
    }),
    [colors],
  );

  // Saving an empty label clears it; callers rehydrate on focus.
  const handleSave = useCallback(async () => {
    const trimmed = label.trim();
    if (trimmed !== (addressMetadata[address]?.label ?? '')) {
      if (trimmed) {
        addressMetadata[address] = { label: trimmed };
      } else {
        delete addressMetadata[address];
      }
      await saveToDisk();
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    }
    navigation.goBack();
  }, [label, address, addressMetadata, saveToDisk, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={[styles.input, stylesHook.input]}>
        <TextInput
          onChangeText={setLabel}
          placeholder={loc.transactions.address_label_placeholder}
          placeholderTextColor={colors.placeholderTextColor}
          value={label}
          maxLength={100}
          numberOfLines={1}
          style={[styles.inputText, stylesHook.inputText]}
          testID="AddressLabelInput"
        />
      </View>
      <BlueSpacing20 />
      <View style={styles.buttonContainer}>
        <Button testID="AddressLabelSaveButton" title={loc.receive.details_save} onPress={handleSave} />
      </View>
    </SafeAreaView>
  );
};

export default ReceiveAddressLabelSheet;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  input: {
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
  inputText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    fontSize: 15,
    lineHeight: 19,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
});
