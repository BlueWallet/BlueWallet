import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { Button, Header, ScreenTemplate } from 'app/components';
import { Route, MainCardStackNavigatorParams } from 'app/consts';
import { typography, palette } from 'app/styles';

const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<MainCardStackNavigatorParams, Route.DeleteEntity>;
  route: RouteProp<MainCardStackNavigatorParams, Route.DeleteEntity>;
}
export const DeleteEntityScreen = ({
  navigation,
  route: {
    params: { onConfirm, name, subtitle },
  },
}: Props) => (
  <ScreenTemplate
    footer={
      <View style={styles.buttonContainer}>
        <Button
          title={i18n.wallets.deleteWallet.no}
          onPress={() => navigation.goBack()}
          type="outline"
          containerStyle={styles.noButton}
        />
        <Button title={i18n.wallets.deleteWallet.yes} onPress={() => onConfirm()} containerStyle={styles.yesButton} />
      </View>
    }
  >
    <Text style={styles.title}>{subtitle}</Text>
    <Text style={styles.description}>
      {i18n.wallets.deleteWallet.description1} {name}
      {i18n.wallets.deleteWallet.description2}
    </Text>
  </ScreenTemplate>
);

DeleteEntityScreen.navigationOptions = (props: Props) => {
  const {
    route: {
      params: { title },
    },
  } = props;
  return {
    header: <Header title={title} />,
  };
};

export default DeleteEntityScreen;

const styles = StyleSheet.create({
  title: { ...typography.headline4, marginTop: 16, textAlign: 'center' },
  description: {
    ...typography.caption,
    color: palette.textGrey,
    textAlign: 'center',
    marginTop: 18,
  },
  buttonContainer: { flexDirection: 'row', width: '50%' },
  noButton: { paddingRight: 10, width: '100%' },
  yesButton: { paddingLeft: 10, width: '100%' },
});
