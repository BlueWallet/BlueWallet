import { RouteProp, useFocusEffect, useLocale, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [isPassphraseVisible, setIsPassphraseVisible] = useState(false);

  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.elevated,
    },
    pleaseText: {
      color: colors.foregroundColor,
      writingDirection: direction,
    },
    modalBackdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalCard: {
      backgroundColor: colors.elevated,
    },
    modalTitle: {
      color: colors.foregroundColor,
      writingDirection: direction,
    },
    modalMessage: {
      color: colors.labelText,
      writingDirection: direction,
    },
    modalChip: {
      backgroundColor: colors.inputBackgroundColor,
    },
    modalChipText: {
      color: colors.labelText,
      writingDirection: direction,
    },
  });

  const passphrase = wallet instanceof AbstractHDWallet ? wallet.getPassphrase() : undefined;
  const secretWords = wallet.getSecret().split(/\s/);

  const openPassphrase = useCallback(() => {
    setIsPassphraseVisible(true);
    enableScreenProtect();
  }, [enableScreenProtect]);

  const closePassphrase = useCallback(() => {
    setIsPassphraseVisible(false);
    if (!isPrivacyBlurEnabled) disableScreenProtect();
  }, [disableScreenProtect, isPrivacyBlurEnabled]);

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
              <Button
                testID="ViewPassphraseButton"
                onPress={openPassphrase}
                title={loc.pleasebackup.view_passphrase}
                backgroundColor={colors.inputBackgroundColor}
                buttonTextColor={colors.labelText}
              />
            </View>
            <Modal visible={isPassphraseVisible} transparent animationType="fade" onRequestClose={closePassphrase}>
              <View style={[styles.modalBackdrop, stylesHook.modalBackdrop]}>
                <View style={[styles.modalCard, stylesHook.modalCard]}>
                  <Text style={[styles.modalTitle, stylesHook.modalTitle]}>{loc.wallets.import_passphrase_title}</Text>
                  <Text style={[styles.modalMessage, stylesHook.modalMessage]}>{loc.pleasebackup.passphrase_modal_message}</Text>
                  <View style={[styles.modalChip, stylesHook.modalChip]}>
                    <Text testID="BackupPassphrase" selectable style={[styles.modalChipText, stylesHook.modalChipText]}>
                      {passphrase}
                    </Text>
                  </View>
                  <Button
                    testID="ClosePassphraseButton"
                    onPress={closePassphrase}
                    title={loc.pleasebackup.passphrase_close}
                    backgroundColor={colors.lightButton}
                    buttonTextColor={colors.foregroundColor}
                  />
                </View>
              </View>
            </Modal>
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
  },
  modalCard: {
    width: '80%',
    alignSelf: 'center',
    padding: 24,
    borderRadius: 28,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 14,
  },
  modalChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  modalChipText: {
    fontWeight: 'bold',
    textAlign: 'left',
    fontSize: 17,
  },
});

export default PleaseBackup;
