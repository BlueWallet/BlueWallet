import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Share from 'react-native-share';

import loc from '../loc';
import { ActionIcons } from '../typings/ActionIcons';
import { useTheme } from './themes';
import ToolTipMenu from './TooltipMenu';
import { Action } from './types';

interface QRCodeComponentProps {
  value: string;
  isLogoRendered?: boolean;
  isMenuAvailable?: boolean;
  logoSize?: number;
  size?: number;
  ecl?: 'H' | 'Q' | 'M' | 'L';
  onError?: () => void;
}

const actionIcons: { [key: string]: ActionIcons } = {
  Share: {
    iconValue: 'square.and.arrow.up',
  },
  Copy: {
    iconValue: 'doc.on.doc',
  },
};

const actionKeys = {
  Share: 'share',
  Copy: 'copy',
};

const menuActions: Action[] =
  Platform.OS === 'ios' || Platform.OS === 'macos'
    ? [
        {
          id: actionKeys.Copy,
          text: loc.transactions.details_copy,
          icon: actionIcons.Copy,
        },
        { id: actionKeys.Share, text: loc.receive.details_share, icon: actionIcons.Share },
      ]
    : [
        {
          id: actionKeys.Copy,
          text: loc.transactions.details_copy,
          icon: actionIcons.Copy,
        },
      ];

const QRCodeComponent: React.FC<QRCodeComponentProps> = ({
  value = '',
  isLogoRendered = true,
  isMenuAvailable = true,
  logoSize = 90,
  size = 300,
  ecl = 'H',
  onError = () => {},
}) => {
  const qrCode = useRef<any>();
  const { colors } = useTheme();

  const handleShareQRCode = () => {
    qrCode.current.toDataURL((data: string) => {
      data = data.replace(/(\r\n|\n|\r)/gm, '');
      const shareImageBase64 = {
        url: `data:image/png;base64,${data}`,
      };
      Share.open(shareImageBase64).catch((error: Error) => console.log(error));
    });
  };

  const onPressMenuItem = useCallback((id: string) => {
    if (id === actionKeys.Share) {
      handleShareQRCode();
    } else if (id === actionKeys.Copy) {
      qrCode.current.toDataURL(Clipboard.setImage);
    }
  }, []);

  const renderQRCode = (
    <QRCode
      value={value}
      {...(isLogoRendered ? { logo: require('../img/qr-code.png') } : {})}
      size={size}
      logoSize={logoSize}
      color="#000000"
      logoBackgroundColor={colors.brandingColor}
      backgroundColor="#FFFFFF"
      ecl={ecl}
      getRef={(c: any) => (qrCode.current = c)}
      onError={onError}
    />
  );

  return (
    <View
      style={styles.qrCodeContainer}
      testID="BitcoinAddressQRCodeContainer"
      accessibilityRole="image"
      accessibilityLabel={loc.receive.qrcode_for_the_address}
    >
      {isMenuAvailable ? (
        <ToolTipMenu actions={menuActions} onPressMenuItem={onPressMenuItem}>
          {renderQRCode}
        </ToolTipMenu>
      ) : (
        renderQRCode
      )}
    </View>
  );
};

export default QRCodeComponent;

const styles = StyleSheet.create({
  qrCodeContainer: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
});
