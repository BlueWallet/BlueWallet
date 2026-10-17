import React from 'react';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { BlueSpacing20 } from '../../components/BlueSpacing';
import BlueTextCentered from '../../components/BlueTextCentered';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import QRCode from '../../components/QRCode';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

const WalletsAddMultisigCosignerXpubSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AddWalletStackParamList, 'WalletsAddMultisigCosignerXpubSheet'>>();
  const route = useRoute<RouteProp<AddWalletStackParamList, 'WalletsAddMultisigCosignerXpubSheet'>>();
  const { colors, closeImage } = useTheme();
  const insets = useSafeAreaInsets();
  const { cosignerXpub, cosignerXpubURv2 } = route.params;

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      // Android form sheets often report insets.bottom as 0. iOS form sheets often report a huge one.
      paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 8 : 16,
    },
    closeButton: {
      backgroundColor: colors.lightButton,
    },
  });

  return (
    <View style={stylesHook.root}>
      {Platform.OS === 'android' && (
        <View style={styles.androidHeader}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.close}
            style={[styles.androidCloseButton, stylesHook.closeButton]}
            onPress={() => navigation.goBack()}
            testID="NavigationCloseButton"
          >
            <Image source={closeImage} />
          </TouchableOpacity>
        </View>
      )}
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
  androidHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  androidCloseButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
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
