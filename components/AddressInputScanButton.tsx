import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useExtendedNavigation } from '../hooks/useExtendedNavigation';
import { isCameraAuthorizationStatusDeniedByUser } from '../helpers/scan-qr';
import { openSettings } from 'react-native-permissions';
import { Action } from './types';

interface AddressInputScanButtonProps {
  isLoading: boolean;
  scanButtonTapped: () => void;
  onBarScanned: (ret: { data?: any }) => void;
  onChangeText: (text: string) => void;
}

interface RouteParams {
  onBarScanned?: any;
}

export const AddressInputScanButton = ({ isLoading, scanButtonTapped, onBarScanned, onChangeText }: AddressInputScanButtonProps) => {
  const { colors } = useTheme();
  const { isClipboardGetContentEnabled } = useSettings();
  const [isMenuPrimaryAction, setIsMenuPrimaryAction] = useState(false);

  const navigation = useExtendedNavigation();
  const params = useRoute().params as RouteParams;
  const stylesHook = StyleSheet.create({
    scan: {
      backgroundColor: colors.scanLabel,
    },
    scanText: {
      color: colors.inverseForegroundColor,
    },
  });

  useFocusEffect(
    useCallback(() => {
      // Android permissions handles "unavailable" status differently
      if (Platform.OS !== 'android') {
        isCameraAuthorizationStatusDeniedByUser().then(setIsMenuPrimaryAction);
      }
    }, []),
  );

  const toolTipOnPress = useCallback(async () => {
    if (!isMenuPrimaryAction) {
      await scanButtonTapped();
      Keyboard.dismiss();
      navigation.navigate('ScanQRCode', {
        showFileImportButton: true,
      });
    }
  }, [isMenuPrimaryAction, navigation, scanButtonTapped]);

  const actions = useMemo(() => {
    const availableActions: Action | Action[][] = [
      [
        CommonToolTipActions.ChoosePhoto,
        CommonToolTipActions.ImportFile,
        {
          ...CommonToolTipActions.PasteFromClipboard,
          hidden: !isClipboardGetContentEnabled,
        },
      ],
      [{ ...CommonToolTipActions.OpenSettings, hidden: !isMenuPrimaryAction }],
    ];
    return availableActions;
  }, [isClipboardGetContentEnabled, isMenuPrimaryAction]);

  useEffect(() => {
    const data = params.onBarScanned;
    if (data) {
      onBarScanned({ data });
      navigation.setParams({ onBarScanned: undefined });
    }
  });

  const onMenuItemPressed = useCallback(
    async (action: string) => {
      if (onBarScanned === undefined) throw new Error('onBarScanned is required');
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
        case CommonToolTipActions.OpenSettings.id:
          openSettings('application');
      }
      Keyboard.dismiss();
    },
    [onBarScanned, onChangeText],
  );

  const buttonStyle = useMemo(() => [styles.scan, stylesHook.scan], [stylesHook.scan]);

  return (
    <ToolTipMenu
      actions={actions}
      isButton
      onPressMenuItem={onMenuItemPressed}
      testID="BlueAddressInputScanQrButton"
      disabled={isLoading}
      isMenuPrimaryAction={isMenuPrimaryAction}
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
  );
};

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
});
