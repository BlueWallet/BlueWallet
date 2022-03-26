import React, { useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ToolTipMenu from './TooltipMenu';
import Share from 'react-native-share';
import loc from '../loc';
import PropTypes from 'prop-types';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '@react-navigation/native';

const QRCodeComponent = ({
  value,
  isLogoRendered = true,
  isMenuAvailable = true,
  logoSize = 90,
  size = 300,
  ecl = 'H',
  onError = () => {},
}) => {
  const qrCode = useRef();
  const { colors } = useTheme();

  const handleShareQRCode = () => {
    qrCode.current.toDataURL(data => {
      const shareImageBase64 = {
        url: `data:image/png;base64,${data}`,
      };
      Share.open(shareImageBase64).catch(error => console.log(error));
    });
  };

  const onPressMenuItem = id => {
    if (id === QRCodeComponent.actionKeys.Share) {
      handleShareQRCode();
    } else if (id === QRCodeComponent.actionKeys.Copy) {
      qrCode.current.toDataURL(Clipboard.setImage);
    }
  };

  const menuActions = () => {
    const actions = [];
    if (Platform.OS === 'ios' || Platform.OS === 'macos') {
      actions.push({
        id: QRCodeComponent.actionKeys.Copy,
        text: loc.transactions.details_copy,
        icon: QRCodeComponent.actionIcons.Copy,
      });
    }
    actions.push({
      id: QRCodeComponent.actionKeys.Share,
      text: loc.receive.details_share,
      icon: QRCodeComponent.actionIcons.Share,
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
      logoBackgroundColor={colors.brandingColor}
      backgroundColor="#FFFFFF"
      ecl={ecl}
      getRef={qrCode}
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

QRCodeComponent.actionKeys = {
  Share: 'share',
  Copy: 'copy',
};

QRCodeComponent.actionIcons = {
  Share: {
    iconType: 'SYSTEM',
    iconValue: 'square.and.arrow.up',
  },
  Copy: {
    iconType: 'SYSTEM',
    iconValue: 'doc.on.doc',
  },
};

QRCodeComponent.propTypes = {
  value: PropTypes.string.isRequired,
  isMenuAvailable: PropTypes.bool,
  size: PropTypes.number,
  ecl: PropTypes.string,
  isLogoRendered: PropTypes.bool,
  onError: PropTypes.func,
  logoSize: PropTypes.number,
};
