import React, { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BlueFormLabel from '../../components/BlueFormLabel';
import BlueFormMultiInput from '../../components/BlueFormMultiInput';
import BlueTextCentered from '../../components/BlueTextCentered';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';
import { AddressInputScanButton } from '../../components/AddressInputScanButton';
import SheetKeyboardForm from '../../components/SheetKeyboardForm';
import { useKeyboard } from '../../hooks/useKeyboard';
import SheetHeader, { useSheetBottomPadding } from '../../components/SheetHeader';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

const WalletsAddMultisigProvideMnemonicsSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AddWalletStackParamList, 'WalletsAddMultisigProvideMnemonicsSheet'>>();
  const route = useRoute<RouteProp<AddWalletStackParamList, 'WalletsAddMultisigProvideMnemonicsSheet'>>();
  const { colors } = useTheme();
  const bottomPadding = useSheetBottomPadding();
  // On a short phone the 220pt field plus the keyboard leave no room for Import, so the field shrinks while typing
  const { isVisible: isKeyboardVisible } = useKeyboard();
  const { importText: initialImportText = '', askPassphrase: initialAskPassphrase = false } = route.params;

  const [importText, setImportText] = useState(initialImportText);
  const [askPassphrase, setAskPassphrase] = useState(initialAskPassphrase);
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

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      // No flex:1 — fitToContents treats it as full height and the form lands at the bottom of the sheet.
      paddingBottom: bottomPadding,
    },
  });

  return (
    <View style={stylesHook.root}>
      <SheetHeader title={loc.wallets.import_title} onClose={() => navigation.goBack()} />
      <SheetKeyboardForm style={styles.contentContainer}>
        <BlueTextCentered>{loc.multisig.type_seed_or_public_key}</BlueTextCentered>
        <BlueSpacing20 />
        <BlueFormMultiInput
          value={importText}
          onChangeText={setImportText}
          inputAccessoryViewID={DoneAndDismissKeyboardInputAccessoryViewID}
          testID="MnemonicInputSheet"
          style={[styles.mnemonicInput, isKeyboardVisible && styles.mnemonicInputCompact]}
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
      </SheetKeyboardForm>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
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
  mnemonicInputCompact: {
    minHeight: 96,
    maxHeight: 96,
  },
});

export default WalletsAddMultisigProvideMnemonicsSheet;
