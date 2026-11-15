import { RouteProp, useFocusEffect, useLocale, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import SeedWords from '../../components/SeedWords';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { AbstractHDWallet } from '../../class/wallets/abstract-hd-wallet';
import WarningBanner from '../../components/WarningBanner';

type RouteProps = RouteProp<AddWalletStackParamList, 'PleaseBackup'>;
type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'PleaseBackup'>;

const PleaseBackup: React.FC = () => {
  const { wallets } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;
  const wallet = wallets.find(w => w.getID() === walletID)!;
  const navigation = useNavigation<NavigationProp>();
  const { isPrivacyBlurEnabled } = useSettings();
  const { colors } = useTheme();
  const { direction } = useLocale();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();

  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.elevated,
    },
    pleaseText: {
      color: colors.foregroundColor,
      writingDirection: direction,
    },
    passphraseBox: {
      backgroundColor: colors.inputBackgroundColor,
    },
    wordText: {
      color: colors.labelText,
    },
  });

  const passphrase = wallet instanceof AbstractHDWallet ? wallet.getPassphrase() : undefined;
  const secretWords = wallet.getSecret().split(/\s/);

  const handleBackButton = useCallback(() => {
    navigation.getParent()?.goBack();
    return true;
  }, [navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);

    return () => {
      subscription.remove();
    };
  }, [handleBackButton]);

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();
      return () => {
        disableScreenProtect();
      };
    }, [disableScreenProtect, enableScreenProtect, isPrivacyBlurEnabled]),
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.flex, stylesHook.flex]}
      testID="PleaseBackupScrollView"
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.please}>
        <Text style={[styles.pleaseText, stylesHook.pleaseText]}>
          {passphrase ? loc.pleasebackup.text_passphrase : loc.pleasebackup.text}
        </Text>
      </View>
      <View style={styles.list}>
        {passphrase ? (
          <>
            <SeedWords seed={secretWords.join(' ')} />
            <WarningBanner text={loc.pleasebackup.passphrase_warning} testID="PassphraseWarning" />
            <View style={styles.passphraseContainer}>
              <View style={[styles.passphraseChip, stylesHook.passphraseBox]}>
                <Text style={[styles.passphraseChipText, stylesHook.wordText]}>{`${secretWords.length + 1}. `}</Text>
                <Text testID="BackupPassphrase" selectable style={[styles.passphraseChipText, stylesHook.wordText]}>
                  {passphrase}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <SeedWords seed={wallet.getSecret()} />
        )}
      </View>
      <View style={styles.bottom}>
        <Button testID="PleasebackupOk" onPress={handleBackButton} title={loc.pleasebackup.ok} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
    justifyContent: 'space-around',
  },
  please: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  list: {
    flexGrow: 8,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  bottom: {
    flexGrow: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pleaseText: {
    marginVertical: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  passphraseContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  passphraseChip: {
    flexDirection: 'row',
    maxWidth: '100%',
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  passphraseChipText: {
    fontWeight: 'bold',
    textAlign: 'left',
    fontSize: 17,
    flexShrink: 1,
  },
});

export default PleaseBackup;
