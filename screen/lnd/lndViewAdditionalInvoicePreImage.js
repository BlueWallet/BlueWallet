import { useRoute } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCodeComponent from '../../components/QRCodeComponent';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
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
    <SafeArea style={stylesHook.root}>
      <View style={styles.wrapper}>
        <BlueTextCentered>{loc.lndViewInvoice.preimage}:</BlueTextCentered>
        <BlueSpacing20 />
        <View style={styles.qrCodeContainer}>
          <QRCodeComponent value={preImageData} size={300} logoSize={90} />
        </View>
        <BlueSpacing20 />
        <CopyTextToClipboard text={preImageData} />
      </View>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
});

export default LNDViewAdditionalInvoicePreImage;
