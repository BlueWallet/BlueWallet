import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useStorage } from '../../blue_modules/storage-context';
import { BlueCard, BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import ListItem from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { useBiometrics } from '../../hooks/useBiometrics';
import loc from '../../loc';

const EncryptStorage = () => {
  const { isStorageEncrypted, encryptStorage, decryptStorage, saveToDisk } = useStorage();
  const [isLoading, setIsLoading] = useState(true);
  const { isDeviceBiometricCapable, biometricEnabled, setBiometricUseEnabled, deviceBiometricType, unlockWithBiometrics } = useBiometrics();
  const [storageIsEncryptedSwitchEnabled, setStorageIsEncryptedSwitchEnabled] = useState(false);
  const [deviceBiometricCapable, setDeviceBiometricCapable] = useState(false);
  const { navigate, popToTop } = useNavigation();
  const { colors } = useTheme();
  const styleHooks = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    headerText: {
      color: colors.foregroundColor,
    },
  });

  const initialState = useCallback(async () => {
    const isStorageEncryptedSwitchEnabled = await isStorageEncrypted();
    const isDeviceBiometricCapableSync = await isDeviceBiometricCapable();
    setStorageIsEncryptedSwitchEnabled(isStorageEncryptedSwitchEnabled);
    setDeviceBiometricCapable(isDeviceBiometricCapableSync);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    initialState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDecryptStorage = async () => {
    const password = await prompt(loc.settings.password, loc._.storage_is_encrypted).catch(() => {
      setIsLoading(false);
    });
    try {
      await decryptStorage(password);
      await saveToDisk();
      popToTop();
    } catch (e) {
      if (password) {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc._.bad_password });
      }

      setIsLoading(false);
      setStorageIsEncryptedSwitchEnabled(await isStorageEncrypted());
    }
  };

  const onEncryptStorageSwitch = async value => {
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
        await encryptStorage(p1);
        setIsLoading(false);
        setStorageIsEncryptedSwitchEnabled(await isStorageEncrypted());
        saveToDisk();
      } else {
        setIsLoading(false);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.settings.passwords_do_not_match });
      }
    } else {
      Alert.alert(
        loc.settings.encrypt_decrypt,
        loc.settings.encrypt_decrypt_q,
        [
          {
            text: loc._.cancel,
            style: 'cancel',
            onPress: () => setIsLoading(false),
          },
          {
            text: loc._.ok,
            style: 'destructive',
            onPress: handleDecryptStorage,
          },
        ],
        { cancelable: false },
      );
    }
  };

  const onUseBiometricSwitch = async value => {
    if (await unlockWithBiometrics()) {
      setBiometricUseEnabled(value);
    }
  };

  const navigateToPlausibleDeniability = () => {
    navigate('PlausibleDeniability');
  };

  const renderPasscodeExplanation = () => {
    let isCapable = true;

    if (Platform.OS === 'android') {
      if (Platform.Version < 30) {
        isCapable = false;
      }
    }

    return isCapable ? (
      <>
        <BlueText />
        <BlueText>{loc.formatString(loc.settings.biometrics_fail, { type: deviceBiometricType })}</BlueText>
      </>
    ) : null;
  };

  return isLoading ? (
    <ScrollView centerContent>
      <BlueLoading />
    </ScrollView>
  ) : (
    <ScrollView contentContainerStyle={styles.root} automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <View style={styles.paddingTop} />
      {deviceBiometricCapable && (
        <>
          <Text adjustsFontSizeToFit style={[styles.headerText, styleHooks.headerText]}>
            {loc.settings.biometrics}
          </Text>
          <ListItem
            title={loc.formatString(loc.settings.encrypt_use, { type: deviceBiometricType })}
            Component={TouchableWithoutFeedback}
            switch={{ value: biometricEnabled, onValueChange: onUseBiometricSwitch }}
          />
          <BlueCard>
            <BlueText>{loc.formatString(loc.settings.encrypt_use_expl, { type: deviceBiometricType })}</BlueText>
            {renderPasscodeExplanation()}
          </BlueCard>
          <BlueSpacing20 />
        </>
      )}
      <Text adjustsFontSizeToFit style={[styles.headerText, styleHooks.headerText]}>
        {loc.settings.encrypt_tstorage}
      </Text>
      <ListItem
        testID="EncyptedAndPasswordProtected"
        hideChevron
        title={loc.settings.encrypt_enc_and_pass}
        Component={TouchableWithoutFeedback}
        switch={{ onValueChange: onEncryptStorageSwitch, value: storageIsEncryptedSwitchEnabled }}
      />
      {storageIsEncryptedSwitchEnabled && (
        <ListItem
          onPress={navigateToPlausibleDeniability}
          title={loc.settings.plausible_deniability}
          chevron
          testID="PlausibleDeniabilityButton"
          Component={TouchableOpacity}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  paddingTop: { paddingTop: 19 },
  headerText: {
    fontWeight: 'bold',
    fontSize: 30,
    marginLeft: 17,
  },
});

export default EncryptStorage;
