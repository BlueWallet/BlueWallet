import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BlueFormLabel from '../../components/BlueFormLabel';
import BlueFormMultiInput from '../../components/BlueFormMultiInput';
import BlueTextCentered from '../../components/BlueTextCentered';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import KeyboardAccessoryClearPasteDone from '../../components/KeyboardAccessoryClearPasteDone';
import KeyboardAccessoryDock from '../../components/KeyboardAccessoryDock';
import { AddressInputScanButton } from '../../components/AddressInputScanButton';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

const WalletsAddMultisigProvideMnemonicsSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AddWalletStackParamList, 'WalletsAddMultisigProvideMnemonicsSheet'>>();
  const route = useRoute<RouteProp<AddWalletStackParamList, 'WalletsAddMultisigProvideMnemonicsSheet'>>();
  const { colors } = useTheme();
  const { importText: initialImportText = '', askPassphrase: initialAskPassphrase = false } = route.params;

  const [importText, setImportText] = useState(initialImportText);
  const [askPassphrase, setAskPassphrase] = useState(initialAskPassphrase);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleImport = useCallback(
    (text?: string) => {
      clearTimeout(scanTimeoutRef.current);
      const textToUse = (text ?? importText).trim();
      if (!textToUse) return;
      navigation.dispatch(
        StackActions.popTo(
          'WalletsAddMultisigStep2',
          {
            sheetAction: 'importMnemonic',
            sheetImportText: textToUse,
            sheetAskPassphrase: askPassphrase,
          },
          { merge: true },
        ),
      );
    },
    [askPassphrase, importText, navigation],
  );

  const handleScanResult = useCallback(
    (text: string) => {
      // Delay navigation to let the ScanQRCode → Sheet transition animation finish.
      // On Android, two rapid popTo actions cause react-native-screens to get stuck
      // when the first Fragment transition hasn't completed.
      scanTimeoutRef.current = setTimeout(() => {
        navigation.dispatch(
          StackActions.popTo(
            'WalletsAddMultisigStep2',
            {
              onBarScanned: { data: text },
            },
            { merge: true },
          ),
        );
      }, 500);
    },
    [navigation],
  );

  const keyboardAccessory = <KeyboardAccessoryClearPasteDone onClearTapped={() => setImportText('')} onPasteTapped={setImportText} />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.elevated }]} edges={['bottom', 'left', 'right']}>
      <KeyboardAccessoryDock active={isInputFocused} accessory={keyboardAccessory}>
        <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="always">
          <BlueTextCentered>{loc.multisig.type_your_mnemonics}</BlueTextCentered>
          <BlueSpacing20 />
          <BlueFormMultiInput
            value={importText}
            onChangeText={setImportText}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            testID="MnemonicInputSheet"
            style={styles.mnemonicInput}
          />
          <BlueSpacing20 />
          <View style={styles.toggleRow}>
            <BlueFormLabel>{loc.wallets.import_passphrase_title}</BlueFormLabel>
            <Switch value={askPassphrase} onValueChange={setAskPassphrase} />
          </View>
          <BlueSpacing20 />
          <Button testID="DoImportKeyButton" title={loc.wallets.import_do_import} onPress={() => handleImport()} />
          <BlueSpacing20 />
          <AddressInputScanButton
            type="link"
            testID="ScanOrOpenFile"
            onChangeText={text => {
              setImportText(text);
              handleScanResult(text);
            }}
          />
        </ScrollView>
      </KeyboardAccessoryDock>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mnemonicInput: {
    minHeight: 220,
    maxHeight: 220,
    flex: 0,
    marginHorizontal: 0,
  },
});

export default WalletsAddMultisigProvideMnemonicsSheet;
