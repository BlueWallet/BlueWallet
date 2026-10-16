import React, { useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import BlueTextCentered from '../../components/BlueTextCentered';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import SquareEnumeratedWords, { SquareEnumeratedWordsContentAlign } from '../../components/SquareEnumeratedWords';
import { useTheme } from '../../components/themes';
import { MultisigCosigner } from '../../class/multisig-cosigner';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const ViewEditMultisigCosignerViewSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigCosignerViewSheet'>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'ViewEditMultisigCosignerViewSheet'>>();
  const { colors, closeImage } = useTheme();
  const insets = useSafeAreaInsets();
  const { vaultKeyData, walletID } = route.params;
  const hasXpub = Boolean(vaultKeyData.xpub);
  const hasSeed = Boolean(vaultKeyData.seed);
  const canShare = Boolean(vaultKeyData.xpub && vaultKeyData.cosignerXpubURv2 && vaultKeyData.exportFilename);
  const title = loc.formatString(loc.multisig.vault_key, { number: vaultKeyData.keyIndex });

  const seedWords = useMemo(() => (vaultKeyData.seed ? vaultKeyData.seed.split(' ') : []), [vaultKeyData.seed]);

  const handleShare = () => {
    if (!vaultKeyData.xpub || !vaultKeyData.fp || !vaultKeyData.path || !vaultKeyData.cosignerXpubURv2 || !vaultKeyData.exportFilename) {
      return;
    }
    const cosignerJson = vaultKeyData.exportString ?? MultisigCosigner.exportToJson(vaultKeyData.fp, vaultKeyData.xpub, vaultKeyData.path);
    navigation.navigate(
      'ViewEditMultisigShareCosignerSheet',
      {
        walletID,
        cosignerXpub: cosignerJson,
        cosignerXpubURv2: vaultKeyData.cosignerXpubURv2,
        exportFilename: vaultKeyData.exportFilename,
      },
      { merge: true },
    );
  };

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      // Android form sheets often report insets.bottom as 0. iOS form sheets often report a huge one.
      paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 8 : 16,
    },
    headerTitle: {
      color: colors.foregroundColor,
    },
    sectionTitle: {
      color: colors.alternativeTextColor,
    },
    closeButton: {
      backgroundColor: colors.lightButton,
    },
  });

  return (
    <View style={stylesHook.root}>
      {Platform.OS === 'android' && (
        <View style={styles.androidHeader}>
          <Text style={[styles.headerTitle, stylesHook.headerTitle]} accessibilityRole="header">
            {title}
          </Text>
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
        {hasXpub && (
          <>
            <View style={styles.sectionTitle}>
              <Icon name="eye" type="font-awesome" size={16} color={colors.alternativeTextColor} />
              <Text style={[styles.sectionTitleText, stylesHook.sectionTitle]}>{loc._.public_key}</Text>
            </View>
            <BlueSpacing10 />
            <SquareEnumeratedWords
              contentAlign={SquareEnumeratedWordsContentAlign.left}
              entries={[vaultKeyData.xpub as string, vaultKeyData.fp ?? '', vaultKeyData.path ?? '']}
              appendNumber={false}
            />
          </>
        )}
        {hasSeed && (
          <>
            {hasXpub ? <BlueSpacing20 /> : null}
            <View style={styles.sectionTitle}>
              <Icon name="signature" type="font-awesome-6" size={16} color={colors.alternativeTextColor} />
              <Text style={[styles.sectionTitleText, stylesHook.sectionTitle]}>{loc._.seed}</Text>
            </View>
            <BlueSpacing10 />
            <SquareEnumeratedWords contentAlign={SquareEnumeratedWordsContentAlign.left} entries={seedWords} appendNumber />
            {vaultKeyData.passphrase ? <BlueTextCentered>{vaultKeyData.passphrase}</BlueTextCentered> : null}
          </>
        )}
      </View>
      {canShare ? (
        <View style={styles.footer}>
          <Button testID="VaultCosignerViewShare" title={loc.multisig.share} onPress={handleShare} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  androidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
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
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
});

export default ViewEditMultisigCosignerViewSheet;
