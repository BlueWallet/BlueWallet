import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, ScrollView, Alert, TouchableOpacity, TouchableWithoutFeedback, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { BlueLoading, BlueSpacing20, BlueCard, BlueText } from '../../BlueComponents';
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
  const [isLoading, setIsLoading] = useState(true);
  const [biometrics, setBiometrics] = useState({ isDeviceBiometricCapable: false, isBiometricsEnabled: false, biometricsType: '' });
  const [storageIsEncryptedSwitchEnabled, setStorageIsEncryptedSwitchEnabled] = useState(false);
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
    const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
    const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
    const biometricsType = (await Biometric.biometricType()) || loc.settings.biometrics;
    const isStorageEncryptedSwitchEnabled = await isStorageEncrypted();
    setStorageIsEncryptedSwitchEnabled(isStorageEncryptedSwitchEnabled);
    setBiometrics({ isBiometricsEnabled, isDeviceBiometricCapable, biometricsType });
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

  return isLoading ? (
    <ScrollView centerContent>
      <BlueLoading />
    </ScrollView>
  ) : (
    <ScrollView contentContainerStyle={styles.root} automaticallyAdjustContentInsets contentInsetAdjustmentBehavior="automatic">
      <View style={styles.paddingTop} />
      {biometrics.isDeviceBiometricCapable && (
        <>
          <Text adjustsFontSizeToFit style={[styles.headerText, styleHooks.headerText]}>
            {loc.settings.biometrics}
          </Text>
          <ListItem
            title={loc.formatString(loc.settings.encrypt_use, { type: biometrics.biometricsType })}
            Component={TouchableWithoutFeedback}
            switch={{ value: biometrics.isBiometricsEnabled, onValueChange: onUseBiometricSwitch }}
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
EncryptStorage.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.settings.encrypt_title }));
