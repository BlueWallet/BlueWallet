import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import BlueTextCentered from '../../components/BlueTextCentered';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import SquareEnumeratedWords, { SquareEnumeratedWordsContentAlign } from '../../components/SquareEnumeratedWords';
import SheetHeader, { useSheetBottomPadding } from '../../components/SheetHeader';
import SheetKeyboardForm from '../../components/SheetKeyboardForm';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

/** Grabber and, on iOS, the native header. They sit outside this view, so they come out of the scroll cap. */
const SHEET_CHROME = Platform.OS === 'ios' ? 120 : 36;
/** In-content Android title row. iOS uses the native header. */
const ANDROID_HEADER = 50;
/** Share button and the gap above it, kept outside the scroller so it stays on screen. */
const SHARE_BLOCK = 72;

const ViewEditMultisigCosignerViewSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigCosignerViewSheet'>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'ViewEditMultisigCosignerViewSheet'>>();
  const { colors } = useTheme();
  const bottomPadding = useSheetBottomPadding();
  const { vaultKeyData, walletID } = route.params;
  const hasXpub = Boolean(vaultKeyData.xpub);
  const hasSeed = Boolean(vaultKeyData.seed);
  const canShare = Boolean(vaultKeyData.xpub && vaultKeyData.cosignerXpubURv2 && vaultKeyData.exportFilename);
  const title = loc.formatString(loc.multisig.vault_key, { number: vaultKeyData.keyIndex });

  const seedWords = useMemo(() => (vaultKeyData.seed ? vaultKeyData.seed.split(' ') : []), [vaultKeyData.seed]);
  const descriptorEntries = [vaultKeyData.fp ?? '', vaultKeyData.path ?? ''].filter(entry => entry.length > 0);

  const handleShare = () => {
    if (!canShare) return;
    navigation.navigate(
      'ViewEditMultisigShareCosignerSheet',
      {
        walletID,
        cosignerXpub: vaultKeyData.exportString,
        cosignerXpubURv2: vaultKeyData.cosignerXpubURv2,
        exportFilename: vaultKeyData.exportFilename,
      },
      { merge: true },
    );
  };

  const reservedHeight = SHEET_CHROME + (Platform.OS === 'android' ? ANDROID_HEADER : 0) + (canShare ? SHARE_BLOCK : 0) + bottomPadding;

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      paddingBottom: bottomPadding,
    },
    sectionTitle: {
      color: colors.alternativeTextColor,
    },
    xpubChip: {
      backgroundColor: colors.inputBackgroundColor,
    },
    xpub: {
      color: colors.labelText,
    },
  });

  return (
    <View style={stylesHook.root}>
      <SheetHeader title={title} onClose={() => navigation.goBack()} />
      <SheetKeyboardForm style={styles.content} reservedHeight={reservedHeight}>
        {hasXpub && (
          <>
            <View style={styles.sectionTitle}>
              <Icon name="eye" type="font-awesome" size={16} color={colors.alternativeTextColor} />
              <Text style={[styles.sectionTitleText, stylesHook.sectionTitle]}>{loc._.public_key}</Text>
            </View>
            <BlueSpacing10 />
            <View style={[styles.xpubChip, stylesHook.xpubChip]}>
              <Text style={[styles.xpub, stylesHook.xpub]}>{vaultKeyData.xpub}</Text>
            </View>
            {descriptorEntries.length > 0 ? (
              <SquareEnumeratedWords
                contentAlign={SquareEnumeratedWordsContentAlign.left}
                entries={descriptorEntries}
                appendNumber={false}
              />
            ) : null}
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
      </SheetKeyboardForm>
      {canShare ? (
        <View style={styles.footer}>
          <Button testID="VaultCosignerViewShare" title={loc.multisig.share} onPress={handleShare} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
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
  xpubChip: {
    alignSelf: 'stretch',
    borderRadius: 4,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    marginBottom: 8,
  },
  xpub: {
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
});

export default ViewEditMultisigCosignerViewSheet;
