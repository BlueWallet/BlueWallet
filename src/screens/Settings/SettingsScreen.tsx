import AsyncStorage from '@react-native-community/async-storage';
import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';

import { images, icons } from 'app/assets';
import { Image, ScreenTemplate, Header, ListItem } from 'app/components';
import { Route } from 'app/consts';
import { AppStorage, Biometric } from 'app/legacy';
import i18n from 'app/locale';

import { LabeledSettingsRow } from './LabeledSettingsRow';

export const SettingsScreen = (props: NavigationScreenProps) => {
  const { navigation } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancedOptions, setIsAdvancedOptions] = useState(false);
  const [biometrics, setBiometrics] = useState({
    isDeviceBiometricCapable: false,
    isBiometricsEnabled: false,
    biometricsType: '',
  });

  const navigateToElectrumServer = () => navigation.navigate(Route.ElectrumServer);

  const navigateToAboutUs = () => navigation.navigate(Route.AboutUs);

  const navigateToSelectLanguage = () => navigation.navigate(Route.SelectLanguage);

  const onAdvancedOptionsChange = async (value: boolean) => {
    if (value) {
      await AsyncStorage.setItem(AppStorage.ADVANCED_MODE_ENABLED, '1');
    } else {
      await AsyncStorage.removeItem(AppStorage.ADVANCED_MODE_ENABLED);
    }
    setIsAdvancedOptions(value);
  };

  const onFingerprintLoginChange = async (value: boolean) => {
    if (await Biometric.unlockWithBiometrics()) {
      biometrics.isBiometricsEnabled = value;
      await Biometric.setBiometricUseEnabled(value);
      setBiometrics(biometrics);
    }
  };

  useEffect(() => {
    (async () => {
      setIsAdvancedOptions(!!(await AsyncStorage.getItem(AppStorage.ADVANCED_MODE_ENABLED)));
      const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
      const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
      const biometricsType = (await Biometric.biometricType()) || 'biometrics';
      setBiometrics({
        isBiometricsEnabled,
        isDeviceBiometricCapable,
        biometricsType,
      });
      setIsLoading(false);
    })();
  });

  const renderGeneralSettings = () => (
    <>
      <ListItem onPress={navigateToSelectLanguage} title={i18n.settings.language} source={icons.languageIcon} />
      <ListItem onPress={navigateToElectrumServer} title={i18n.settings.electrumServer} source={icons.dataUsageIcon} />
      <ListItem
        title={i18n.settings.advancedOptions}
        source={icons.buildIcon}
        switchValue={isAdvancedOptions}
        onSwitchValueChange={onAdvancedOptionsChange}
        iconHeight={21}
        iconWidth={20}
      />
    </>
  );

  const renderSecuritySettings = () => (
    <>
      {/**
       * Commented as it's not yet implemented.
       * It will be implemented in next scope.
       *  <ListItem title={i18n.settings.changePin} source={icons.lockIcon} iconWidth={15} iconHeight={20} />
       */}
      <ListItem
        title={i18n.settings.fingerprintLogin}
        source={icons.fingerprintIcon}
        switchValue={biometrics.isBiometricsEnabled}
        onSwitchValueChange={onFingerprintLoginChange}
        iconWidth={17}
        iconHeight={19}
      />
    </>
  );

  const renderAboutSettings = () => (
    <ListItem onPress={navigateToAboutUs} title={i18n.settings.aboutUs} source={icons.infoIcon} />
  );

  return isLoading ? null : (
    <ScreenTemplate>
      <Image source={images.goldWalletLogoBlack} style={styles.logo} resizeMode="contain" />
      <LabeledSettingsRow label={i18n.settings.general}>{renderGeneralSettings()}</LabeledSettingsRow>
      <LabeledSettingsRow label={i18n.settings.security}>{renderSecuritySettings()}</LabeledSettingsRow>
      <LabeledSettingsRow label={i18n.settings.about}>{renderAboutSettings()}</LabeledSettingsRow>
    </ScreenTemplate>
  );
};

SettingsScreen.navigationOptions = (props: NavigationScreenProps) => ({
  header: <Header navigation={props.navigation} title={i18n.settings.header} />,
});

const styles = StyleSheet.create({
  logo: {
    height: 82,
    width: '100%',
    paddingTop: 3,
  },
});
