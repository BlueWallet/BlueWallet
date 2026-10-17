import React, { useMemo } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

const WalletsAddMultisigVaultKeySheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AddWalletStackParamList, 'WalletsAddMultisigVaultKeySheet'>>();
  const route = useRoute<RouteProp<AddWalletStackParamList, 'WalletsAddMultisigVaultKeySheet'>>();
  const { colors, closeImage } = useTheme();
  const insets = useSafeAreaInsets();
  const { seed, keyIndex } = route.params;
  const title = loc.formatString(loc.multisig.vault_key, { number: keyIndex });

  const words = useMemo(() => seed.split(' '), [seed]);

  const stylesHook = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.elevated,
      // Android form sheets often report insets.bottom as 0. iOS form sheets often report a huge one,
      // and this padding sits inside the fixed detent.
      paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 24) + 16 : 16,
    },
    headerTitle: {
      color: colors.foregroundColor,
    },
    closeButton: {
      backgroundColor: colors.lightButton,
    },
    description: {
      color: colors.alternativeTextColor,
    },
    word: {
      backgroundColor: colors.inputBackgroundColor,
    },
    wordText: {
      color: colors.foregroundColor,
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
      <Text style={[styles.description, stylesHook.description]}>{loc.multisig.wallet_key_created}</Text>
      <ScrollView style={styles.seedScroll} contentContainerStyle={styles.seedContent}>
        <View style={styles.secretContainer}>
          {words.map((text, index) => (
            <View style={[styles.word, stylesHook.word]} key={`${text}${index}`}>
              <Text style={[styles.wordText, stylesHook.wordText]}>{`${index + 1}. ${text}`}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button testID="VaultKeyDone" title={loc.send.success_done} onPress={() => navigation.goBack()} />
      </View>
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
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  seedScroll: {
    flex: 1,
  },
  seedContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  secretContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  word: {
    marginHorizontal: 4,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  wordText: {
    textAlign: 'center',
  },
});

export default WalletsAddMultisigVaultKeySheet;
