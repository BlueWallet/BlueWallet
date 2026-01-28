import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
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
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const ViewEditMultisigProvideMnemonicsSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigProvideMnemonicsSheet'>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'ViewEditMultisigProvideMnemonicsSheet'>>();
  const { colors } = useTheme();
  const { importText: initialImportText = '', askPassphrase: initialAskPassphrase = false, walletID } = route.params;

  const [importText, setImportText] = useState(initialImportText);
  const [askPassphrase, setAskPassphrase] = useState(initialAskPassphrase);

  const handleImport = useCallback(
    (text?: string) => {
      const textToUse = (text ?? importText).trim();
      if (!textToUse) return;
      navigation.navigate(
        'ViewEditMultisigCosigners',
        {
          walletID,
          cosigners: [],
          sheetAction: 'importMnemonic',
          sheetImportText: textToUse,
          sheetAskPassphrase: askPassphrase,
        },
        { merge: true },
      );
      navigation.goBack();
    },
    [askPassphrase, importText, navigation, walletID],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.elevated }]} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
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
        <Button disabled={importText.trim().length === 0} title={loc.wallets.import_do_import} onPress={() => handleImport()} />
        <BlueSpacing20 />
        <AddressInputScanButton
          type="link"
          onChangeText={text => {
            setImportText(text);
            handleImport(text);
          }}
        />
      </KeyboardAvoidingView>
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
  },
});

export default ViewEditMultisigProvideMnemonicsSheet;
