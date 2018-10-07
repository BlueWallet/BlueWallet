import React, { Component } from 'react';
import { ScrollView } from 'react-native';
import { BlueLoading, SafeBlueArea, BlueHeaderDefaultSub, BlueListItem } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class Settings extends Component {
  static navigationOptions = {
    navigationOptions: {
      headerStyle: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 0,
      },
      headerTintColor: '#0c2550',
    },
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
          <BlueListItem title={loc.settings.encrypt_storage} onPress={() => this.props.navigation.navigate('EncryptStorage')} />
          <BlueListItem title={loc.settings.currency} />
          <BlueListItem title={loc.settings.language} onPress={() => this.props.navigation.navigate('Language')} />
          <BlueListItem title={loc.settings.about} onPress={() => this.props.navigation.navigate('About')} />
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
