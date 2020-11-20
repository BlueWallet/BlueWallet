import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { icons } from 'app/assets';
import { Image, ScreenTemplate, Header, ListItem } from 'app/components';
import { Route, MainCardStackNavigatorParams } from 'app/consts';
import { logoSource } from 'app/helpers/images';
import { BiometricService, AppStateManager } from 'app/services';
import { ApplicationState } from 'app/state';
import { updateBiometricSetting } from 'app/state/appSettings/actions';

import { LabeledSettingsRow } from './LabeledSettingsRow';

const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.Settings>;
}

export const SettingsScreen = (props: Props) => {
  const { navigation } = props;
  const { isBiometricsEnabled } = useSelector((state: ApplicationState) => ({
    isBiometricsEnabled: state.appSettings.isBiometricsEnabled,
  }));
  const [biometryTypeAvailable, setBiometryTypeAvailable] = useState(false);

  useEffect(() => {
    refreshBiometricsAvailability();
  }, [biometryTypeAvailable]);

  const dispatch = useDispatch();

  const navigateToAboutUs = () => navigation.navigate(Route.AboutUs);

  const navigateToSelectLanguage = () => navigation.navigate(Route.SelectLanguage);

  const onAdvancedOptionsChange = () => navigation.navigate(Route.AdvancedOptions);

  const onFingerprintLoginChange = async (value: boolean) => {
    dispatch(updateBiometricSetting(value));
  };

  const renderGeneralSettings = () => (
    <>
      <ListItem onPress={navigateToSelectLanguage} title={i18n.settings.language} source={icons.languageIcon} />
      <ListItem title={i18n.settings.advancedOptions} source={icons.buildIcon} onPress={onAdvancedOptionsChange} />
    </>
  );

  const goToChangePin = () => {
    navigation.navigate(Route.CurrentPin);
  };

  const refreshBiometricsAvailability = async () => {
    await BiometricService.setBiometricsAvailability();
    setBiometryTypeAvailable(BiometricService.biometryType !== undefined);
  };

  const renderSecuritySettings = () => (
    <>
      <ListItem
        title={i18n.settings.changePin}
        source={icons.lockIcon}
        iconWidth={15}
        iconHeight={20}
        onPress={goToChangePin}
      />
      {biometryTypeAvailable && (
        <ListItem
          title={i18n.settings[BiometricService.biometryType!]}
          source={icons.fingerprintIcon}
          switchValue={isBiometricsEnabled}
          onSwitchValueChange={onFingerprintLoginChange}
          iconWidth={17}
          iconHeight={19}
        />
      )}
    </>
  );

  const renderAboutSettings = () => (
    <ListItem onPress={navigateToAboutUs} title={i18n.settings.aboutUs} source={icons.infoIcon} />
  );

  return (
    <>
      <AppStateManager handleAppComesToForeground={refreshBiometricsAvailability} />
      {/*	
       // @ts-ignore */}
      <Header navigation={props.navigation} title={i18n.settings.header} />
      <ScreenTemplate>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
        <LabeledSettingsRow label={i18n.settings.general}>{renderGeneralSettings()}</LabeledSettingsRow>
        <LabeledSettingsRow label={i18n.settings.security}>{renderSecuritySettings()}</LabeledSettingsRow>
        <LabeledSettingsRow label={i18n.settings.about}>{renderAboutSettings()}</LabeledSettingsRow>
      </ScreenTemplate>
    </>
  );
};

const styles = StyleSheet.create({
  logo: {
    height: 82,
    width: '100%',
    paddingTop: 3,
  },
});
