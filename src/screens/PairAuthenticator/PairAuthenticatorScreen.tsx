import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Share from 'react-native-share';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, FlatButton, TextAreaItem, Separator } from 'app/components';
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
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.PairAuthenticator>;
  route: RouteProp<MainCardStackNavigatorParams, Route.PairAuthenticator>;
}

class PairAuthenticatorScreen extends Component<Props> {
  share = () => {
    const { authenticator } = this.props;
    Share.open({ message: authenticator?.exportPublicKey });
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

    if (!authenticator) {
      return null;
    }
    return (
      <ScreenTemplate header={<Header navigation={navigation} isBackArrow title={i18n.authenticators.pair.title} />}>
        <View>
          <Text style={styles.subtitle}>{i18n.authenticators.pair.pin}</Text>
          <Text style={styles.description}>{i18n.authenticators.pair.descPin}</Text>
          {this.renderPIN(authenticator.pin)}
        </View>
        <Separator />
        <View style={styles.publicKeyContainer}>
          <Text style={styles.subtitle}>{i18n.authenticators.pair.publicKey}</Text>
          <Text style={styles.description}>{i18n.authenticators.pair.descPublicKey}</Text>
          <TextAreaItem value={authenticator.exportPublicKey} editable={false} style={styles.textArea} />
          <FlatButton onPress={this.share} title={i18n.receive.details.share} />
        </View>
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

export default connect(mapStateToProps)(PairAuthenticatorScreen);

const styles = StyleSheet.create({
  publicKeyContainer: {
    paddingTop: 0,
    borderColor: palette.lightGrey,
  },
  subtitle: {
    marginBottom: '4%',
    ...typography.headline4,
    textAlign: 'center',
  },
  textArea: {
    height: 130,
  },
  description: {
    marginBottom: '4%',
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
