import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { seed, keyIndex } = route.params;
  const title = loc.formatString(loc.multisig.vault_key, { number: keyIndex });

  const words = useMemo(() => seed.split(' '), [seed]);

  const stylesHook = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.elevated,
      // Form sheets on Android often report insets.bottom as 0; keep a comfortable floor.
      paddingBottom: Math.max(insets.bottom, 24) + 16,
    },
    headerTitle: {
      color: colors.foregroundColor,
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
        </View>
      )}
      <Text style={[styles.description, stylesHook.description]}>{loc.multisig.wallet_key_created}</Text>
      <View style={styles.seedCenter}>
        <View style={styles.secretContainer}>
          {words.map((text, index) => (
            <View style={[styles.word, stylesHook.word]} key={`${text}${index}`}>
              <Text style={[styles.wordText, stylesHook.wordText]}>{`${index + 1}. ${text}`}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Button testID="VaultKeyDone" title={loc.send.success_done} onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  androidHeader: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  seedCenter: {
    flex: 1,
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
