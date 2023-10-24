import React, { useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ToolTipMenu from './TooltipMenu';
import Share from 'react-native-share';
import loc from '../loc';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from './themes';

interface QRCodeComponentProps {
  value: string;
  isLogoRendered?: boolean;
  isMenuAvailable?: boolean;
  logoSize?: number;
  size?: number;
  ecl?: 'H' | 'Q' | 'M' | 'L';
  onError?: () => void;
}

interface ActionIcons {
  iconType: 'SYSTEM';
  iconValue: string;
}

interface ActionType {
  Share: 'share';
  Copy: 'copy';
}

interface Action {
  id: string;
  text: string;
  icon: ActionIcons;
}

const actionKeys: ActionType = {
  Share: 'share',
  Copy: 'copy',
};

interface ActionIcons {
  iconType: 'SYSTEM';
  iconValue: string;
}

const actionIcons: { [key: string]: ActionIcons } = {
  Share: {
    iconType: 'SYSTEM',
    iconValue: 'square.and.arrow.up',
  },
  Copy: {
    iconType: 'SYSTEM',
    iconValue: 'doc.on.doc',
  },
};

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
      Share.open(shareImageBase64).catch((error: any) => console.log(error));
    });
  };

  const onPressMenuItem = (id: string) => {
    if (id === actionKeys.Share) {
      handleShareQRCode();
    } else if (id === actionKeys.Copy) {
      qrCode.current.toDataURL(Clipboard.setImage);
    }
  };

  const menuActions = (): Action[] => {
    const actions: Action[] = [];
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      actions.push({
        id: actionKeys.Copy,
        text: loc.transactions.details_copy,
        icon: actionIcons.Copy,
      });
    }
    actions.push({
      id: actionKeys.Share,
      text: loc.receive.details_share,
      icon: actionIcons.Share,
    });
    return actions;
  };

  const renderQRCode = (
    <QRCode
      value={value}
      {...(isLogoRendered ? { logo: require('../img/qr-code.png') } : {})}
      size={size}
      logoSize={logoSize}
      color="#000000"
      // @ts-ignore: logoBackgroundColor is not in the type definition
      logoBackgroundColor={colors.brandingColor}
      backgroundColor="#FFFFFF"
      ecl={ecl}
      getRef={(c: any) => (qrCode.current = c)}
      onError={onError}
    />
  );

  return (
    <View style={styles.qrCodeContainer} testID="BitcoinAddressQRCodeContainer">
      {isMenuAvailable ? (
        <ToolTipMenu actions={menuActions()} onPressMenuItem={onPressMenuItem}>
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
