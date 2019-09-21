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
    };
  }

  async componentDidMount() {
    let advancedModeEnabled = !!(await AsyncStorage.getItem(AppStorage.ADVANCED_MODE_ENABLED));
    this.setState({
      isLoading: false,
      advancedModeEnabled,
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

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <BlueHeaderDefaultSub leftText={loc.settings.header} rightComponent={null} />
        <ScrollView maxHeight={450}>
          <TouchableOpacity onPress={() => this.props.navigation.navigate('EncryptStorage')}>
            <BlueListItem title={loc.settings.encrypt_storage} />
          </TouchableOpacity>
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
