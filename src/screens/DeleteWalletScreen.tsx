import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';
import { useNavigationParam } from 'react-navigation-hooks';

import { Button, Header, ScreenTemplate } from 'app/components';
import { Wallet } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { BlueApp } from 'app/legacy';
import { en } from 'app/locale';
import { NavigationService } from 'app/services';
import { typography, palette } from 'app/styles';

export const DeleteWalletScreen = (props: NavigationScreenProps) => {
  const wallet: Wallet = useNavigationParam('wallet');

  const onNoButtonPress = () => props.navigation.goBack();

  const onYesButtonPress = async () => {
    BlueApp.deleteWallet(wallet);
    await BlueApp.saveToDisk();
    CreateMessage({
      title: en.message.success,
      description: en.message.successfullWalletDelete,
      type: MessageType.success,
      buttonProps: {
        title: en.message.returnToDashboard,
        onPress: () => NavigationService.navigateWithReset('MainCardStackNavigator'),
      },
    });
  };

  return (
    <ScreenTemplate
      footer={
        <View style={styles.buttonContainer}>
          <Button
            title={en.deleteWallet.no}
            onPress={onNoButtonPress}
            type="outline"
            containerStyle={styles.noButton}
          />
          <Button title={en.deleteWallet.yes} onPress={onYesButtonPress} containerStyle={styles.yesButton} />
        </View>
      }>
      <Text style={styles.title}>{en.deleteWallet.title}</Text>
      <Text style={styles.description}>
        {en.deleteWallet.description1} {wallet.label}
        {en.deleteWallet.description2}
      </Text>
    </ScreenTemplate>
  );
};

DeleteWalletScreen.navigationOptions = () => ({
  header: <Header title={en.deleteWallet.header} />,
});

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
