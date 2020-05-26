import React, { Component } from 'react';
import { View, Text, StyleSheet, InteractionManager, RefreshControl } from 'react-native';
import { NavigationInjectedProps, NavigationScreenProps } from 'react-navigation';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { ListEmptyState, Image, WalletCard, ScreenTemplate, Header } from 'app/components';
import { Wallet, Route, Transaction } from 'app/consts';
import { ApplicationState } from 'app/state';
import { typography, palette } from 'app/styles';

import { DashboarContentdHeader } from './DashboarContentdHeader';
import { DashboardHeader } from './DashboardHeader';
import { TransactionList } from './TransactionList';
import { WalletsCarousel } from './WalletsCarousel';

const i18n = require('../../../loc');

interface Props extends NavigationInjectedProps {
  wallets: Wallet[];
  transactions: Transaction[];
  isLoading: boolean;
}

interface State {
  isFlatListRefreshControlHidden: boolean;
  lastSnappedTo: number;
}

export class DashboardScreen extends Component<Props, State> {
  static navigationOptions = (props: NavigationScreenProps) => ({
    header: () => (
      <Header title={i18n.wallets.dashboard.title} addFunction={() => props.navigation.navigate(Route.CreateWallet)} />
    ),
  });
  state: State = {
    query: '',
    filters: {
      isFilteringOn: false,
    },
    contentdHeaderHeight: 0,
    isFetching: false,
    lastSnappedTo: 0,
  };

  state: State = {
    isFlatListRefreshControlHidden: true,
    lastSnappedTo: 0,
  };

  walletCarouselRef = React.createRef();

  componentDidMount() {
    SecureStorageService.getSecuredValue('pin')
      .then(() => {
        SecureStorageService.getSecuredValue('transactionPassword')
          .then(transactionPassword => {})
          .catch(error => {
            this.props.navigation.navigate(Route.CreateTransactionPassword);
          });
      })
      .catch(error => {
        this.props.navigation.navigate(Route.CreatePin);
      });
  }

  refreshTransactions() {
    if (!(this.state.lastSnappedTo < BlueApp.getWallets().length) && this.state.lastSnappedTo !== undefined) {
      // last card, nop
      console.log('last card, nop');
      return;
    }
    this.setState(
      {
        isFlatListRefreshControlHidden: false,
      },
      () => {
        InteractionManager.runAfterInteractions(async () => {
          let noErr = true;
          try {
            await BlueElectrum.ping();
            await BlueElectrum.waitTillConnected();
            const balanceStart = +new Date();
            await BlueApp.fetchWalletBalances(this.state.lastSnappedTo || 0);
            const balanceEnd = +new Date();
            console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
            const start = +new Date();
            await BlueApp.fetchWalletTransactions(this.state.lastSnappedTo || 0);
            const end = +new Date();
            console.log('fetch tx took', (end - start) / 1000, 'sec');
          } catch (err) {
            noErr = false;
            console.warn(err);
          }
          if (noErr) await BlueApp.saveToDisk(); // caching
          EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
        });
      })
      .catch(() => {
        this.props.navigation.navigate(Route.CreatePin);
      });
    this.props.loadWallets();
  }

  chooseItemFromModal = async (index: number) => {
    this.setState({ lastSnappedTo: index });
  };

  chooseItemFromModal = (index: number) => {
    this.setState({ lastSnappedTo: index });
  };

  async lazyRefreshWallet(index: number) {
    const wallets = BlueApp.getWallets();
    if (!wallets[index]) {
      return;
    }

    const oldBalance = wallets[index].getBalance();
    let noErr = true;
    let didRefresh = false;

    try {
      if (wallets && wallets[index] && wallets[index].timeToRefreshBalance()) {
        console.log('snapped to, and now its time to refresh wallet #', index);
        await wallets[index].fetchBalance();
        if (oldBalance !== wallets[index].getBalance() || wallets[index].getUnconfirmedBalance() !== 0) {
          console.log('balance changed, thus txs too');
          // balance changed, thus txs too
          await wallets[index].fetchTransactions();
          EV(EV.enum.WALLETS_COUNT_CHANGED);
          EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
          didRefresh = true;
        } else if (wallets[index].timeToRefreshTransaction()) {
          console.log(wallets[index].getLabel(), 'thinks its time to refresh TXs');
          await wallets[index].fetchTransactions();
          if (wallets[index].fetchPendingTransactions) {
            await wallets[index].fetchPendingTransactions();
          }
          if (wallets[index].fetchUserInvoices) {
            await wallets[index].fetchUserInvoices();
            await wallets[index].fetchBalance(); // chances are, paid ln invoice was processed during `fetchUserInvoices()` call and altered user's balance, so its worth fetching balance again
          }
          EV(EV.enum.WALLETS_COUNT_CHANGED);
          EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
          didRefresh = true;
        } else {
          console.log('balance not changed');
        }
      }
    } catch (Err) {
      noErr = false;
      console.warn(Err);
    }

    if (noErr && didRefresh) {
      await BlueApp.saveToDisk(); // caching
    }
  }

  _keyExtractor = (_item: Wallet, index: number) => index.toString();

  sendCoins = () => {
    const { lastSnappedTo } = this.state;
    const { wallets } = this.props;
    const activeWallet = wallets[lastSnappedTo].label === 'All wallets' ? wallets[1] : wallets[lastSnappedTo];
    this.props.navigation.navigate(Route.SendCoins, {
      fromAddress: activeWallet.getAddress(),
      fromSecret: activeWallet.getSecret(),
      fromWallet: activeWallet,
    });
  };

  receiveCoins = () => {
    const { lastSnappedTo } = this.state;
    const { wallets } = this.props;
    const activeWallet = wallets[lastSnappedTo].label === 'All wallets' ? wallets[1] : wallets[lastSnappedTo];
    this.props.navigation.navigate(Route.ReceiveCoins, {
      secret: activeWallet.getSecret(),
    });
  };

  showModal = () => {
    const { lastSnappedTo } = this.state;
    const { wallets } = this.props;
    this.props.navigation.navigate('ActionSheet', {
      wallets,
      selectedIndex: lastSnappedTo,
      onPress: this.chooseItemFromModal,
    });
  };

  renderTransactionList = () => {
    const { lastSnappedTo } = this.state;
    const { wallets, transactions } = this.props;
    const activeWallet = wallets[lastSnappedTo];
    if (activeWallet.label !== 'All wallets') {
      // eslint-disable-next-line prettier/prettier
      return activeWallet.transactions?.length ? (
        <TransactionList data={activeWallet.transactions} label={activeWallet.label} />
      ) : (
        <View style={styles.noTransactionsContainer}>
          <Image source={images.noTransactions} style={styles.noTransactionsImage} />
          <Text style={styles.noTransactionsLabel}>{i18n.wallets.dashboard.noTransactions}</Text>
        </View>
      );
    }
    return transactions.length ? (
      <TransactionList data={transactions} label={activeWallet.label} />
    ) : (
      <View style={styles.noTransactionsContainer}>
        <Image source={images.noTransactions} style={styles.noTransactionsImage} />
        <Text style={styles.noTransactionsLabel}>{i18n.wallets.dashboard.noTransactions}</Text>
      </View>
    );
  };

  render() {
    const { lastSnappedTo } = this.state;
    const { wallets, isLoading } = this.props;
    const activeWallet = wallets[lastSnappedTo];
    if (!isInitialized) {
      return (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    if (wallets.length) {
      return (
        <ScreenTemplate
          contentContainer={styles.contentContainer}
          refreshControl={
            <RefreshControl
              onRefresh={() => this.refreshTransactions()}
              refreshing={!this.state.isFlatListRefreshControlHidden}
            />
          }
        >
          <DashboardHeader
            onSelectPress={this.showModal}
            balance={activeWallet.balance}
            label={activeWallet.label}
            unit={activeWallet.preferredBalanceUnit}
            onReceivePress={this.receiveCoins}
            onSendPress={this.sendCoins}
          />
          {activeWallet.label === 'All wallets' ? (
            <WalletsCarousel
              ref={this.walletCarouselRef as any}
              data={wallets.filter(wallet => wallet.label !== 'All wallets')}
              keyExtractor={this._keyExtractor as any}
              onSnapToItem={this.onSnapToItem}
            />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <WalletCard wallet={activeWallet} showEditButton />
            </View>
            <TransactionList
              search={query}
              filters={filters}
              transactions={isAllWallets(activeWallet) ? allTransactions : transactions[activeWallet.secret] || []}
              transactionNotes={this.props.transactionNotes}
              label={activeWallet.label}
              headerHeight={this.state.contentdHeaderHeight}
            />
          </ScreenTemplate>
          {!!filters.isFilteringOn && (
            <TouchableOpacity onPress={this.resetFilters} style={styles.clearFiltersButton}>
              <StyledText title={i18n.filterTransactions.clearFilters} />
            </TouchableOpacity>
          )}
        </>
      );
    }
    return (
      <>
        <Header
          title={i18n.wallets.dashboard.title}
          addFunction={() => this.props.navigation.navigate(Route.CreateWallet)}
        />
        <ListEmptyState
          variant={ListEmptyState.Variant.Dashboard}
          onPress={() => this.props.navigation.navigate(Route.CreateWallet)}
        />
      </>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  wallets: state.wallets.wallets,
  isLoading: state.wallets.isLoading,
  transactions: state.transactions.transactionList,
});

export default connect(mapStateToProps)(DashboardScreen);

const styles = StyleSheet.create({
  loadingIndicatorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersButton: {
    height: 59,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
});
