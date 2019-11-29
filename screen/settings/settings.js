import React, { Component, useEffect, useState } from 'react';
import { ScrollView, View, Switch, TouchableOpacity } from 'react-native';
import {
  BlueText,
  BlueCard,
  BlueLoading,
  SafeBlueArea,
  BlueNavigationStyle,
  BlueHeaderDefaultSub,
  BlueListItem,
} from '../../BlueComponents';
import AsyncStorage from '@react-native-community/async-storage';
import { AppStorage } from '../../class';
import Biometric from '../../class/biometrics';
import { useNavigation } from 'react-navigation-hooks';
const BlueApp = require('../../BlueApp');
const loc = require('../../loc');

export const Settings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [advancedModeEnabled, setAdvancedModeEnabled] = useState(false);
  const [biometrics, setBiometrics] = useState({ isDeviceBiometricCapable: false, isBiometricsEnabled: false, biometricsType: '' });
  const { navigate } = useNavigation();

  useEffect(() => {
    (async () => {
      setAdvancedModeEnabled(!!(await AsyncStorage.getItem(AppStorage.ADVANCED_MODE_ENABLED)));
      const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
      const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
      const biometricsType = (await Biometric.biometricType()) || 'biometrics';
      setBiometrics({ isBiometricsEnabled, isDeviceBiometricCapable, biometricsType });
      setIsLoading(false);
    })();
  });

  const onAdvancedModeSwitch = async value => {
    if (value) {
      await AsyncStorage.setItem(AppStorage.ADVANCED_MODE_ENABLED, '1');
    } else {
      await AsyncStorage.removeItem(AppStorage.ADVANCED_MODE_ENABLED);
    }
    setAdvancedModeEnabled(value);
  };

  const onUseBiometricSwitch = async value => {
    let isBiometricsEnabled = biometrics;
    if (await Biometric.unlockWithBiometrics()) {
      isBiometricsEnabled.isBiometricsEnabled = value;
      await Biometric.setBiometricUseEnabled(value);
      setBiometrics(isBiometricsEnabled);
    }
  };

  const onShowAdvancedOptions = () => {
    setShowAdvancedOptions(!showAdvancedOptions);
  };

  return isLoading ? (
    <BlueLoading />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
      <BlueHeaderDefaultSub leftText={loc.settings.header} rightComponent={null} />
      <ScrollView>
        {BlueApp.getWallets().length > 1 && (
          <BlueListItem component={TouchableOpacity} onPress={() => navigate('DefaultView')} title="On Launch" />
        )}
        <BlueListItem title={loc.settings.encrypt_storage} onPress={() => navigate('EncryptStorage')} component={TouchableOpacity} />
        {biometrics.isDeviceBiometricCapable && (
          <BlueListItem
            hideChevron
            title={`Use ${biometrics.biometricsType}`}
            switchButton
            onSwitch={onUseBiometricSwitch}
            switched={biometrics.isBiometricsEnabled}
          />
        )}
        <BlueListItem title={loc.settings.lightning_settings} component={TouchableOpacity} onPress={() => navigate('LightningSettings')} />
        <BlueListItem title={loc.settings.language} component={TouchableOpacity} onPress={() => navigate('Language')} />
        <BlueListItem title={loc.settings.currency} component={TouchableOpacity} onPress={() => navigate('Currency')} />
        <BlueListItem title={'Electrum server'} component={TouchableOpacity} onPress={() => navigate('ElectrumSettings')} />
        <BlueListItem title={loc.settings.advanced_options} component={TouchableOpacity} onPress={onShowAdvancedOptions} />
        {showAdvancedOptions && (
          <BlueCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <BlueText>{loc.settings.enable_advanced_mode}</BlueText>
              <Switch value={advancedModeEnabled} onValueChange={onAdvancedModeSwitch} />
            </View>
          </BlueCard>
        )}

        <BlueListItem title={loc.settings.about} component={TouchableOpacity} onPress={() => navigate('About')} />
      </ScrollView>
    </SafeBlueArea>
  );
};

export default class SettingsContainer extends Component {
  static navigationOptions = {
    ...BlueNavigationStyle,
  };

  render() {
    return <Settings />;
  }
}
