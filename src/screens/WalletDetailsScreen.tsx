import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';

import { Button, FlatButton, Header, ScreenTemplate, WalletCard, ButtonType, Text } from 'app/components';
import { Wallet, Route, MainCardStackNavigatorParams, RootStackParams, ActionMeta } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { BlueApp } from 'app/legacy';
import {
  updateWallet,
  UpdateWalletAction,
  deleteWallet as deleteWalletAction,
  DeleteWalletAction,
} from 'app/state/wallets/actions';
import { palette, typography } from 'app/styles';

import { WatchOnlyWallet } from '../../class';

const i18n = require('../../loc');

interface Props {
  updateWallet: (wallet: Wallet) => UpdateWalletAction;
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.WalletDetails>
  >;
  deleteWallet: (id: string, meta?: ActionMeta) => DeleteWalletAction;
  route: RouteProp<MainCardStackNavigatorParams, Route.WalletDetails>;
}

interface State {
  label: string;
}

export class WalletDetailsScreen extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    const { wallet } = props.route.params;
    this.state = {
      label: wallet.getLabel(),
    };
  }

  validationError = (value: string): string | undefined => {
    const trimmedValue = value.trim();
    const walletLabels = BlueApp.getWallets().map((wallet: Wallet) => wallet.label) || [];
    const allOtherWalletLabels = walletLabels.filter((label: string) => label !== this.state.label);
    if (allOtherWalletLabels.includes(trimmedValue)) {
      return i18n.wallets.importWallet.walletInUseValidationError;
    }
  };

  navigateToWalletExport = () => this.navigateWithWallet(Route.ExportWallet);

  navigateToWalletXpub = () => this.navigateWithWallet(Route.ExportWalletXpub);

  navigateToDeleteWallet = () => {
    const { deleteWallet, navigation } = this.props;
    const { wallet } = this.props.route.params;
    navigation.navigate(Route.DeleteEntity, {
      name: wallet.label,
      title: i18n.wallets.deleteWallet.header,
      subtitle: i18n.wallets.deleteWallet.title,

      onConfirm: () => {
        deleteWallet(wallet.id, {
          onSuccess: () => {
            CreateMessage({
              title: i18n.message.success,
              description: i18n.message.successfullWalletDelete,
              type: MessageType.success,
              buttonProps: {
                title: i18n.message.returnToDashboard,
                onPress: () => navigation.navigate(Route.Dashboard),
              },
            });
          },
        });
      },
    });
  };

  navigateWithWallet = (route: Route) =>
    this.props.navigation.navigate(route as any, {
      wallet: this.props.route.params.wallet,
    });

  setLabel = (label: string) => {
    const trimmedlabel = label.trim();
    const { wallet } = this.props.route.params;
    this.props.navigation.setParams({ wallet });
    this.setState({ label: trimmedlabel });
    wallet.setLabel(trimmedlabel);
    this.props.updateWallet(wallet);
    BlueApp.saveToDisk();
  };

  editAmount = () => {
    this.props.navigation.navigate(Route.EditText, {
      title: i18n.wallets.details.nameEdit,
      label: i18n.wallets.details.nameLabel,
      onSave: this.setLabel,
      value: this.state.label,
      validate: this.validationError,
    });
  };

  render() {
    const { wallet } = this.props.route.params;
    const isWatchOnly = wallet.type === WatchOnlyWallet.type;
    const { label } = this.state;
    return (
      <ScreenTemplate
        footer={
          <>
            {!isWatchOnly && <Button onPress={this.navigateToWalletExport} title={i18n.wallets.details.exportWallet} />}
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
        }
        header={<Header navigation={this.props.navigation} isBackArrow title={wallet.label} />}
      >
        <View style={styles.walletContainer}>
          <WalletCard wallet={wallet} containerStyle={styles.walletContainerInner} />
        </View>
        <View style={styles.nameInputContainer}>
          <View style={styles.labelInput}>
            <Text style={styles.typeLabel}>{i18n.wallets.details.nameLabel}</Text>
            <Text style={styles.label} onPress={this.editAmount}>
              {label}
            </Text>
          </View>
        </View>
        <View style={styles.typeContainer}>
          <Text style={styles.typeLabel}>{i18n.wallets.details.typeLabel}</Text>
          <Text style={styles.typeValue}>{wallet.typeReadable}</Text>
        </View>
      </ScreenTemplate>
    );
  }
}

const mapDispatchToProps = {
  updateWallet,
  deleteWallet: deleteWalletAction,
};

export default connect(null, mapDispatchToProps)(WalletDetailsScreen);

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
  labelInput: {
    width: '100%',
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  label: { ...typography.caption, color: palette.textBlack, marginTop: 6, marginBottom: 4 },
  typeValue: {
    marginTop: 4,
    ...typography.caption,
  },
});
