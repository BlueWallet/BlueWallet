/* global alert */
import React, { Component } from 'react';
import { ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Icon } from 'react-native-elements';
import {
  BlueLoading,
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
let EV = require('../events');

export default class PlausibleDeniability extends Component {
  static navigationOptions = {
    tabBarLabel: 'Plausible Deniability',
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
            text: 'Plausible Deniability',
            style: { color: '#fff', fontSize: 23 },
          }}
        />

        <BlueCard>
          <ScrollView maxHeight={450}>
            <BlueText>
              Under certain circumstances, you might be forced to disclose a
              password. To keep your coins safe, BlueWallet can create another
              encrypted storage, with a different password. Under the pressure,
              you can disclose this password to a 3rd party. If entered in
              BlueWallet, it will unlock new 'fake' storage. This will seem
              legit to a 3rd party, but will secretly keep your main storage
              with coins safe.
            </BlueText>

            <BlueText />

            <BlueText>
              New storage will be fully functional, and you can store some
              minimum amounts there so it looks more believable.
            </BlueText>

            <BlueButton
              icon={{ name: 'shield', type: 'octicon' }}
              title="Create fake encrypted storage"
              onPress={async () => {
                let p1 = await prompt(
                  'Create a password',
                  'Password for fake storage should not match password for your main storage',
                );
                if (p1 === BlueApp.cachedPassword) {
                  return alert(
                    'Password for fake storage should not match password for your main storage',
                  );
                }

                if (!p1) {
                  return;
                }

                let p2 = await prompt('Retype password');
                if (p1 !== p2) {
                  return alert('Passwords do not match, try again');
                }

                await BlueApp.createFakeStorage(p1);
                EV(EV.enum.WALLETS_COUNT_CHANGED);
                EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
                alert('Success');
                this.props.navigation.navigate('Wallets');
              }}
            />

            <BlueButton
              icon={{ name: 'arrow-left', type: 'octicon' }}
              title="Go Back"
              onPress={() => {
                this.props.navigation.goBack();
              }}
            />
          </ScrollView>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

PlausibleDeniability.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
