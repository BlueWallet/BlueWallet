import React, { Component } from 'react';
import { AsyncStorage, ScrollView, TouchableOpacity } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueListItem } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';
/** @type {AppStorage} */
let loc = require('../../loc');

const advancedModeKey = 'ADVANCED_MODE';
export default class AdvancedMode extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: 'Advanced',
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isAdvancedOptionsEnabled: false,
    };
  }

  async componentDidMount() {
    let isAdvancedOptionsEnabled = await AsyncStorage.getItem(advancedModeKey);
    isAdvancedOptionsEnabled = JSON.parse(isAdvancedOptionsEnabled) || false;
    this.setState({
      isLoading: false,
      isAdvancedOptionsEnabled,
    });
  }

  toggleAdvancedOptions = async () => {
    const isAdvancedOptionsEnabled = this.state.isAdvancedOptionsEnabled;
    await AsyncStorage.setItem(advancedModeKey, JSON.stringify(!isAdvancedOptionsEnabled));
    this.setState({ isAdvancedOptionsEnabled: !isAdvancedOptionsEnabled });
  };

  render() {
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <ScrollView>
          <TouchableOpacity onPress={() => this.props.navigation.navigate('LightningSettings')}>
            <BlueListItem title={loc.settings.lightning_settings} />
          </TouchableOpacity>
          <TouchableOpacity onPress={this.toggleAdvancedOptions}>
            <BlueListItem
              title="Enable Advanced Options"
              rightIcon={!this.state.isAdvancedOptionsEnabled ? null : <Icon name="check" type="font-awesome" color="#0c2550" size={16} />}
              hideChevron={!this.state.isAdvancedOptionsEnabled}
            />
          </TouchableOpacity>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

AdvancedMode.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
