import { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, TouchableOpacity, Linking } from 'react-native';

import { ScreenTemplate, Text, Header, Button } from 'app/components';
import { Route, CONST, MainTabNavigatorParams, RootStackParams, MainCardStackNavigatorParams } from 'app/consts';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<MainTabNavigatorParams, Route.ContactList>,
    CompositeNavigationProp<
      StackNavigationProp<RootStackParams, Route.DeleteContact>,
      StackNavigationProp<MainCardStackNavigatorParams, Route.IntegrateKey>
    >
  >;
  route: RouteProp<MainCardStackNavigatorParams, Route.IntegrateKey>;
}
export class IntegrateKeyScreen extends React.PureComponent<Props> {
  scanKey = () => {
    const {
      navigation,
      route: {
        params: { onBarCodeScan },
      },
    } = this.props;

    return navigation.navigate(Route.ScanQrCode, {
      onBarCodeScan,
    });
  };

  componentDidMount() {
    if (this.props.route.params.onBackArrow) {
      this.props.navigation?.setOptions({
        gestureEnabled: false,
      });
    }
  }

  render() {
    const {
      navigation,
      route: {
        params: { title, description, onBackArrow, withLink = true, headerTitle },
      },
    } = this.props;

    return (
      <ScreenTemplate
        footer={<Button onPress={this.scanKey} title={i18n.wallets.publicKey.scan} />}
        // @ts-ignore
        header={<Header navigation={navigation} onBackArrow={onBackArrow} isBackArrow title={headerTitle} />}
      >
        <Text style={styles.subtitle}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {withLink && (
          <TouchableOpacity
            style={styles.webGeneratorUrlWrapper}
            onPress={() => Linking.openURL(`https://${CONST.webGeneratorUrl}`)}
          >
            <Text style={[styles.webGeneratorUrl, styles.spaceBottom]}>{i18n.wallets.publicKey.webKeyGenerator}</Text>
            <Text style={styles.webGeneratorUrl}>{CONST.webGeneratorUrl}</Text>
          </TouchableOpacity>
        )}
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 12,
    marginBottom: 18,
    ...typography.headline4,
    textAlign: 'center',
  },
  spaceBottom: {
    marginBottom: 20,
  },
  description: {
    marginBottom: 52,
    color: palette.textGrey,
    ...typography.caption,
    textAlign: 'center',
  },
  webGeneratorUrl: {
    ...typography.headline5,
    textAlign: 'center',
  },
  webGeneratorUrlWrapper: {
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
});
