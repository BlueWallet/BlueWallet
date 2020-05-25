/* global alert */
import React, { Component } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { BlueLoading, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle, BlueSpacing20 } from '../BlueComponents';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { AppStorage } from '../class';
let BlueApp: AppStorage = require('../BlueApp');
let prompt = require('../prompt');
let EV = require('../events');
let loc = require('../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default class PlausibleDeniability extends Component {
  static navigationOptions = {
    ...BlueNavigationStyle(),
    title: loc.plausibledeniability.title,
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
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
        <BlueCard>
          <ScrollView maxHeight={450}>
            <BlueText>{loc.plausibledeniability.help}</BlueText>

            <BlueText />

            <BlueText>{loc.plausibledeniability.help2}</BlueText>

            <BlueSpacing20 />

            <BlueButton
              testID="CreateFakeStorageButton"
              title={loc.plausibledeniability.create_fake_storage}
              onPress={async () => {
                let p1 = await prompt(loc.plausibledeniability.create_password, loc.plausibledeniability.create_password_explanation);
                const isPasswordInUse = p1 === BlueApp.cachedPassword || (await BlueApp.isPasswordInUse(p1));
                if (isPasswordInUse) {
                  ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
                  return alert(loc.plausibledeniability.password_should_not_match);
                }
                if (!p1) {
                  return;
                }
                let p2 = await prompt(loc.plausibledeniability.retype_password);
                if (p1 !== p2) {
                  ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
                  return alert(loc.plausibledeniability.passwords_do_not_match);
                }

                await BlueApp.createFakeStorage(p1);
                EV(EV.enum.WALLETS_COUNT_CHANGED);
                EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
                ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
                alert(loc.plausibledeniability.success);
                this.props.navigation.navigate('Wallets');
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
