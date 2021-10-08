import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from './themes';
import ToolTipMenu from './TooltipMenu';
import Share from 'react-native-share';
import loc from '../loc';
import PropTypes from 'prop-types';

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
        <ToolTipMenu
          actions={[
            {
              id: QRCodeComponent.actionKeys.Share,
              text: loc.receive.details_share,
              icon: QRCodeComponent.actionIcons.Share,
            },
          ]}
          onPressMenuItem={handleShareQRCode}
        >
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
};

QRCodeComponent.actionIcons = {
  Share: {
    iconType: 'SYSTEM',
    iconValue: 'square.and.arrow.up',
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
