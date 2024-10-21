// components/AddressInput.tsx

import React from 'react';
import { Image, Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { scanQrHelper } from '../helpers/scan-qr';
import loc from '../loc';
import { useTheme } from './themes';
import { showFilePickerAndReadFile, showImagePickerAndReadImage } from '../blue_modules/fs';
import Clipboard from '@react-native-clipboard/clipboard';
import presentAlert from './Alert';
import ToolTipMenu from './TooltipMenu';
import AddressOwnershipButton from './AddressOwnershipButton'; // Import the OwnershipButton component
import { TWallet } from '../class/wallets/types'; // Ensure correct path

interface AddressInputProps {
  isLoading?: boolean;
  address: string;
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
  showOwnership?: boolean; // New prop to control ownership validation/UI
  wallets?: TWallet[]; // Pass the list of wallets to AddressOwnershipButton
}

const AddressInput: React.FC<AddressInputProps> = ({
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
  showOwnership = false, // Default to false
  wallets = [], // Default to empty array
}) => {
  const { colors } = useTheme();
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

  /**
   * Handles the blur event for the TextInput.
   */
  const handleBlur = () => {
    onBlur();
    Keyboard.dismiss();
    // Ownership handling is managed by AddressOwnershipButton
  };

  /**
   * Handles the press event for the tooltip menu.
   */
  const toolTipOnPress = async () => {
    await scanButtonTapped();
    Keyboard.dismiss();
    if (launchedBy) {
      const value = await scanQrHelper(launchedBy, true);
      onBarScanned({ data: value });
    }
  };

  /**
   * Handles the selection of a menu item from the tooltip menu.
   *
   * @param {string} action - The action identifier.
   */
  const onMenuItemPressed = async (action: string) => {
    if (onBarScanned === undefined) throw new Error('onBarScanned is required');
    switch (action) {
      case actionKeys.ScanQR:
        scanButtonTapped();
        if (launchedBy) {
          try {
            const value = await scanQrHelper(launchedBy);
            onBarScanned({ data: value });
          } catch (error: any) {
            presentAlert({ message: error.message });
          }
        }
        break;
      case actionKeys.CopyFromClipboard:
        try {
          const clipboardContent = await Clipboard.getString();
          onChangeText(clipboardContent);
        } catch (error: any) {
          presentAlert({ message: error.message });
        }
        break;
      case actionKeys.ChoosePhoto:
        try {
          const image = await showImagePickerAndReadImage();
          if (image) {
            onChangeText(image);
          }
        } catch (error: any) {
          presentAlert({ message: error.message });
        }
        break;
      case actionKeys.ImportFile:
        try {
          const file = await showFilePickerAndReadFile();
          if (file.data) {
            onChangeText(file.data);
          }
        } catch (error: any) {
          presentAlert({ message: error.message });
        }
        break;
      default:
        break;
    }
    Keyboard.dismiss();
  };

  /**
   * Determines the style for the scan button.
   */
  const buttonStyle = React.useMemo(() => [styles.scan, stylesHook.scan], [stylesHook.scan]);

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
        onBlur={handleBlur}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
      />
      {editable ? (
        <ToolTipMenu
          actions={actions}
          isButton
          onPressMenuItem={onMenuItemPressed}
          testID="BlueAddressInputScanQrButton"
          disabled={isLoading}
          onPress={toolTipOnPress}
          buttonStyle={buttonStyle}
          accessibilityLabel={loc.send.details_scan}
          accessibilityHint={loc.send.details_scan_hint}
        >
          <Image source={require('../img/scan-white.png')} accessible={false} />
          <Text style={[styles.scanText, stylesHook.scanText]} accessible={false}>
            {loc.send.details_scan}
          </Text>
        </ToolTipMenu>
      ) : null}
      {/* Conditionally render the OwnershipButton */}
      {showOwnership && wallets.length > 0 && (
        <AddressOwnershipButton address={address} wallets={wallets} style={styles.ownershipButton} />
      )}
    </View>
  );
};

export default AddressInput;

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
    paddingRight: 8, // Added padding to accommodate the OwnershipButton
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
  ownershipButton: {
    // Minimal styling to align with the existing layout
    marginLeft: 8,
    width: 'auto',
  },
});

const actionKeys = {
  ScanQR: 'scan_qr',
  CopyFromClipboard: 'copy_from_clipboard',
  ChoosePhoto: 'choose_photo',
  ImportFile: 'import_file',
};

const actionIcons = {
  ScanQR: {
    iconValue: Platform.OS === 'ios' ? 'qrcode' : 'camera',
  },
  ImportFile: {
    iconValue: 'document',
  },
  ChoosePhoto: {
    iconValue: Platform.OS === 'ios' ? 'image' : 'image',
  },
  Clipboard: {
    iconValue: Platform.OS === 'ios' ? 'clipboard' : 'document-text',
  },
};

const actions = [
  {
    id: actionKeys.ScanQR,
    text: loc.wallets.list_long_scan,
    icon: actionIcons.ScanQR,
  },
  {
    id: actionKeys.CopyFromClipboard,
    text: loc.wallets.list_long_clipboard,
    icon: actionIcons.Clipboard,
  },
  {
    id: actionKeys.ChoosePhoto,
    text: loc.wallets.list_long_choose,
    icon: actionIcons.ChoosePhoto,
  },
  {
    id: actionKeys.ImportFile,
    text: loc.wallets.import_file,
    icon: actionIcons.ImportFile,
  },
];