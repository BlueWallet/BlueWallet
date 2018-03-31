/* global alert */
import React, { Component } from 'react';
import { ScrollView, View } from 'react-native';
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

export default class Settings extends Component {
  static navigationOptions = {
    tabBarLabel: 'Settings',
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
              color="#fff"
              onPress={() => this.props.navigation.navigate('DrawerToggle')}
            />
          }
          centerComponent={{
            text: 'Settings',
            style: { color: '#fff', fontSize: 25 },
          }}
        />

        <BlueCard>
          <ScrollView maxHeight={450}>
            <BlueSpacing20 />

            {(() => {
              if (this.state.storageIsEncrypted) {
                return (
                  <View>
                    <BlueText>Storage: encrypted</BlueText>
                    <BlueButton
                      onPress={() =>
                        this.props.navigation.navigate('PlausibleDeniability')
                      }
                      title="Plausible deniability..."
                    />
                  </View>
                );
              } else {
                return (
                  <View>
                    <FormValidationMessage>
                      Storage: not encrypted
                    </FormValidationMessage>
                    <BlueButton
                      icon={{ name: 'shield', type: 'octicon' }}
                      onPress={async () => {
                        this.setState({ isLoading: true });
                        let p1 = await prompt(
                          'Password',
                          'Create the password you will use to decrypt the storage',
                        );
                        if (!p1) {
                          this.setState({ isLoading: false });
                          return;
                        }
                        let p2 = await prompt(
                          'Password',
                          'Re-type the password',
                        );
                        if (p1 === p2) {
                          await BlueApp.encryptStorage(p1);
                          this.setState({
                            isLoading: false,
                            storageIsEncrypted: await BlueApp.storageIsEncrypted(),
                          });
                        } else {
                          this.setState({ isLoading: false });
                          alert('Passwords do not match. Please try again');
                        }
                      }}
                      title="Encrypt storage"
                    />
                  </View>
                );
              }
            })()}

            <BlueButton
              onPress={() => this.props.navigation.navigate('About')}
              title="About"
            />
          </ScrollView>
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
