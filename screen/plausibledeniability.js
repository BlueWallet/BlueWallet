/* global alert */
import React, { Component } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { BlueLoading, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle, BlueSpacing20 } from '../BlueComponents';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import loc from '../loc';
import { BlueStorageContext } from '../blue_modules/storage-context';
const prompt = require('../blue_modules/prompt');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default class PlausibleDeniability extends Component {
  static contextType = BlueStorageContext;

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
                const p1 = await prompt(loc.plausibledeniability.create_password, loc.plausibledeniability.create_password_explanation);
                const isPasswordInUse = p1 === this.context.cachedPassword || (await this.context.isPasswordInUse(p1));
                if (isPasswordInUse) {
                  ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
                  return alert(loc.plausibledeniability.password_should_not_match);
                }
                if (!p1) {
                  return;
                }
                const p2 = await prompt(loc.plausibledeniability.retype_password);
                if (p1 !== p2) {
                  ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
                  return alert(loc.plausibledeniability.passwords_do_not_match);
                }

                await this.context.createFakeStorage(p1);
                await this.context.resetWallets();
                ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
                alert(loc.plausibledeniability.success);
                this.props.navigation.popToTop();
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
    popToTop: PropTypes.func,
  }),
};

PlausibleDeniability.navigationOptions = ({ navigation, route }) => ({
  ...BlueNavigationStyle(),
  title: loc.plausibledeniability.title,
});
