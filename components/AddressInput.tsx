import React, { useEffect, useState } from 'react';
import { Image, Keyboard, Text, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import loc from '../loc';
import { isCameraAuthorizationStatusGranted, scanQrHelper } from '../helpers/scan-qr';
import { useTheme } from './themes';
import { useNavigation } from '@react-navigation/native';
import ToolTipMenu from './TooltipMenu';
import Clipboard from '@react-native-clipboard/clipboard';
import presentAlert from './Alert';
import { launchImageLibrary } from 'react-native-image-picker';
import { openPrivacyDesktopSettings } from '../class/camera';
const fs = require('../blue_modules/fs');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

interface AddressInputProps {
  isLoading?: boolean;
  address?: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  onBarScanned: (ret: { data?: any }) => void;
  scanButtonTapped?: () => void;
  launchedBy?: string;
  editable?: boolean;
  inputAccessoryViewID?: string;
  onBlur?: () => void;
  keyboardType?:
    | 'default'
    | 'numeric'
    | 'email-address'
    | 'ascii-capable'
    | 'numbers-and-punctuation'
    | 'url'
    | 'number-pad'
    | 'phone-pad'
    | 'name-phone-pad'
    | 'decimal-pad'
    | 'twitter'
    | 'web-search'
    | 'visible-password';
}

const AddressInput = ({
  isLoading = false,
  address = '',
  placeholder = loc.send.details_address,
  onChangeText,
  onBarScanned,
  scanButtonTapped = () => {},
  launchedBy,
  editable = true,
  inputAccessoryViewID,
  onBlur = () => {},
  keyboardType = 'default',
}: AddressInputProps) => {
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const [isCameraAuthStatusGranted, setIsCameraAuthStatusGranted] = useState(true);
  const stylesHook = StyleSheet.create({
    root: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    scan: {
      backgroundColor: colors.scanLabel,
    },
    scanText: {
      color: colors.inverseForegroundColor,
    },
  });

  const onBlurEditing = () => {
    onBlur();
    Keyboard.dismiss();
  };

  useEffect(() => {
    isCameraAuthorizationStatusGranted().then(setIsCameraAuthStatusGranted);
  }, []);

  const onScanButtonPressed = async (id: any) => {
    if (isCameraAuthStatusGranted) {
      await scanButtonTapped();
      Keyboard.dismiss();
      // @ts-ignore: Fix later
      scanQrHelper(navigate, launchedBy).then(onBarScanned);
    } else {
      switch (id) {
        case AddressInput.actionKeys.OpenImagePicker:
          launchImageLibrary(
            {
              mediaType: 'photo',
              maxHeight: 800,
              maxWidth: 600,
              selectionLimit: 1,
            },
            response => {
              if (!response.didCancel && response.assets && response.assets?.length > 0) {
                const asset = response.assets[0];
                if (asset.uri) {
                  const uri = asset.uri.toString().replace('file://', '');
                  LocalQRCode.decode(uri, (error: any, result: any) => {
                    if (!error) {
                      onChangeText(result);
                    } else {
                      presentAlert({ message: loc.send.qr_error_no_qrcode });
                    }
                  });
                }
              }
            },
          );

          break;
        case AddressInput.actionKeys.ImportFile:
          fs.showFilePickerAndReadFile((data: any) => {
            if (data) onChangeText(data);
          });
          break;
        case AddressInput.actionKeys.CopyFromClipboard:
          Clipboard.getString().then(clipboardValue => {
            console.warn(clipboardValue);
            if (clipboardValue) {
              onChangeText(clipboardValue);
            }
          });
          break;
        case AddressInput.actionKeys.OpenSystemSettings:
          openPrivacyDesktopSettings();
          break;
      }
    }
  };

  const scanButton = (
    <TouchableOpacity
      testID="BlueAddressInputScanQrButton"
      disabled={isLoading}
      onPress={onScanButtonPressed}
      accessibilityRole="button"
      style={[styles.scan, stylesHook.scan]}
      accessibilityLabel={loc.send.details_scan}
      accessibilityHint={loc.send.details_scan_hint}
    >
      <Image source={require('../img/scan-white.png')} accessible={false} />
      <Text style={[styles.scanText, stylesHook.scanText]} accessible={false}>
        {loc.send.details_scan}
      </Text>
    </TouchableOpacity>
  );

  const toolTipActions = [
    {
      id: AddressInput.actionKeys.OpenImagePicker,
      icon: AddressInput.actionIcons.OpenImagePicker,
      text: loc.wallets.list_long_choose,
    },
    {
      id: AddressInput.actionKeys.ImportFile,
      icon: AddressInput.actionIcons.ImportFile,
      text: loc.send.import_file,
    },
    {
      id: AddressInput.actionKeys.CopyFromClipboard,
      icon: AddressInput.actionIcons.CopyFromClipoard,
      text: loc.wallets.list_long_clipboard,
    },
    [
      {
        id: AddressInput.actionKeys.OpenSystemSettings,
        text: loc.settings.privacy_system_settings,
      },
    ],
  ];

  return (
    <View style={[styles.root, stylesHook.root]}>
      <TextInput
        testID="AddressInput"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#81868e"
        value={address}
        style={styles.input}
        editable={!isLoading && editable}
        multiline={!editable}
        inputAccessoryViewID={inputAccessoryViewID}
        clearButtonMode="while-editing"
        onBlur={onBlurEditing}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
      />
      {editable ? (
        isCameraAuthStatusGranted ? (
          scanButton
        ) : (
          <ToolTipMenu isButton isMenuPrimaryAction onPressMenuItem={onScanButtonPressed} actions={toolTipActions}>
            {scanButton}
          </ToolTipMenu>
        )
      ) : null}
    </View>
  );
};

AddressInput.actionKeys = {
  OpenImagePicker: 'OpenImagePicker',
  ImportFile: 'ImportFile',
  CopyFromClipboard: 'CopyFromClipboard',
  OpenSystemSettings: 'OpenSystemSettings',
};

AddressInput.actionIcons = {
  OpenImagePicker: { iconType: 'SYSTEM', iconValue: 'photo.on.rectangle.angled' },
  ImportFile: { iconType: 'SYSTEM', iconValue: 'square.and.arrow.down' },
  CopyFromClipoard: { iconType: 'SYSTEM', iconValue: 'doc.on.clipboard' },
  RemoveRecipient: 'OpenSystemSettings',
};

const styles = StyleSheet.create({
  root: {
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
  input: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: '#81868e',
  },
  scan: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  scanText: {
    marginLeft: 4,
  },
});

export default AddressInput;
