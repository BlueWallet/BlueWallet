import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, Button } from 'app/components';
import { Route, Authenticator, MainCardStackNavigatorParams } from 'app/consts';
import { ApplicationState } from 'app/state';
import { selectors } from 'app/state/authenticators';
import { AuthenticatorsState } from 'app/state/authenticators/reducer';
import { palette, typography, fonts } from 'app/styles';

const i18n = require('../../../loc');

interface MapStateProps {
  authenticator?: Authenticator;
}

interface Props extends MapStateProps {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.EnterPIN>;
  route: RouteProp<MainCardStackNavigatorParams, Route.EnterPIN>;
}

class EnterPINScreen extends Component<Props> {
  navigate = () => {
    const {
      navigation,
      route: {
        params: { id },
      },
    } = this.props;
    navigation.navigate(Route.CreateAuthenticatorSuccess, { id });
  };

  renderPIN = (pin: string) => (
    <View style={styles.pinWrapper}>
      {pin.split('').map((char, index) => (
        <View style={styles.pinNumber} key={index}>
          <Text style={styles.pinNumberText}>{char}</Text>
        </View>
      ))}
    </View>
  );

  render() {
    const { authenticator, navigation } = this.props;

    return (
      <ScreenTemplate
        footer={<Button onPress={this.navigate} title={i18n.send.details.next} />}
        header={<Header navigation={navigation} isBackArrow={false} title={i18n.authenticators.add.title} />}
      >
        <Text style={styles.subtitle}>{i18n.authenticators.enterPIN.subtitle}</Text>
        <Text style={styles.description}>{i18n.authenticators.enterPIN.description}</Text>
        {authenticator && this.renderPIN(authenticator.pin)}
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState & AuthenticatorsState, props: Props): MapStateProps => {
  const { id } = props.route.params;
  return {
    authenticator: selectors.getById(state, id),
  };
};

export default connect(mapStateToProps)(EnterPINScreen);

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 12,
    marginBottom: 18,
    ...typography.headline4,
    textAlign: 'center',
  },
  description: {
    marginBottom: 52,
    color: palette.textGrey,
    ...typography.caption,
    textAlign: 'center',
  },
  pinNumber: {
    paddingBottom: 6,
    width: 40,
    margin: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  pinWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pinNumberText: {
    textAlign: 'center',
    fontFamily: fonts.ubuntu.light,
    fontSize: 24,
  },
});
