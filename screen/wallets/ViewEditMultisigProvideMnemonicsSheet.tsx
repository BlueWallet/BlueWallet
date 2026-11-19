import React, { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { RouteProp, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import BlueFormLabel from '../../components/BlueFormLabel';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import ImportSeedField from '../../components/ImportSeedField';
import SheetHeader, { useSheetBottomPadding } from '../../components/SheetHeader';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const ViewEditMultisigProvideMnemonicsSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigProvideMnemonicsSheet'>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'ViewEditMultisigProvideMnemonicsSheet'>>();
  const { colors } = useTheme();
  const bottomPadding = useSheetBottomPadding();
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
      <ImportSeedField
        value={importText}
        onChangeText={setImportText}
        onScan={handleImport}
        prompt={loc.multisig.type_your_mnemonics}
        testID="MnemonicInputSheet"
        scanTestID="ScanOrOpenFile"
      >
        <View style={styles.toggleRow}>
          <BlueFormLabel>{loc.wallets.import_passphrase_title}</BlueFormLabel>
          <Switch value={askPassphrase} onValueChange={setAskPassphrase} />
        </View>
        <BlueSpacing20 />
        <Button testID="DoImportKeyButton" title={loc.wallets.import_do_import} onPress={() => handleImport()} />
      </ImportSeedField>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default ViewEditMultisigProvideMnemonicsSheet;
