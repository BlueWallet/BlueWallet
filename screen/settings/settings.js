import React, { Component } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { BlueLoading, SafeBlueArea, BlueNavigationStyle, BlueHeaderDefaultSub, BlueListItem } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
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
    this.setState({
      isLoading: false,
      storageIsEncrypted: await BlueApp.storageIsEncrypted(),
    });
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
