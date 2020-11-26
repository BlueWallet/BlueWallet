import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, Button, Mnemonic } from 'app/components';
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
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.CreateAuthenticatorSuccess>;
  route: RouteProp<MainCardStackNavigatorParams, Route.CreateAuthenticatorSuccess>;
}
class CreateAuthenticatorSuccessScreen extends Component<Props> {
  componentDidMount() {
    preventScreenshots();
  }

  componentWillUnmount() {
    allowScreenshots();
  }

  navigate = () => {
    const { navigation } = this.props;
    navigation.navigate(Route.AuthenticatorList);
  };

  render() {
    const { authenticator } = this.props;

    if (!authenticator) {
      return null;
    }
    return (
      <ScreenTemplate
        footer={<Button onPress={this.navigate} title={i18n.wallets.addSuccess.okButton} />}
        header={<Header isBackArrow={false} title={i18n.authenticators.add.title} />}
      >
        <Text style={styles.subtitle}>{i18n.authenticators.add.successTitle}</Text>
        <Text style={styles.description}>{i18n.authenticators.add.successDescription}</Text>
        <Mnemonic mnemonic={authenticator.secret} />
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

export default connect(mapStateToProps)(CreateAuthenticatorSuccessScreen);

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
});
