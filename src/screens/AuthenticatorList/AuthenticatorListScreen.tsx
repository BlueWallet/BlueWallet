import React, { Component } from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';
import { connect } from 'react-redux';

import { icons, images } from 'app/assets';
import { Header, Image, ListEmptyState, ScreenTemplate } from 'app/components';
import { Route, Authenticator, FinalizedPSBT, CONST } from 'app/consts';
import { CreateMessage, MessageType } from 'app/helpers/MessageCreator';
import { ApplicationState } from 'app/state';
import { selectors, actions } from 'app/state/authenticators';
import { palette, typography } from 'app/styles';

import { formatDate } from '../../../utils/date';

const BigNumber = require('bignumber.js');

const BlueElectrum = require('../../../BlueElectrum');
const i18n = require('../../../loc');

interface MapStateProps {
  authenticators: Authenticator[];
  isLoading: boolean;
}

interface ActionProps {
  loadAuthenticators: Function;
  signTransaction: Function;
  deleteAuthenticator: Function;
}

type Props = NavigationInjectedProps & MapStateProps & ActionProps;

class AuthenticatorListScreen extends Component<Props> {
  componentDidMount() {
    const { loadAuthenticators } = this.props;
    loadAuthenticators();
  }

  onDeletePress = (authenticator: Authenticator) => {
    const { deleteAuthenticator, navigation } = this.props;
    navigation.navigate(Route.DeleteEntity, {
      name: authenticator.name,
      title: i18n.authenticators.delete.title,
      subtitle: i18n.authenticators.delete.subtitle,
      onConfirm: () => {
        deleteAuthenticator(authenticator.id, {
          onSuccess: () => {
            CreateMessage({
              title: i18n.message.success,
              description: i18n.authenticators.delete.success,
              type: MessageType.success,
              buttonProps: {
                title: i18n.message.returnToAuthenticators,
                onPress: () => navigation.navigate(Route.AuthenticatorList),
              },
            });
          },
        });
      },
    });
  };

  getActualSatoshiPerByte = (tx: string, feeSatoshi: number) =>
    new BigNumber(feeSatoshi).dividedBy(Math.round(tx.length / 2)).toNumber();

  signTransaction = () => {
    const { navigation, signTransaction } = this.props;
    navigation.navigate(Route.ScanQrCode, {
      onBarCodeScan: (psbt: string) => {
        navigation.goBack();
        try {
          signTransaction(psbt, {
            onSuccess: ({
              finalizedPsbt: { recipients, txHex, fee },
              authenticator,
            }: {
              finalizedPsbt: FinalizedPSBT;
              authenticator: Authenticator;
            }) => {
              navigation.navigate(Route.SendCoinsConfirm, {
                fee,
                // pretending that we are sending from real wallet
                fromWallet: {
                  label: authenticator.name,
                  preferredBalanceUnit: CONST.preferredBalanceUnit,
                  broadcastTx: BlueElectrum.broadcastV2,
                },
                tx: txHex,
                recipients,
                satoshiPerByte: this.getActualSatoshiPerByte(txHex, fee),
              });
            },
            onFailure: Alert.alert,
          });
        } catch (_) {
          Alert.alert(i18n.wallets.errors.invalidQrCode);
        }
      },
    });
  };

  renderItem = ({ item }: { item: Authenticator }) => {
    const { navigation } = this.props;

    return (
      <TouchableOpacity
        style={styles.authenticatorWrapper}
        onPress={() => {
          navigation.navigate(Route.ExportAuthenticator, { id: item.id });
        }}
      >
        <View style={styles.authenticatorTopWrapper}>
          <Text style={styles.name}>{item.name}</Text>
          <TouchableOpacity style={styles.deleteWrapper} onPress={() => this.onDeletePress(item)}>
            <Text style={styles.delete}>{i18n._.delete}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.authenticatorBottomWrapper}>
          <Text style={styles.date}>
            {i18n._.created} {formatDate(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>{i18n.authenticators.list.title}</Text>
      <View style={styles.descriptionContainer}>
        <Text style={styles.buttonDescription}>{i18n.wallets.walletModal.btcv}</Text>
        <Image source={images.coin} style={styles.coinIcon} />
      </View>
      <TouchableOpacity onPress={this.signTransaction} style={styles.scanContainer}>
        <Image source={icons.scan} style={styles.scan} />
        <Text style={styles.scanText}>{i18n.authenticators.list.scan}</Text>
      </TouchableOpacity>
    </View>
  );

  renderEmptyList = () => (
    <ListEmptyState
      variant={ListEmptyState.Variant.Authenticators}
      onPress={() => this.props.navigation.navigate(Route.CreateAuthenticator)}
    />
  );

  hasAuthenticators = () => {
    const { authenticators } = this.props;
    return !!authenticators.length;
  };

  render() {
    const { navigation, authenticators, loadAuthenticators, isLoading } = this.props;

    const sortedAuthenticators = authenticators.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());

    return (
      <ScreenTemplate
        header={
          <Header
            navigation={navigation}
            isBackArrow={false}
            title={i18n.tabNavigator.authenticators}
            addFunction={() => navigation.navigate(Route.CreateAuthenticator)}
          />
        }
      >
        {this.hasAuthenticators() ? (
          <View style={styles.container}>
            {this.renderHeader()}
            <FlatList
              refreshing={isLoading}
              onRefresh={() => loadAuthenticators()}
              style={styles.list}
              data={sortedAuthenticators}
              renderItem={this.renderItem}
            />
          </View>
        ) : (
          this.renderEmptyList()
        )}
      </ScreenTemplate>
    );
  }
}

const mapStateToProps = (state: ApplicationState): MapStateProps => ({
  authenticators: selectors.list(state),
  isLoading: selectors.isLoading(state),
});

const mapDispatchToProps: ActionProps = {
  loadAuthenticators: actions.loadAuthenticators,
  deleteAuthenticator: actions.deleteAuthenticator,
  signTransaction: actions.signTransaction,
};

export default connect(mapStateToProps, mapDispatchToProps)(AuthenticatorListScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginVertical: 20,
    marginHorizontal: 5,
  },
  list: {
    paddingHorizontal: 15,
  },
  authenticatorWrapper: {
    paddingVertical: 8,
  },
  authenticatorTopWrapper: {
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: 'row',
  },
  authenticatorBottomWrapper: {
    marginTop: 4,
  },
  name: {
    ...typography.headline5,
  },
  delete: {
    ...typography.headline6,
    color: palette.textRed,
  },
  date: {
    color: palette.textGrey,
    ...typography.caption,
  },
  headerTitle: {
    textAlign: 'center',
    ...typography.headline4,
  },
  descriptionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDescription: {
    ...typography.caption,
    color: palette.textGrey,
  },
  coinIcon: {
    width: 17,
    height: 17,
    margin: 4,
  },
  scanText: {
    ...typography.headline6,
    color: palette.textSecondary,
  },
  scan: {
    width: 32,
    height: 32,
    marginBottom: 4,
  },
  scanContainer: {
    marginTop: 24,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    marginBottom: 26,
    marginTop: 20,
  },
  deleteWrapper: {
    position: 'absolute',
    padding: 15,
    top: -15,
    right: -15,
  },
});
