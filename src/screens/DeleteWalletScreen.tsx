import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';
import { useNavigationParam } from 'react-navigation-hooks';

import { Button, Header, ScreenTemplate } from 'app/components';
import { Wallet } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { BlueApp } from 'app/legacy';
import i18n from 'app/locale';
import { NavigationService } from 'app/services';
import { typography, palette } from 'app/styles';

export const DeleteWalletScreen = (props: NavigationScreenProps) => {
  const wallet: Wallet = useNavigationParam('wallet');

  const onNoButtonPress = () => props.navigation.goBack();

  const onYesButtonPress = async () => {
    BlueApp.deleteWallet(wallet);
    await BlueApp.saveToDisk();
    CreateMessage({
      title: i18n.message.success,
      description: i18n.message.successfullWalletDelete,
      type: MessageType.success,
      buttonProps: {
        title: i18n.message.returnToDashboard,
        onPress: () => NavigationService.navigateWithReset('MainCardStackNavigator'),
      },
    });
  };

  return (
    <ScreenTemplate
      footer={
        <View style={styles.buttonContainer}>
          <Button
            title={i18n.wallets.deleteWallet.no}
            onPress={onNoButtonPress}
            type="outline"
            containerStyle={styles.noButton}
          />
          <Button title={i18n.wallets.deleteWallet.yes} onPress={onYesButtonPress} containerStyle={styles.yesButton} />
        </View>
      }
    >
      <Text style={styles.title}>{i18n.wallets.deleteWallet.title}</Text>
      <Text style={styles.description}>
        {i18n.wallets.deleteWallet.description1} {wallet.label}
        {i18n.wallets.deleteWallet.description2}
      </Text>
    </ScreenTemplate>
  );
};

DeleteWalletScreen.navigationOptions = () => ({
  header: <Header title={i18n.wallets.deleteWallet.header} />,
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
