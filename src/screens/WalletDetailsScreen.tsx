import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { cloneDeep } from 'lodash';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { connect } from 'react-redux';

import { Button, FlatButton, Header, ScreenTemplate, WalletCard, ButtonType, Text } from 'app/components';
import { Wallet, Route, MainCardStackNavigatorParams, RootStackParams, ActionMeta, CONST } from 'app/consts';
import { maxWalletNameLength } from 'app/consts/text';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { ApplicationState } from 'app/state';
import { selectors, reducer } from 'app/state/wallets';
import {
  updateWallet as updateWalletAction,
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
  wallet?: Wallet;
  deleteWallet: (id: string, meta?: ActionMeta) => DeleteWalletAction;
  route: RouteProp<MainCardStackNavigatorParams, Route.WalletDetails>;
  walletsLabels: string[];
}

export class WalletDetailsScreen extends React.PureComponent<Props> {
  validationError = (value: string): string | undefined => {
    const trimmedValue = value.trim();
    const checkAllWallets =
      value.toLowerCase() === i18n.wallets.dashboard.allWallets.toLowerCase() || value === CONST.allWallets;
    const { walletsLabels, wallet } = this.props;
    if (!wallet) {
      return;
    }
    const allOtherWalletLabels = walletsLabels.filter((label: string) => label !== wallet.label);
    if (allOtherWalletLabels.includes(trimmedValue)) {
      return i18n.wallets.importWallet.walletInUseValidationError;
    }
    if (checkAllWallets) {
      return i18n.wallets.importWallet.allWalletsValidationError;
    }
  };

  navigateToWalletExport = () => this.navigateWithWallet(Route.ExportWallet);

  navigateToWalletXpub = () => this.navigateWithWallet(Route.ExportWalletXpub);

  navigateToDeleteWallet = () => {
    const { deleteWallet, navigation, wallet } = this.props;
    if (!wallet) {
      return;
    }
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

  navigateWithWallet = (route: Route.ExportWalletXpub | Route.ExportWallet) => {
    const { navigation, wallet } = this.props;
    if (!wallet) {
      return;
    }
    navigation.navigate(route, {
      wallet,
    });
  };

  setLabel = (label: string) => {
    const trimmedlabel = label.trim();
    const { wallet, updateWallet } = this.props;
    if (!wallet) {
      return;
    }
    const updatedWalelt = cloneDeep(wallet);
    updatedWalelt.setLabel(trimmedlabel);
    updateWallet(updatedWalelt);
  };

  editAmount = () => {
    const { wallet, navigation } = this.props;
    if (!wallet) {
      return;
    }
    navigation.navigate(Route.EditText, {
      title: i18n.wallets.details.nameEdit,
      label: i18n.wallets.details.nameLabel,
      onSave: this.setLabel,
      value: wallet.label,
      validate: this.validationError,
      maxLength: maxWalletNameLength,
    });
  };

  render() {
    const { wallet } = this.props;
    if (!wallet) {
      return null;
    }
    const isWatchOnly = wallet.type === WatchOnlyWallet.type;
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
        // @ts-ignore
        header={<Header navigation={this.props.navigation} isBackArrow title={wallet.label} />}
      >
        <View style={styles.walletContainer}>
          <WalletCard wallet={wallet} containerStyle={styles.walletContainerInner} />
        </View>
        <View style={styles.nameInputContainer}>
          <View style={styles.labelInput}>
            <Text style={styles.typeLabel}>{i18n.wallets.details.nameLabel}</Text>
            <Text style={styles.label} onPress={this.editAmount}>
              {wallet.label}
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

const mapStateToProps = (state: ApplicationState & reducer.WalletsState, props: Props) => {
  const { id } = props.route.params;
  return {
    wallet: selectors.getById(state, id),
    walletsLabels: selectors.getWalletsLabels(state),
  };
};

const mapDispatchToProps = {
  updateWallet: updateWalletAction,
  deleteWallet: deleteWalletAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(WalletDetailsScreen);

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
