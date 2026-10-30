import React, { useMemo, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
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

/** Grabber and, on iOS, the native header. They sit outside this view, so they come out of the scroll cap. */
const SHEET_CHROME = Platform.OS === 'ios' ? 120 : 36;
/** In-content Android title row. iOS uses the native header. */
const ANDROID_HEADER = 50;
/** Share button and the gap above it, kept outside the scroller so it stays on screen. */
const SHARE_BLOCK = 72;

const ViewEditMultisigCosignerViewSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigCosignerViewSheet'>>();
  const route = useRoute<RouteProp<DetailViewStackParamList, 'ViewEditMultisigCosignerViewSheet'>>();
  const { colors, closeImage } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { vaultKeyData, walletID } = route.params;
  const hasXpub = Boolean(vaultKeyData.xpub);
  const hasSeed = Boolean(vaultKeyData.seed);
  const canShare = Boolean(vaultKeyData.xpub && vaultKeyData.cosignerXpubURv2 && vaultKeyData.exportFilename);
  const title = loc.formatString(loc.multisig.vault_key, { number: vaultKeyData.keyIndex });

  const seedWords = useMemo(() => (vaultKeyData.seed ? vaultKeyData.seed.split(' ') : []), [vaultKeyData.seed]);
  const descriptorEntries = [vaultKeyData.fp ?? '', vaultKeyData.path ?? ''].filter(entry => entry.length > 0);
  const [contentHeight, setContentHeight] = useState(0);

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

  const bottomPad = Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 8 : 16;
  const scrollMaxHeight = Math.max(
    windowHeight - insets.top - SHEET_CHROME - (Platform.OS === 'android' ? ANDROID_HEADER : 0) - (canShare ? SHARE_BLOCK : 0) - bottomPad,
    160,
  );
  // maxHeight alone makes an iOS ScrollView report that cap as its height, so fitToContents opens a full sheet.
  // Size it to the key, and only then stop at the cap so a 24-word seed can scroll.
  const scrollHeight = contentHeight > 0 ? Math.min(contentHeight, scrollMaxHeight) : undefined;

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
      // Android form sheets often report insets.bottom as 0. iOS form sheets often report a huge one.
      paddingBottom: bottomPad,
    },
    scroll: {
      // flexGrow would make Android fitToContents expand to full height. ScrollView's own style is flexGrow 1.
      flexGrow: 0,
      flexShrink: 0,
      ...(scrollHeight !== undefined ? { height: scrollHeight } : {}),
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
    xpubChip: {
      backgroundColor: colors.inputBackgroundColor,
    },
    xpub: {
      color: colors.labelText,
    },
  });

  return (
    <View style={stylesHook.root}>
      {/* First subview must not lead to the ScrollView. react-native-screens walks that chain and, when it
          finds contentInsetAdjustmentBehavior "never", forces "automatic", which pushes the key under Share. */}
      <View collapsable={false} pointerEvents="none" style={styles.scrollGuard} />
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
      <ScrollView
        style={stylesHook.scroll}
        contentContainerStyle={styles.content}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        scrollEnabled={contentHeight > scrollMaxHeight}
        onContentSizeChange={(_width, height) => {
          if (height > 0) setContentHeight(current => (Math.abs(current - height) < 1 ? current : height));
        }}
      >
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
      </ScrollView>
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
  scrollGuard: {
    height: 1,
    opacity: 0,
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
