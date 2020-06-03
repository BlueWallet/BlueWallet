import React, { Component } from 'react';
import { View, StyleSheet, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { NavigationInjectedProps } from 'react-navigation';
import { connect } from 'react-redux';

import { images } from 'app/assets';
import { ListEmptyState, Image, WalletCard, ScreenTemplate, Header, SearchBar } from 'app/components';
import { Wallet, Route, Transaction, CONST } from 'app/consts';
import { isAllWallets } from 'app/helpers/helpers';
import { SecureStorageService } from 'app/services';
import { ApplicationState } from 'app/state';
import { loadTransactions, TransactionsActionType } from 'app/state/transactions/actions';
import { loadWallets, WalletsActionType } from 'app/state/wallets/actions';

import BlueApp from '../../../BlueApp';
import EV from '../../../events';
import { DashboarContentdHeader } from './DashboarContentdHeader';
import { DashboardHeader } from './DashboardHeader';
import { TransactionList } from './TransactionList';
import { WalletsCarousel } from './WalletsCarousel';

const i18n = require('../../../loc');

interface Props extends NavigationInjectedProps {
  wallets: Wallet[];
  transactions: Record<string, Transaction[]>;
  allTransactions: Transaction[];
  transactionNotes: Record<string, string>;
  isInitialized: boolean;
  loadWallets: () => Promise<WalletsActionType>;
  loadTransactions: (walletAddress: string) => Promise<TransactionsActionType>;
}

interface State {
  isFetching: boolean;
  query: string;
  wallets: Array<Wallet>;
  isLoading: boolean;
  isFlatListRefreshControlHidden: boolean;
  lastSnappedTo: number;
}

class DashboardScreen extends Component<Props, State> {
  // static navigationOptions = () => ({
  //   // must be dynamic, as function as language switch stops to work
  //   tabBarLabel: i18n.tabNavigator.dashboard,
  // });

  state: State = {
    isFetching: false,
    lastSnappedTo: 0,
  };

  walletCarouselRef = React.createRef();

  componentDidMount() {
    SecureStorageService.getSecuredValue('pin')
      .then(() => {
        SecureStorageService.getSecuredValue('transactionPassword').catch(() => {
          this.props.navigation.navigate(Route.CreateTransactionPassword);
        });
      })
      .catch(() => {
        this.props.navigation.navigate(Route.CreatePin);
      });
    this.props.loadWallets();
  }

  refreshTransactions = async () => {
    this.setState({ isFetching: true });
    const { lastSnappedTo } = this.state;
    const { wallets } = this.props;
    if (isAllWallets(wallets[lastSnappedTo])) {
      await this.props.loadWallets();
    } else {
      await this.props.loadTransactions(wallets[lastSnappedTo].secret);
    }
    this.setState({ isFetching: false });
  };

  chooseItemFromModal = (index: number) => {
    this.setState({ lastSnappedTo: index });
  };

  onSnapToItem = async (index: number) => {
    this.refreshWallet(index);
  };

  refreshWallet = (index: number) => {
    // TODO do not get all data eagerly
    console.log('fetch data for wallet:', index);
    this.props.loadWallets();
  };

  _keyExtractor = (item: Wallet, index: number) => index.toString();

  sendCoins = () => {
    const { lastSnappedTo } = this.state;
    const { wallets } = this.props;
    const activeWallet = isAllWallets(wallets[lastSnappedTo]) ? wallets[1] : wallets[lastSnappedTo];
    this.props.navigation.navigate(Route.SendCoins, {
      fromAddress: activeWallet.getAddress(),
      fromSecret: activeWallet.getSecret(),
      fromWallet: activeWallet,
    });
  };

  receiveCoins = () => {
    const { lastSnappedTo } = this.state;
    const { wallets } = this.props;
    const activeWallet = isAllWallets(wallets[lastSnappedTo]) ? wallets[1] : wallets[lastSnappedTo];
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

  renderTransactionList() {
    const { lastSnappedTo } = this.state;
    const { wallets, isInitialized, transactions, allTransactions } = this.props;
    const activeWallet = wallets[lastSnappedTo];

    return transactions.length ? (
      <TransactionList data={allTransactions} label={activeWallet.label as string} />
    ) : (
      <View style={styles.noTransactionsContainer}>
        <Image source={images.noTransactions} style={styles.noTransactionsImage} />
        <Text style={styles.noTransactionsLabel}>{i18n.wallets.dashboard.noTransactions}</Text>
      </View>
    );
  }

  setQuery = (query: string) => this.setState({ query });

  render() {
    const { lastSnappedTo, isLoading, query } = this.state;
    const { wallets, isInitialized, transactions, allTransactions } = this.props;

    const activeWallet = wallets[lastSnappedTo];
    if (isLoading) {
      return <View />;
    }
    if (!isInitialized) {
      return (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    if (wallets.length) {
      return (
        <>
          <DashboardHeader
            onFilterPress={() => {
              this.props.navigation.navigate(Route.FilterTransactions);
            }}
            onAddPress={() => {
              this.props.navigation.navigate(Route.CreateWallet);
            }}
          >
            <SearchBar query={query} setQuery={this.setQuery} />
          </DashboardHeader>
          <ScreenTemplate
            contentContainer={styles.contentContainer}
            refreshControl={<RefreshControl onRefresh={this.refreshTransactions} refreshing={this.state.isFetching} />}
          >
            <View
              onLayout={() => {
                this.setState({});
              }}
            >
              <NavigationEvents
                onWillFocus={() => {
                  this.redrawScreen();
                }}
              />
              <DashboarContentdHeader
                onSelectPress={this.showModal}
                balance={activeWallet.balance}
                label={activeWallet.label === CONST.allWallets ? i18n.wallets.dashboard.allWallets : activeWallet.label}
                unit={activeWallet.preferredBalanceUnit}
                onReceivePress={this.receiveCoins}
                onSendPress={this.sendCoins}
              />
              {activeWallet.label === CONST.allWallets ? (
                <WalletsCarousel
                  ref={this.walletCarouselRef as any}
                  data={wallets.filter(wallet => wallet.label !== CONST.allWallets)}
                  keyExtractor={this._keyExtractor as any}
                  onSnapToItem={(index: number) => {
                    this.onSnapToItem(index);
                  }}
                />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <WalletCard wallet={activeWallet} showEditButton />
                </View>
              )}
            </View>
            {this.renderTransactionList()}
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
  isInitialized: state.wallets.isInitialized,
  transactions: state.transactions.transactions,
  allTransactions: Object.values(state.transactions.transactions).reduce((prev, current) => [...prev, ...current], []),
  transactionNotes: state.transactions.transactionNotes,
});

const mapDispatchToProps = {
  loadWallets,
  loadTransactions,
};

export default connect(mapStateToProps, mapDispatchToProps)(DashboardScreen);

const styles = StyleSheet.create({
  loadingIndicatorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
});
