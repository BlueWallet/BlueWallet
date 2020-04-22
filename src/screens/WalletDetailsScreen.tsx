import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationInjectedProps, NavigationScreenProps } from 'react-navigation';

import {
  Button,
  FlatButton,
  Header,
  ScreenTemplate,
  WalletCard,
  GenericInputItem,
  ButtonType,
  Text,
} from 'app/components';
import { Wallet, Route } from 'app/consts';
import i18n from 'app/locale';
import { palette, typography } from 'app/styles';

type Props = NavigationInjectedProps<{ wallet: Wallet }>;

export class WalletDetailsScreen extends React.PureComponent<Props> {
  static navigationOptions = (props: NavigationScreenProps<{ wallet: Wallet }>) => ({
    header: <Header navigation={props.navigation} isBackArrow title={props.navigation.getParam('wallet').label} />,
  });

  navigateToWalletExport = () => this.navigateWithWallet(Route.ExportWallet);

  navigateToWalletXpub = () => this.navigateWithWallet(Route.ExportWalletXpub);

  navigateToDeleteWallet = () => this.navigateWithWallet(Route.DeleteWallet);

  navigateWithWallet = (route: Route) =>
    this.props.navigation.navigate(route, {
      wallet: this.props.navigation.getParam('wallet'),
    });

  render() {
    const wallet = this.props.navigation.getParam('wallet');
    return (
      <ScreenTemplate
        footer={
          <>
            <Button onPress={this.navigateToWalletExport} title={i18n.wallets.details.exportWallet} />
            <Button
              onPress={this.navigateToWalletXpub}
              title={i18n.wallets.details.showWalletXPUB}
              containerStyle={styles.showWalletXPUBContainer}
            />
            <FlatButton
              onPress={this.navigateToDeleteWallet}
              title={i18n.wallets.details.deleteWallet}
              containerStyle={styles.deleteWalletButtonContainer}
              buttonType={ButtonType.Warning}
            />
          </>
        }>
        <View style={styles.walletContainer}>
          <WalletCard wallet={wallet} containerStyle={styles.walletContainerInner} />
        </View>
        <View style={styles.nameInputContainer}>
          <GenericInputItem title="" label={i18n.wallets.details.nameLabel} value={wallet.getLabel()} />
        </View>
        <View style={styles.typeContainer}>
          <Text style={styles.typeLabel}>{i18n.wallets.details.typeLabel}</Text>
          <Text style={styles.typeValue}>{wallet.typeReadable}</Text>
        </View>
      </ScreenTemplate>
    );
  }
}

export default WalletDetailsScreen;

const styles = StyleSheet.create({
  showWalletXPUBContainer: {
    marginTop: 20,
  },
  deleteWalletButtonContainer: {
    marginTop: 12,
  },
  walletContainer: {
    alignItems: 'center',
  },
  walletContainerInner: {
    height: undefined,
    width: '80%',
  },
  nameInputContainer: {
    marginTop: 32,
  },
  typeContainer: {
    marginTop: 4,
  },
  typeLabel: {
    color: palette.textGrey,
    ...typography.overline,
  },
  typeValue: {
    marginTop: 4,
    ...typography.caption,
  },
});
