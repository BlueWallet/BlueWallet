/* global alert */
import React, { Component } from 'react';
import { ScrollView, View, Picker } from 'react-native';
import { FormValidationMessage } from 'react-native-elements';
import { BlueLoading, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueHeaderDefaultSub } from '../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../BlueApp');
let prompt = require('../prompt');
let loc = require('../loc');

export default class Settings extends Component {
  static navigationOptions = {
    tabBarVisible: false,
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
        <BlueHeaderDefaultSub leftText={loc.settings.header} onClose={() => this.props.navigation.goBack()} />

        <BlueCard>
          <ScrollView maxHeight={450}>
            {(() => {
              if (this.state.storageIsEncrypted) {
                return (
                  <View>
                    <BlueText>{loc.settings.storage_encrypted}</BlueText>
                    <BlueButton
                      onPress={() => this.props.navigation.navigate('PlausibleDeniability')}
                      title={loc.settings.plausible_deniability}
                    />
                  </View>
                );
              } else {
                return (
                  <View>
                    <FormValidationMessage>{loc.settings.storage_not_encrypted}</FormValidationMessage>
                    <BlueButton
                      icon={{
                        name: 'shield',
                        type: 'octicon',
                        color: BlueApp.settings.buttonTextColor,
                      }}
                      onPress={async () => {
                        this.setState({ isLoading: true });
                        let p1 = await prompt(loc.settings.password, loc.settings.password_explain).catch(() => {
                          this.setState({ isLoading: false });
                          this.props.navigation.goBack();
                        });
                        if (!p1) {
                          this.setState({ isLoading: false });
                          return;
                        }
                        let p2 = await prompt(loc.settings.password, loc.settings.retype_password).catch(() => {
                          this.setState({ isLoading: false });
                          this.props.navigation.goBack();
                        });
                        if (p1 === p2) {
                          await BlueApp.encryptStorage(p1);
                          this.setState({
                            isLoading: false,
                            storageIsEncrypted: await BlueApp.storageIsEncrypted(),
                          });
                        } else {
                          this.setState({ isLoading: false });
                          alert(loc.settings.passwords_do_not_match);
                        }
                      }}
                      title={loc.settings.encrypt_storage}
                    />
                  </View>
                );
              }
            })()}

            <BlueButton onPress={() => this.props.navigation.navigate('About')} title={loc.settings.about} />
          </ScrollView>

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
            <Picker.Item color={BlueApp.settings.foregroundColor} label="Portuguese" value="pt" />
          </Picker>
        </BlueCard>
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
