import React, { useEffect, useState, useContext } from 'react';
import { View, ScrollView, Alert, TouchableOpacity, TouchableWithoutFeedback, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { BlueSpacing20, BlueCard, BlueText } from '../../BlueComponents';
import Biometric from '../../class/biometrics';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import presentAlert from '../../components/Alert';
import ListItem from '../../components/ListItem';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useTheme } from '../../components/themes';
const prompt = require('../../helpers/prompt');

const EncryptStorage = () => {
  const { isStorageEncrypted, encryptStorage, decryptStorage, saveToDisk } = useContext(BlueStorageContext);
  const [biometrics, setBiometrics] = useState({ isDeviceBiometricCapable: false, isBiometricsEnabled: false, biometricsType: '' });
  const [storageIsEncryptedSwitchEnabled, setStorageIsEncryptedSwitchEnabled] = useState(false);
  const { navigate, popToTop } = useNavigation();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState({ encryptStorage: false, biometrics: false });
  const styleHooks = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    headerText: {
      color: colors.foregroundColor,
    },
  });

  const initialState = async () => {
    const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
    const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
    const biometricsType = (await Biometric.biometricType()) || loc.settings.biometrics;
    const isStorageEncryptedSwitchEnabled = await isStorageEncrypted();
    setStorageIsEncryptedSwitchEnabled(isStorageEncryptedSwitchEnabled);
    setBiometrics({ isBiometricsEnabled, isDeviceBiometricCapable, biometricsType });
  };

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
    setIsLoading(prev => ({ ...prev, encryptStorage: true }));
    if (value === true) {
      let p1 = await prompt(loc.settings.password, loc.settings.password_explain).catch(() => {
        setIsLoading(prev => ({ ...prev, encryptStorage: false }));
        p1 = undefined;
      });
      if (!p1) {
        setIsLoading(prev => ({ ...prev, encryptStorage: false }));
        return;
      }
      const p2 = await prompt(loc.settings.password, loc.settings.retype_password).catch(() => {
        setIsLoading(prev => ({ ...prev, encryptStorage: false }));
      });
      if (p1 === p2) {
        await encryptStorage(p1);
        setStorageIsEncryptedSwitchEnabled(await isStorageEncrypted());
        saveToDisk();
        setIsLoading(prev => ({ ...prev, encryptStorage: false }));
      } else {
        setIsLoading(prev => ({ ...prev, encryptStorage: false }));
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
            onPress: () => setIsLoading(prev => ({ ...prev, encryptStorage: false })),
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
    setIsLoading(prev => ({ ...prev, biometrics: true }));
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
    setIsLoading(prev => ({ ...prev, biometrics: false }));
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
        <BlueText>{loc.formatString(loc.settings.biometrics_fail, { type: biometrics.biometricsType })}</BlueText>
      </>
    ) : null;
  };

  return (
    <ScrollView
      contentContainerStyle={styleHooks.root}
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
      centerContent={isLoading}
    >
      <View style={styles.paddingTop} />
      {biometrics.isDeviceBiometricCapable && (
        <>
          <Text adjustsFontSizeToFit style={[styles.headerText, styleHooks.headerText]}>
            {loc.settings.biometrics}
          </Text>
          <ListItem
            title={loc.formatString(loc.settings.encrypt_use, { type: biometrics.biometricsType })}
            Component={TouchableWithoutFeedback}
            isLoading={isLoading.biometrics}
            containerStyle={[styles.rowItemContainerStyle, styleHooks.root]}
            switch={{
              value: biometrics.isBiometricsEnabled,
              onValueChange: onUseBiometricSwitch,
              disabled: isLoading.encryptStorage || isLoading.biometrics,
            }}
          />
          <BlueCard>
            <BlueText>{loc.formatString(loc.settings.encrypt_use_expl, { type: biometrics.biometricsType })}</BlueText>
            {renderPasscodeExplanation()}
          </BlueCard>
          <BlueSpacing20 />
        </>
      )}
      <Text adjustsFontSizeToFit style={[styles.headerText, styleHooks.headerText]}>
        {loc.settings.encrypt_tstorage}
      </Text>
      <ListItem
        testID="EncryptedAndPasswordProtected"
        hideChevron
        isLoading={isLoading.encryptStorage}
        title={loc.settings.encrypt_enc_and_pass}
        Component={TouchableWithoutFeedback}
        containerStyle={[styles.rowItemContainerStyle, styleHooks.root]}
        switch={{
          onValueChange: onEncryptStorageSwitch,
          value: storageIsEncryptedSwitchEnabled,
          disabled: isLoading.encryptStorage || isLoading.biometrics,
        }}
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
  paddingTop: { paddingTop: 36 },
  headerText: {
    fontWeight: 'bold',
    fontSize: 30,
    marginLeft: 17,
  },
  rowItemContainerStyle: {
    minHeight: 60,
  },
});

export default EncryptStorage;
EncryptStorage.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.settings.encrypt_title }));
