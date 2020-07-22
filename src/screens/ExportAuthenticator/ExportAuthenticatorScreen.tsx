import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { connect } from 'react-redux';

import { Header, ScreenTemplate, Mnemonic } from 'app/components';
import { Authenticator, MainCardStackNavigatorParams, Route } from 'app/consts';
import { ApplicationState } from 'app/state';
import { selectors } from 'app/state/authenticators';
import { AuthenticatorsState } from 'app/state/authenticators/reducer';
import { typography } from 'app/styles';

const i18n = require('../../../loc');

interface MapStateProps {
  authenticator?: Authenticator;
}

interface Props extends MapStateProps {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.ExportAuthenticator>;
  route: RouteProp<MainCardStackNavigatorParams, Route.ExportAuthenticator>;
}

class ExportAuthenticatorScreen extends Component<Props> {
  render() {
    const { authenticator, navigation } = this.props;

    return (
      <ScreenTemplate header={<Header navigation={navigation} isBackArrow title={i18n.authenticators.export.title} />}>
        <Text style={styles.subtitle}>{i18n.wallets.exportWallet.title}</Text>
        <View style={styles.qrCodeContainer}>
          {authenticator && <QRCode quietZone={10} value={authenticator.QRCode} size={140} ecl={'H'} />}
        </View>
        {authenticator && <Mnemonic mnemonic={authenticator.secret} />}
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

export default connect(mapStateToProps)(ExportAuthenticatorScreen);

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 12,
    ...typography.headline4,
    textAlign: 'center',
  },
  qrCodeContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
