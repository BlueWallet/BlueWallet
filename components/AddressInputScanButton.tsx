import React, { useCallback, useMemo } from 'react';
import { Image, Keyboard, Platform, StyleSheet, Text } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import ToolTipMenu from './TooltipMenu';
import loc from '../loc';
import { showFilePickerAndReadFile, showImagePickerAndReadImage } from '../blue_modules/fs';
import presentAlert from './Alert';
import { useTheme } from './themes';
import RNQRGenerator from 'rn-qr-generator';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { useSettings } from '../hooks/context/useSettings';
import { scanQrHelper } from '../helpers/scan-qr.ts';

interface AddressInputScanButtonProps {
  isLoading?: boolean;
  onChangeText: (text: string) => void;
  type?: 'default' | 'link';
  testID?: string;
  beforePress?: () => Promise<void> | void;
}

export const AddressInputScanButton = ({
  isLoading,
  onChangeText,
  type = 'default',
  testID = 'BlueAddressInputScanQrButton',
  beforePress,
}: AddressInputScanButtonProps) => {
  const { colors } = useTheme();
  const { isClipboardGetContentEnabled } = useSettings();

  const stylesHook = StyleSheet.create({
    scan: {
      backgroundColor: colors.scanLabel,
    },
    scanText: {
      color: colors.inverseForegroundColor,
    },
  });

  const toolTipOnPress = useCallback(async () => {
    if (beforePress) {
      await beforePress();
    }
    Keyboard.dismiss();
    scanQrHelper().then(onChangeText);
  }, [beforePress, onChangeText]);

  const actions = useMemo(() => {
    const availableActions = [
      CommonToolTipActions.ChoosePhoto,
      CommonToolTipActions.ImportFile,
      {
        ...CommonToolTipActions.PasteFromClipboard,
        hidden: !isClipboardGetContentEnabled,
      },
    ];

    return availableActions;
  }, [isClipboardGetContentEnabled]);

  const onMenuItemPressed = useCallback(
    async (action: string) => {
      switch (action) {
        case CommonToolTipActions.PasteFromClipboard.id:
          try {
            let getImage: string | null = null;
            let hasImage = false;
            if (Platform.OS === 'android') {
              hasImage = true;
            } else {
              hasImage = await Clipboard.hasImage();
            }

            if (hasImage) {
              getImage = await Clipboard.getImage();
            }

            if (getImage) {
              try {
                const base64Data = getImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                const values = await RNQRGenerator.detect({
                  base64: base64Data,
                });

                if (values && values.values.length > 0) {
                  onChangeText(values.values[0]);
                } else {
                  presentAlert({ message: loc.send.qr_error_no_qrcode });
                }
              } catch (error) {
                presentAlert({ message: (error as Error).message });
              }
            } else {
              const clipboardText = await Clipboard.getString();
              onChangeText(clipboardText);
            }
          } catch (error) {
            presentAlert({ message: (error as Error).message });
          }
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
    [onChangeText],
  );

  const buttonStyle = useMemo(() => [styles.scan, stylesHook.scan], [stylesHook.scan]);

  return (
    <ToolTipMenu
      actions={actions}
      isButton
      onPressMenuItem={onMenuItemPressed}
      testID={testID}
      disabled={isLoading}
      onPress={toolTipOnPress}
      buttonStyle={type === 'default' ? buttonStyle : undefined}
      accessibilityLabel={loc.send.details_scan}
      accessibilityHint={loc.send.details_scan_hint}
    >
      {type === 'default' ? (
        <>
          <Image source={require('../img/scan-white.png')} accessible={false} />
          <Text style={[styles.scanText, stylesHook.scanText]} accessible={false}>
            {loc.send.details_scan}
          </Text>
        </>
      ) : (
        <Text style={[styles.linkText, { color: colors.foregroundColor }]}>{loc.wallets.import_scan_qr}</Text>
      )}
    </ToolTipMenu>
  );
};

AddressInputScanButton.displayName = 'AddressInputScanButton';

const styles = StyleSheet.create({
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
  linkText: {
    textAlign: 'center',
    fontSize: 16,
  },
});
