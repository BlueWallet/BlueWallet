import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BlueFormLabel, BlueFormMultiInput, BlueTextCentered } from '../../BlueComponents';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';
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

  const handleImport = useCallback(
    (text?: string) => {
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
      navigation.dispatch(
        StackActions.popTo(
          'WalletsAddMultisigStep2',
          {
            onBarScanned: { data: text },
          },
          { merge: true },
        ),
      );
    },
    [navigation],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.elevated }]} edges={['bottom', 'left', 'right']}>
      <View style={styles.flex}>
        <BlueTextCentered>{loc.multisig.type_your_mnemonics}</BlueTextCentered>
        <BlueSpacing20 />
        <BlueFormMultiInput
          value={importText}
          onChangeText={setImportText}
          inputAccessoryViewID={DoneAndDismissKeyboardInputAccessoryViewID}
          testID="MnemonicInputSheet"
          style={styles.mnemonicInput}
        />
        {Platform.select({
          ios: (
            <DoneAndDismissKeyboardInputAccessory
              onClearTapped={() => setImportText('')}
              onPasteTapped={text => {
                setImportText(text);
              }}
            />
          ),
          default: null,
        })}
        <BlueSpacing20 />
        <View style={styles.toggleRow}>
          <BlueFormLabel>{loc.wallets.import_passphrase_title}</BlueFormLabel>
          <Switch value={askPassphrase} onValueChange={setAskPassphrase} />
        </View>
        <BlueSpacing20 />
        <Button
          testID="DoImportKeyButton"
          disabled={importText.trim().length === 0}
          title={loc.wallets.import_do_import}
          onPress={() => handleImport()}
        />
        <BlueSpacing20 />
        <AddressInputScanButton
          type="link"
          testID="ScanOrOpenFile"
          onChangeText={text => {
            setImportText(text);
            handleScanResult(text);
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    padding: 22,
  },
  flex: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mnemonicInput: {
    minHeight: 220,
    marginHorizontal: 0,
  },
});

export default WalletsAddMultisigProvideMnemonicsSheet;
