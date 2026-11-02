import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Button from '../../components/Button';
import SheetHeader, { useSheetBottomPadding } from '../../components/SheetHeader';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

const WalletsAddMultisigVaultKeySheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AddWalletStackParamList, 'WalletsAddMultisigVaultKeySheet'>>();
  const route = useRoute<RouteProp<AddWalletStackParamList, 'WalletsAddMultisigVaultKeySheet'>>();
  const { colors } = useTheme();
  const bottomPadding = useSheetBottomPadding();
  const { seed, keyIndex } = route.params;
  const title = loc.formatString(loc.multisig.vault_key, { number: keyIndex });

  const words = useMemo(() => seed.split(' '), [seed]);

  const stylesHook = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.elevated,
      paddingBottom: bottomPadding,
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
      <SheetHeader title={title} onClose={() => navigation.goBack()} />
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
