/* global alert */
import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Alert, Platform, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import {
  BlueLoadingHook,
  SafeBlueArea,
  BlueSpacing20,
  BlueCard,
  BlueListItemHooks,
  BlueHeaderDefaultSubHooks,
  BlueTextHooks,
  BlueNavigationStyle,
} from '../../BlueComponents';
import { AppStorage } from '../../class';
import { useNavigation, StackActions } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import { colors } from 'react-native-elements';
const BlueApp: AppStorage = require('../../BlueApp');
const prompt = require('../../blue_modules/prompt');
const loc = require('../../loc');

const EncryptStorage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [deleteWalletsAfterUninstall, setDeleteWalletsAfterUninstall] = useState(false);
  const [biometrics, setBiometrics] = useState({ isDeviceBiometricCapable: false, isBiometricsEnabled: false, biometricsType: '' });
  const [storageIsEncrypted, setStorageIsEncrypted] = useState(false);
  const { navigate, dispatch } = useNavigation();
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  const initialState = useCallback(async () => {
    const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
    const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
    const biometricsType = (await Biometric.biometricType()) || 'biometrics';
    const deleteWalletsAfterUninstall = await BlueApp.isDeleteWalletAfterUninstallEnabled();
    const isStorageEncrypted = await BlueApp.storageIsEncrypted();
    setBiometrics(biometrics);
    setStorageIsEncrypted(isStorageEncrypted);
    setDeleteWalletsAfterUninstall(deleteWalletsAfterUninstall);
    setBiometrics({ isBiometricsEnabled, isDeviceBiometricCapable, biometricsType });
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    initialState();
  }, [initialState]);

  const decryptStorage = useCallback(async () => {
    const password = await prompt(loc.settings.password, loc._.storage_is_encrypted).catch(() => {
      setIsLoading(false);
    });
    try {
      await BlueApp.decryptStorage(password);
      dispatch(StackActions.popToTop());
    } catch (e) {
      if (password) {
        alert(loc._.bad_password);
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      }

      setIsLoading(false);
      setStorageIsEncrypted(await BlueApp.storageIsEncrypted());
      setDeleteWalletsAfterUninstall(await BlueApp.isDeleteWalletAfterUninstallEnabled());
    }
  }, [dispatch]);

  const onDeleteWalletsAfterUninstallSwitch = useCallback(async value => {
    await BlueApp.setResetOnAppUninstallTo(value);
    setDeleteWalletsAfterUninstall(value);
  }, []);

  const onEncryptStorageSwitch = useCallback(
    async value => {
      setIsLoading(true);
      if (value === true) {
        let p1 = await prompt(loc.settings.password, loc.settings.password_explain).catch(() => {
          setIsLoading(false);
          p1 = undefined;
        });
        if (!p1) {
          setIsLoading(false);
          return;
        }
        const p2 = await prompt(loc.settings.password, loc.settings.retype_password).catch(() => {
          setIsLoading(false);
        });
        if (p1 === p2) {
          await BlueApp.encryptStorage(p1);
          setIsLoading(false);
          setStorageIsEncrypted(await BlueApp.storageIsEncrypted());
        } else {
          setIsLoading(false);
          alert(loc.settings.passwords_do_not_match);
        }
      } else {
        Alert.alert(
          'Decrypt Storage',
          'Are you sure you want to decrypt your storage? This will allow your wallets to be accessed without a password.',
          [
            {
              text: loc.send.details.cancel,
              style: 'cancel',
              onPress: () => setIsLoading(false),
            },
            {
              text: loc._.ok,
              style: 'destructive',
              onPress: decryptStorage,
            },
          ],
          { cancelable: false },
        );
      }
    },
    [decryptStorage],
  );

  const onUseBiometricSwitch = useCallback(
    async value => {
      const isBiometricsEnabled = {
        isDeviceBiometricCapable: biometrics.isDeviceBiometricCapable,
        isBiometricsEnabled: biometrics.isBiometricsEnabled,
        biometricsType: biometrics.biometricsType,
      };
      if (await Biometric.unlockWithBiometrics()) {
        isBiometricsEnabled.isBiometricsEnabled = value;
        await Biometric.setBiometricUseEnabled(value);
        setBiometrics(isBiometricsEnabled);
      }
    },
    [biometrics],
  );

  const navigateToPlausibleDeniability = () => {
    navigate('PlausibleDeniability');
  };

  return isLoading ? (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <BlueLoadingHook />
    </SafeBlueArea>
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView contentContainerStyle={styles.root}>
        {biometrics.isDeviceBiometricCapable && (
          <>
            <BlueHeaderDefaultSubHooks leftText="biometrics" rightComponent={null} />
            <BlueListItemHooks
              title={`Use ${biometrics.biometricsType}`}
              Component={TouchableWithoutFeedback}
              switch={{ value: biometrics.isBiometricsEnabled, onValueChange: onUseBiometricSwitch }}
            />
            <BlueCard>
              <BlueTextHooks>
                {biometrics.biometricsType} will be used to confirm your identity prior to making a transaction, unlocking, exporting or
                deleting a wallet. {biometrics.biometricsType} will not be used to unlock an encrypted storage.
              </BlueTextHooks>
            </BlueCard>
            <BlueSpacing20 />
          </>
        )}
        <BlueHeaderDefaultSubHooks leftText="storage" rightComponent={null} />
        <BlueListItemHooks
          testID="EncyptedAndPasswordProtected"
          hideChevron
          title="Encrypted and Password protected"
          Component={TouchableWithoutFeedback}
          switch={{ onValueChange: onEncryptStorageSwitch, value: storageIsEncrypted }}
        />
        {Platform.OS === 'ios' && (
          <BlueListItemHooks
            hideChevron
            title="Delete if BlueWallet is uninstalled"
            Component={TouchableWithoutFeedback}
            switch={{
              onValueChange: onDeleteWalletsAfterUninstallSwitch,
              value: deleteWalletsAfterUninstall,
            }}
          />
        )}
        {storageIsEncrypted && (
          <BlueListItemHooks
            onPress={navigateToPlausibleDeniability}
            title={loc.settings.plausible_deniability}
            chevron
            testID="PlausibleDeniabilityButton"
            Component={TouchableOpacity}
          />
        )}
      </ScrollView>
    </SafeBlueArea>
  );
};

export default EncryptStorage;
EncryptStorage.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  headerTitle: 'Security',
});
