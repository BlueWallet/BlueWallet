import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';
import { useNavigationParam } from 'react-navigation-hooks';
import { connect } from 'react-redux';

import { Button, Header, ScreenTemplate } from 'app/components';
import { Wallet, Route } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { BlueApp } from 'app/legacy';
import { NavigationService } from 'app/services';
import { loadWallets, WalletsActionType } from 'app/state/wallets/actions';
import { typography, palette } from 'app/styles';

const i18n = require('../../loc');

interface Props extends NavigationInjectedProps {
  loadWallets: () => Promise<WalletsActionType>;
}

export const DeleteWalletScreen: React.FunctionComponent<Props> = (props: Props) => {
  const wallet: Wallet = useNavigationParam('wallet');

  const onNoButtonPress = () => props.navigation.goBack();

  const onYesButtonPress = async () => {
    BlueApp.deleteWallet(wallet);
    await BlueApp.saveToDisk();
    props.loadWallets();
    CreateMessage({
      title: i18n.message.success,
      description: i18n.message.successfullWalletDelete,
      type: MessageType.success,
      buttonProps: {
        title: i18n.message.returnToDashboard,
        onPress: () => NavigationService.navigateWithReset(Route.MainCardStackNavigator),
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

// @ts-ignore
DeleteWalletScreen.navigationOptions = () => ({
  header: <Header title={i18n.wallets.deleteWallet.header} />,
});

const mapDispatchToProps = {
  loadWallets,
};

export default connect(null, mapDispatchToProps)(DeleteWalletScreen);

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
