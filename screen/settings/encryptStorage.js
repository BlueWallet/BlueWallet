/* global alert */
import React, { Component } from 'react';
import { View } from 'react-native';
import { FormValidationMessage } from 'react-native-elements';
import { BlueLoading, BlueSpacing20, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let prompt = require('../../prompt');
let loc = require('../../loc');

export default class EncryptStorage extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.encrypt_storage,
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
          {(() => {
            if (this.state.storageIsEncrypted) {
              return (
                <View>
                  <BlueText>{loc.settings.storage_encrypted}</BlueText>
                  <BlueSpacing20 />
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
                  <BlueSpacing20 />
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
                        p1 = undefined;
                      });
                      if (!p1) {
                        this.setState({ isLoading: false });
                        return;
                      }
                      let p2 = await prompt(loc.settings.password, loc.settings.retype_password).catch(() => {
                        this.setState({ isLoading: false });
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
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

EncryptStorage.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
