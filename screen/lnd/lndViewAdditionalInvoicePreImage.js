import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute, useTheme } from '@react-navigation/native';

import { BlueCopyTextToClipboard, SafeBlueArea, BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';
import QRCodeComponent from '../../components/QRCodeComponent';

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
    <SafeBlueArea style={stylesHook.root}>
      <View style={styles.wrapper}>
        <BlueTextCentered>{loc.lndViewInvoice.preimage}:</BlueTextCentered>
        <BlueSpacing20 />
        <View style={styles.qrCodeContainer}>
          <QRCodeComponent value={preImageData} size={300} logoSize={90} />
        </View>
        <BlueSpacing20 />
        <BlueCopyTextToClipboard text={preImageData} />
      </View>
    </SafeBlueArea>
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

LNDViewAdditionalInvoicePreImage.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.lndViewInvoice.additional_info }));
