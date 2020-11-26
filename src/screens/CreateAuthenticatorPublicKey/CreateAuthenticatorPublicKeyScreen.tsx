import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, StyleSheet } from 'react-native';
import Share from 'react-native-share';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, Button, TextAreaItem, FlatButton } from 'app/components';
import { Route, Authenticator, MainCardStackNavigatorParams } from 'app/consts';
import { preventScreenshots, allowScreenshots } from 'app/services/ScreenshotsService';
import { ApplicationState } from 'app/state';
import { selectors } from 'app/state/authenticators';
import { AuthenticatorsState } from 'app/state/authenticators/reducer';
import { palette, typography } from 'app/styles';

const i18n = require('../../../loc');

interface MapStateProps {
  authenticator?: Authenticator;
}

interface Props extends MapStateProps {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.CreateAuthenticatorPublicKey>;
  route: RouteProp<MainCardStackNavigatorParams, Route.CreateAuthenticatorPublicKey>;
}
class CreateAuthenticatorPublicKeyScreen extends Component<Props> {
  componentDidMount() {
    preventScreenshots();
  }

  componentWillUnmount() {
    allowScreenshots();
  }

  navigate = () => {
    const { navigation, authenticator } = this.props;
    if (!authenticator) {
      return;
    }
    navigation.navigate(Route.CreateAuthenticatorSuccess, { id: authenticator.id });
  };

  share = () => {
    const { authenticator } = this.props;
    Share.open({ message: authenticator?.publicKey });
  };

  render() {
    const { authenticator, navigation } = this.props;

    if (!authenticator) {
      return null;
    }

    return (
      <ScreenTemplate
        footer={<Button onPress={this.navigate} title={i18n.authenticators.publicKey.okButton} />}
        header={<Header isBackArrow={false} title={i18n.authenticators.add.title} />}
      >
        <Text style={styles.subtitle}>{i18n.authenticators.publicKey.title}</Text>
        <Text style={styles.description}>{i18n.authenticators.publicKey.subtitle}</Text>
        <TextAreaItem style={styles.textArea} value={authenticator.publicKey} editable={false} />
        <FlatButton onPress={this.share} title={i18n.receive.details.share} />
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

export default connect(mapStateToProps)(CreateAuthenticatorPublicKeyScreen);

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 12,
    marginBottom: 18,
    ...typography.headline4,
    textAlign: 'center',
  },
  description: {
    marginBottom: 20,
    color: palette.textGrey,
    ...typography.caption,
    textAlign: 'center',
  },
  textArea: {
    marginTop: 24,
    height: 130,
  },
});
