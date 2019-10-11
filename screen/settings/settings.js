import React, { Component } from 'react';
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
import PropTypes from 'prop-types';
import { AppStorage } from '../../class';
import Biometric from '../../class/biometrics';
const BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class Settings extends Component {
  static navigationOptions = {
    ...BlueNavigationStyle,
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      language: loc.getLanguage(),
      biometrics: { isDeviceBiometricCapable: false, isBiometricsEnabled: false },
    };
  }

  async componentDidMount() {
    const advancedModeEnabled = !!(await AsyncStorage.getItem(AppStorage.ADVANCED_MODE_ENABLED));
    const isBiometricsEnabled = await Biometric.isBiometricUseEnabled();
    const isDeviceBiometricCapable = await Biometric.isDeviceBiometricCapable();
    const biometricsType = (await Biometric.biometricType()) || 'biometrics';
    this.setState({
      isLoading: false,
      advancedModeEnabled,
      biometrics: { isBiometricsEnabled, isDeviceBiometricCapable, biometricsType },
    });
  }

  async onAdvancedModeSwitch(value) {
    if (value) {
      await AsyncStorage.setItem(AppStorage.ADVANCED_MODE_ENABLED, '1');
    } else {
      await AsyncStorage.removeItem(AppStorage.ADVANCED_MODE_ENABLED);
    }
    this.setState({ advancedModeEnabled: value });
  }

  onUseBiometricSwitch = async value => {
    let isBiometricsEnabled = this.state.biometrics;
    if (await Biometric.unlockWithBiometrics()) {
      isBiometricsEnabled.isBiometricsEnabled = value;
      await Biometric.setBiometricUseEnabled(value);
      this.setState({ biometrics: isBiometricsEnabled });
    }
  };

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueHeaderDefaultSub leftText={loc.settings.header} rightComponent={null} />
        <ScrollView>
          {BlueApp.getWallets().length > 1 && (
            <BlueListItem component={TouchableOpacity} onPress={() => this.props.navigation.navigate('DefaultView')} title="On Launch" />
          )}
          <TouchableOpacity onPress={() => this.props.navigation.navigate('EncryptStorage')}>
            <BlueListItem title={loc.settings.encrypt_storage} />
          </TouchableOpacity>
          {this.state.biometrics.isDeviceBiometricCapable && (
            <BlueListItem
              hideChevron
              title={`Use ${this.state.biometrics.biometricsType}`}
              switchButton
              onSwitch={this.onUseBiometricSwitch}
              switched={this.state.biometrics.isBiometricsEnabled}
            />
          )}
          <TouchableOpacity onPress={() => this.props.navigation.navigate('LightningSettings')}>
            <BlueListItem title={loc.settings.lightning_settings} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.props.navigation.navigate('Language')}>
            <BlueListItem title={loc.settings.language} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.props.navigation.navigate('Currency')}>
            <BlueListItem title={loc.settings.currency} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.props.navigation.navigate('ElectrumSettings')}>
            <BlueListItem title={'Electrum server'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => this.setState({ showAdvancedOptions: !this.state.showAdvancedOptions })}>
            <BlueListItem title={loc.settings.advanced_options} />
          </TouchableOpacity>
          {this.state.showAdvancedOptions && (
            <BlueCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <BlueText>{loc.settings.enable_advanced_mode}</BlueText>
                <Switch value={this.state.advancedModeEnabled} onValueChange={value => this.onAdvancedModeSwitch(value)} />
              </View>
            </BlueCard>
          )}

          <TouchableOpacity onPress={() => this.props.navigation.navigate('About')}>
            <BlueListItem title={loc.settings.about} />
          </TouchableOpacity>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

Settings.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
