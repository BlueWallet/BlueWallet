import React, { Component } from 'react';
import { Picker } from 'react-native';
import { BlueLoading, SafeBlueArea, BlueCard, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class Language extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.language,
  });

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
        <BlueCard>
          <Picker
            selectedValue={this.state.language}
            onValueChange={(itemValue, itemIndex) => {
              console.log('setLanguage', itemValue);
              loc.setLanguage(itemValue);
              loc.saveLanguage(itemValue);
              return this.setState({ language: itemValue });
            }}
          >
            <Picker.Item color={BlueApp.settings.foregroundColor} label="English" value="en" />
            <Picker.Item color={BlueApp.settings.foregroundColor} label="Русский" value="ru" />
            <Picker.Item color={BlueApp.settings.foregroundColor} label="Українська" value="ua" />
            <Picker.Item color={BlueApp.settings.foregroundColor} label="Spanish" value="es" />
            <Picker.Item color={BlueApp.settings.foregroundColor} label="Portuguese (BR)" value="pt_br" />
            <Picker.Item color={BlueApp.settings.foregroundColor} label="Portuguese (PT)" value="pt_pt" />
            <Picker.Item color={BlueApp.settings.foregroundColor} label="Deutsch (DE)" value="de_de" />
          </Picker>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

Language.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
