import React, { useCallback, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const ViewEditMultisigProvideMnemonicsSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigProvideMnemonicsSheet'>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'ViewEditMultisigProvideMnemonicsSheet'>>();
  const { colors, closeImage } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
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
            cosigners: [],
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
      // Android form sheets often report insets.bottom as 0. iOS form sheets often report a huge one.
      paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 16 : 16,
    },
    // Bounded so fitToContents can still size the sheet, but the form scrolls once it is taller than the screen
    // (keyboard up, landscape, large text) and Import stays reachable.
    scroll: {
      maxHeight: windowHeight * 0.8,
    },
    headerTitle: {
      color: colors.foregroundColor,
    },
    closeButton: {
      backgroundColor: colors.lightButton,
    },
  });

  return (
    <View style={stylesHook.root}>
      {Platform.OS === 'android' && (
        <View style={styles.androidHeader}>
          <Text style={[styles.headerTitle, stylesHook.headerTitle]} accessibilityRole="header">
            {loc.wallets.import_title}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.close}
            style={[styles.androidCloseButton, stylesHook.closeButton]}
            onPress={() => navigation.goBack()}
            testID="NavigationCloseButton"
          >
            <Image source={closeImage} />
          </TouchableOpacity>
        </View>
      )}
      {/* react-native-screens switches the first-descendant ScrollView of a screen to automatic content insets, and
          the form sheet's huge insets push the form to the bottom. This empty view keeps the ScrollView off that chain. */}
      <View collapsable={false} style={styles.scrollInsetGuard} />
      <ScrollView
        style={[styles.scroll, stylesHook.scroll]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="always"
      >
        <BlueTextCentered>{loc.multisig.type_seed_for_existing_key}</BlueTextCentered>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  androidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  androidCloseButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  scroll: {
    // ScrollView defaults to flexGrow:1, which makes fitToContents full height
    flexGrow: 0,
  },
  scrollInsetGuard: {
    height: 0,
  },
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
});

export default ViewEditMultisigProvideMnemonicsSheet;
