import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useRoute, useTheme } from '@react-navigation/native';

import { BlueCopyTextToClipboard, SafeBlueArea, BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';

const LNDViewAdditionalInvoicePreImage = () => {
  // state = { walletInfo: undefined };
  const { colors } = useTheme();
  const { preImageData } = useRoute().params;
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });

  return (
    <SafeBlueArea style={[styles.root, stylesHook.root]}>
      <View style={styles.wrapper}>
        <BlueTextCentered>{loc.lndViewInvoice.preimage}:</BlueTextCentered>
        <BlueSpacing20 />
        <View style={styles.qrCodeContainer}>
          <QRCode
            value={preImageData}
            logo={require('../../img/qr-code.png')}
            size={300}
            logoSize={90}
            color="#000000"
            logoBackgroundColor={colors.brandingColor}
            backgroundColor="#FFFFFF"
          />
        </View>
        <BlueSpacing20 />
        <BlueCopyTextToClipboard text={preImageData} />
      </View>
    </SafeBlueArea>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    borderWidth: 6,
    borderRadius: 8,
    borderColor: '#FFFFFF',
  },
});

export default LNDViewAdditionalInvoicePreImage;

LNDViewAdditionalInvoicePreImage.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.lndViewInvoice.additional_info }));
