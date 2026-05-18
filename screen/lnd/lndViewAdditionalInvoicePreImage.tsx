import { RouteProp, useRoute } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import BlueTextCentered from '../../components/BlueTextCentered';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCode from '../../components/QRCode';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { BlueSpacing20 } from '../../components/BlueSpacing';

type LNDViewAdditionalInvoicePreImageRouteParams = {
  preImageData: string;
};

const LNDViewAdditionalInvoicePreImage = () => {
  const { colors } = useTheme();
  const { preImageData } = useRoute<RouteProp<{ params: LNDViewAdditionalInvoicePreImageRouteParams }, 'params'>>().params;
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
          <QRCode value={preImageData} size={300} logoSize={90} />
        </View>
        <BlueSpacing20 />
        <View style={styles.copyText}>
          <CopyTextToClipboard text={preImageData} />
        </View>
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
  copyText: {
    marginVertical: 32,
    paddingHorizontal: 16,
  },
});

export default LNDViewAdditionalInvoicePreImage;
