import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { Text, View, StyleSheet, BackHandler, NativeEventSubscription } from 'react-native';

import { ScreenTemplate, FlatButton, Header, Button } from 'app/components';
import { Route, MainTabNavigatorParams, MainCardStackNavigatorParams } from 'app/consts';
import { palette, typography } from 'app/styles';

const i18n = require('../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<MainTabNavigatorParams, Route.AuthenticatorList>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.ChunkedQrCode>
  >;
  route: RouteProp<MainCardStackNavigatorParams, Route.ChunkedQrCode>;
}

export class ChunkedQrCode extends Component<Props> {
  backHandler?: NativeEventSubscription;

  componentDidMount() {
    this.backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    this.props.navigation.setOptions({
      gestureEnabled: false,
    });
  }

  componentWillUnmount() {
    this.backHandler && this.backHandler.remove();
  }

  goBack = () => this.props.navigation.navigate(Route.AuthenticatorList);
  render() {
    const { chunkNo, chunksQuantity, onScanned } = this.props.route.params;

    return (
      <ScreenTemplate
        header={<Header title={i18n._.scan} />}
        footer={
          <>
            <Button title={i18n.authenticators.import.scanNext} onPress={onScanned} />
            <FlatButton containerStyle={styles.cancelButton} title={i18n._.cancel} onPress={this.goBack} />
          </>
        }
      >
        <View style={styles.container}>
          <Text style={typography.headline4}> {i18n.authenticators.import.multipleQrCodesTitle} </Text>
          <Text style={styles.description}> {i18n.authenticators.import.multipleQrCodesDescription} </Text>
          <Text style={typography.headline4}>
            {i18n.authenticators.import.code} <Text style={styles.partNumber}>{`${chunkNo}/${chunksQuantity}`}</Text>
          </Text>
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  cancelButton: {
    marginTop: 12,
  },
  partNumber: {
    color: palette.secondary,
  },
  description: { ...typography.caption, textAlign: 'center', color: palette.textGrey, marginVertical: 18 },
});
