import React, { useCallback, useMemo } from 'react';
import { Image, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';

import { scanQrHelper } from '../helpers/scan-qr';
import loc from '../loc';
import presentAlert from './Alert';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from './themes';
import { useSettings } from '../hooks/context/useSettings';
import DeeplinkSchemaMatch from '../class/deeplink-schema-match';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { showFilePickerAndReadFile, showImagePickerAndReadImage } from '../blue_modules/fs';

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
  const { isClipboardGetContentEnabled } = useSettings();
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
    const validateAddressWithFeedback = (value: string) => {
      const isValid = DeeplinkSchemaMatch.isBitcoinAddress(value) || DeeplinkSchemaMatch.isLightningInvoice(value);

      triggerHapticFeedback(isValid ? HapticFeedbackTypes.NotificationSuccess : HapticFeedbackTypes.NotificationError);
      return isValid;
    };

    validateAddressWithFeedback(address);
    onBlur();
    Keyboard.dismiss();
  };

  const actions = useMemo(() => {
    const availableActions = [
      CommonToolTipActions.ScanQR,
      CommonToolTipActions.ChoosePhoto,
      CommonToolTipActions.ImportFile,
      {
        ...CommonToolTipActions.CopyFromClipboard,
        hidden: !isClipboardGetContentEnabled,
      },
    ];

    return availableActions;
  }, [isClipboardGetContentEnabled]);

  const toolTipOnPress = useCallback(async () => {
    await scanButtonTapped();
    Keyboard.dismiss();
    if (launchedBy) scanQrHelper(launchedBy, true).then(value => onBarScanned({ data: value }));
  }, [launchedBy, onBarScanned, scanButtonTapped]);

  const onMenuItemPressed = useCallback(
    (action: string) => {
      if (onBarScanned === undefined) throw new Error('onBarScanned is required');
      switch (action) {
        case CommonToolTipActions.ScanQR.id:
          scanButtonTapped();
          if (launchedBy) {
            scanQrHelper(launchedBy)
              .then(value => onBarScanned({ data: value }))
              .catch(error => {
                presentAlert({ message: error.message });
              });
          }

          break;
        case CommonToolTipActions.CopyFromClipboard.id:
          Clipboard.getString()
            .then(onChangeText)
            .catch(error => {
              presentAlert({ message: error.message });
            });
          break;
        case CommonToolTipActions.ChoosePhoto.id:
          showImagePickerAndReadImage()
            .then(value => {
              if (value) {
                onChangeText(value);
              }
            })
            .catch(error => {
              presentAlert({ message: error.message });
            });
          break;
        case CommonToolTipActions.ImportFile.id:
          showFilePickerAndReadFile()
            .then(value => {
              if (value.data) {
                onChangeText(value.data);
              }
            })
            .catch(error => {
              presentAlert({ message: error.message });
            });
          break;
      }
      Keyboard.dismiss();
    },
    [launchedBy, onBarScanned, onChangeText, scanButtonTapped],
  );

  const buttonStyle = useMemo(() => [styles.scan, stylesHook.scan], [stylesHook.scan]);

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
    </View>
  );
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
