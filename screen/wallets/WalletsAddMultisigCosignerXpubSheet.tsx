import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { BlueSpacing20 } from '../../components/BlueSpacing';
import BlueTextCentered from '../../components/BlueTextCentered';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCode from '../../components/QRCode';
import SheetHeader, { useSheetBottomPadding } from '../../components/SheetHeader';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

const WalletsAddMultisigCosignerXpubSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AddWalletStackParamList, 'WalletsAddMultisigCosignerXpubSheet'>>();
  const route = useRoute<RouteProp<AddWalletStackParamList, 'WalletsAddMultisigCosignerXpubSheet'>>();
  const { colors } = useTheme();
  const bottomPadding = useSheetBottomPadding();
  const { cosignerXpub, cosignerXpubURv2 } = route.params;

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      paddingBottom: bottomPadding,
    },
  });

  return (
    <View style={stylesHook.root}>
      <SheetHeader onClose={() => navigation.goBack()} />
      <View style={styles.content}>
        <BlueTextCentered>
          {Platform.OS === 'ios'
            ? `${loc.multisig.this_is_cosigners_xpub} ${loc.multisig.this_is_cosigners_xpub_airdrop}`
            : loc.multisig.this_is_cosigners_xpub}
        </BlueTextCentered>
        <BlueSpacing20 />
        <View style={styles.qrContainer}>
          <QRCode value={cosignerXpubURv2} size={220} />
        </View>
        <View style={styles.copyText}>
          <CopyTextToClipboard text={cosignerXpub} truncated={false} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
  },
  copyText: {
    marginTop: 20,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
});

export default WalletsAddMultisigCosignerXpubSheet;
