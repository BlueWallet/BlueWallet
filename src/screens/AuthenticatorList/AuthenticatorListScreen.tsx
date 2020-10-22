import * as bitcoin from 'bitcoinjs-lib';
import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, FlatList } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';
import { connect } from 'react-redux';

import { icons, images } from 'app/assets';
import { Header, Image, ListEmptyState, ScreenTemplate } from 'app/components';
import { Route, Authenticator, FinalizedPSBT, CONST } from 'app/consts';
import { ApplicationState } from 'app/state';
import { selectors, actions } from 'app/state/authenticators';
import { palette, typography } from 'app/styles';
import { formatDate } from 'app/utils/date';

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
}

type Props = NavigationInjectedProps & MapStateProps & ActionProps;

class AuthenticatorListScreen extends Component<Props> {
  componentDidMount() {
    const { loadAuthenticators } = this.props;
    loadAuthenticators();
  }

  getActualSatoshiPerByte = (tx: string, feeSatoshi: number) =>
    new BigNumber(feeSatoshi).dividedBy(Math.round(tx.length / 2)).toNumber();

  signTransaction = () => {
    const { navigation, signTransaction } = this.props;
    navigation.navigate(Route.ScanQrCode, {
      onBarCodeScan: (psbt: string) => {
        navigation.goBack();
        signTransaction(psbt, {
          onSuccess: ({
            finalizedPsbt: { recipients, tx, fee, vaultTxType },
            authenticator,
          }: {
            finalizedPsbt: FinalizedPSBT;
            authenticator: Authenticator;
          }) => {
            const successMsgDesc =
              vaultTxType === bitcoin.payments.VaultTxType.Recovery
                ? i18n.message.cancelTxSuccess
                : i18n.send.transaction.fastSuccess;
            navigation.navigate(Route.SendCoinsConfirm, {
              fee,
              // pretending that we are sending from real wallet
              fromWallet: {
                label: authenticator.name,
                preferredBalanceUnit: CONST.preferredBalanceUnit,
                broadcastTx: BlueElectrum.broadcast,
              },
              txDecoded: tx,
              recipients,
              successMsgDesc,
              satoshiPerByte: this.getActualSatoshiPerByte(tx.toHex(), fee),
            });
          },
          onFailure: Alert.alert,
        });
      },
    });
  };

  navigateToOptions = (id: string) => {
    const { navigation } = this.props;

    navigation.navigate(Route.OptionsAuthenticator, { id });
  };

  renderItem = ({ item }: { item: Authenticator }) => (
    <TouchableOpacity style={styles.authenticatorWrapper} onPress={() => this.navigateToOptions(item.id)}>
      <View style={styles.authenticatorLeftColumn}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.date}>
          {i18n._.created} {formatDate(item.createdAt)}
        </Text>
      </View>
      <View>
        <Image source={images.backArrow} style={styles.backArrow} />
      </View>
    </TouchableOpacity>
  );

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

  getAuthenticatorsList = () => {
    const { authenticators } = this.props;
    return authenticators.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf());
  };

  render() {
    const { navigation, loadAuthenticators, isLoading } = this.props;

    return (
      <ScreenTemplate
        noScroll={true}
        header={
          <Header
            // @ts-ignore
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
              style={styles.list}
              data={this.getAuthenticatorsList()}
              onRefresh={() => loadAuthenticators()}
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
    backgroundColor: palette.white,
    paddingVertical: 8,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  authenticatorLeftColumn: {
    flexGrow: 6,
  },
  name: {
    ...typography.headline5,
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
  backArrow: {
    width: 8,
    height: 13,
    transform: [{ rotate: '180deg' }],
  },
});
