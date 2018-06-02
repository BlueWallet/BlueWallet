/* global alert */
import React, { Component } from 'react';
import { ScrollView, View, Picker } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Icon, FormValidationMessage } from 'react-native-elements';
import {
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueHeader,
} from '../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../BlueApp');
let prompt = require('../prompt');
let loc = require('../loc');

export default class Settings extends Component {
  static navigationOptions = {
    tabBarLabel: loc.settings.tabBarLabel,
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-settings' : 'ios-settings-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
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
        <BlueHeader
          backgroundColor={BlueApp.settings.brandingColor}
          leftComponent={
            <Icon
              name="menu"
              color={BlueApp.settings.foregroundColor}
              onPress={() => this.props.navigation.navigate('DrawerToggle')}
            />
          }
          centerComponent={{
            text: loc.settings.header,
            style: { color: BlueApp.settings.foregroundColor, fontSize: 23 },
          }}
        />

        <BlueCard>
          <ScrollView maxHeight={450}>
            <BlueSpacing20 />
            {(() => {
              if (this.state.storageIsEncrypted) {
                return (
                  <View>
                    <BlueText>{loc.settings.storage_encrypted}</BlueText>
                    <BlueButton
                      onPress={() =>
                        this.props.navigation.navigate('PlausibleDeniability')
                      }
                      title={loc.settings.plausible_deniability}
                    />
                  </View>
                );
              } else {
                return (
                  <View>
                    <FormValidationMessage>
                      {loc.settings.storage_not_encrypted}
                    </FormValidationMessage>
                    <BlueButton
                      icon={{ name: 'shield', type: 'octicon' }}
                      onPress={async () => {
                        this.setState({ isLoading: true });
                        let p1 = await prompt(
                          loc.settings.password,
                          loc.settings.password_explain,
                        );
                        if (!p1) {
                          this.setState({ isLoading: false });
                          return;
                        }
                        let p2 = await prompt(
                          loc.settings.password,
                          loc.settings.retype_password,
                        );
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

            <BlueButton
              onPress={() => this.props.navigation.navigate('About')}
              title={loc.settings.about}
            />
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
            <Picker.Item
              color={BlueApp.settings.foregroundColor}
              label="English"
              value="en"
            />
            <Picker.Item
              color={BlueApp.settings.foregroundColor}
              label="Русский"
              value="ru"
            />
            <Picker.Item
              color={BlueApp.settings.foregroundColor}
              label="Українська"
              value="ua"
            />
            <Picker.Item
              color={BlueApp.settings.foregroundColor}
              label="Spanish"
              value="es"
            />
            <Picker.Item
              color={BlueApp.settings.foregroundColor}
              label="Portuguese"
              value="pt"
            />
          </Picker>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

Settings.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
