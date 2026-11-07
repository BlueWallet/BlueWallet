import React, { useCallback, useState } from 'react';
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
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const ViewEditMultisigProvideMnemonicsSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigProvideMnemonicsSheet'>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'ViewEditMultisigProvideMnemonicsSheet'>>();
  const { colors } = useTheme();
  const bottomPadding = useSheetBottomPadding();
  // On a short phone the 220pt field plus the keyboard leave no room for Import, so the field shrinks while typing
  const { isVisible: isKeyboardVisible } = useKeyboard();
  const {
    importText: initialImportText = '',
    askPassphrase: initialAskPassphrase = false,
    walletID,
    currentlyEditingCosignerNum,
  } = route.params;

  const [importText, setImportText] = useState(initialImportText);
  const [askPassphrase, setAskPassphrase] = useState(initialAskPassphrase);

  const handleImport = useCallback(
    (text?: string) => {
      const textToUse = (text ?? importText).trim();
      if (!textToUse) return;
      navigation.dispatch(
        StackActions.popTo(
          'ViewEditMultisigCosigners',
          {
            walletID,
            sheetAction: 'importMnemonic',
            sheetImportText: textToUse,
            sheetAskPassphrase: askPassphrase,
            sheetCurrentlyEditingCosignerNum: currentlyEditingCosignerNum,
          },
          { merge: true },
        ),
      );
    },
    [askPassphrase, importText, navigation, walletID, currentlyEditingCosignerNum],
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
        <BlueTextCentered>{loc.multisig.type_your_mnemonics}</BlueTextCentered>
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
            handleImport(text);
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

export default ViewEditMultisigProvideMnemonicsSheet;
