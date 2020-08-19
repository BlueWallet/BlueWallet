import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, SectionList } from 'react-native';
import { connect } from 'react-redux';

import { ListEmptyState, WalletCard, ScreenTemplate, Header, SearchBar, StyledText } from 'app/components';
import { Wallet, Route, Transaction, CONST } from 'app/consts';
import { isAllWallets } from 'app/helpers/helpers';
import { SecureStorageService } from 'app/services';
import { ApplicationState } from 'app/state';
import { clearFilters, ClearFiltersAction } from 'app/state/filters/actions';
import { selectors as transactionsSelectors } from 'app/state/transactions';
import { loadTransactions, TransactionsActionType } from 'app/state/transactions/actions';
import { loadWallets, WalletsActionType } from 'app/state/wallets/actions';
import { palette } from 'app/styles';

import { DashboarContentdHeader } from './DashboarContentdHeader';
import { DashboardHeader } from './DashboardHeader';
import TransactionList from './TransactionList';
import { WalletsCarousel } from './WalletsCarousel';

const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<any, Route.Dashboard>;
  wallets: Wallet[];
  transactions: Record<string, Transaction[]>;
  allTransactions: Transaction[];
  transactionNotes: Record<string, string>;
  isInitialized: boolean;
  loadWallets: () => Promise<WalletsActionType>;
  loadTransactions: (walletAddress: string) => Promise<TransactionsActionType>;
  clearFilters: () => ClearFiltersAction;
  isFilteringOn?: boolean;
}

interface State {
  isFetching: boolean;

  query: string;
  contentdHeaderHeight: number;
  lastSnappedTo: number;
}

class DashboardScreen extends Component<Props, State> {
  state: State = {
    query: '',
    contentdHeaderHeight: 0,
    isFetching: false,
    lastSnappedTo: 0,
  };

  walletCarouselRef = React.createRef<WalletsCarousel>();
  transactionListRef = React.createRef<SectionList>();
  componentDidMount() {
    SecureStorageService.getSecuredValue('pin')
      .then(() => {
        SecureStorageService.getSecuredValue('transactionPassword').catch(() => {
          this.props.navigation.navigate(Route.PasswordNavigator);
        });
      })
      .catch(() => {
        this.props.navigation.navigate(Route.CreatePin);
      });
    this.props.loadWallets();
  }

  refreshTransactions = async () => {
    this.setState({ isFetching: true });
    await this.props.loadWallets();

    this.setState({ isFetching: false });
  };

  chooseItemFromModal = (index: number) => {
    this.setState({ lastSnappedTo: index });
  };

  _keyExtractor = (item: Wallet, index: number) => index.toString();

  getActiveWallet = () => {
    const { lastSnappedTo } = this.state;
    const { wallets } = this.props;
    return wallets[lastSnappedTo] || wallets[0];
  };

  getActionWallet = () => {
    const { lastSnappedTo } = this.state;

    const { wallets } = this.props;
    return isAllWallets(wallets[lastSnappedTo] || wallets[0]) ? wallets[1] : wallets[lastSnappedTo];
  };

  sendCoins = () => {
    const actionWallet = this.getActionWallet();
    this.props.navigation.navigate(Route.SendCoins, {
      fromAddress: actionWallet.getAddress(),
      fromSecret: actionWallet.getSecret(),
      fromWallet: actionWallet,
    });
  };

  receiveCoins = () => {
    const actionWallet = this.getActionWallet();
    this.props.navigation.navigate(Route.ReceiveCoins, {
      secret: actionWallet.getSecret(),
    });
  };

  recoverCoins = () => {
    const actionWallet = this.getActionWallet();
    this.props.navigation.navigate(Route.RecoveryTransactionList, {
      wallet: actionWallet,
    });
  };

  showModal = () => {
    const { lastSnappedTo } = this.state;
    const { wallets } = this.props;
    this.props.navigation.navigate(Route.ActionSheet, {
      wallets,
      selectedIndex: lastSnappedTo,
      onPress: this.chooseItemFromModal,
    });
  };

  setQuery = (query: string) => this.setState({ query });

  scrollToTransactionList = () => {
    // hack, there is no scrollTo method available on SectionList, https://github.com/facebook/react-native/issues/13151
    // @ts-ignore
    this.transactionListRef.current?._wrapperListRef._listRef.scrollToOffset({
      offset: this.state.contentdHeaderHeight + 24,
    });
  };

  onFilterPress = () => {
    this.scrollToTransactionList();
  };

  resetFilters = () => {
    this.props.clearFilters();
    this.transactionListRef.current?.scrollRef.current?.scrollTo({
      x: 0,
      y: 1,
      animated: true,
    });
  };

  hasWallets = () => {
    const { wallets } = this.props;
    return wallets.length > 0;
  };

  renderHeader = () => {
    const { query } = this.state;

    if (this.hasWallets()) {
      return (
        <DashboardHeader
          onFilterPress={() => {
            this.props.navigation.navigate(Route.FilterTransactions, {
              onFilterPress: this.onFilterPress,
            });
          }}
          onAddPress={() => {
            this.props.navigation.navigate(Route.CreateWallet);
          }}
        >
          <SearchBar query={query} setQuery={this.setQuery} onFocus={this.scrollToTransactionList} />
        </DashboardHeader>
      );
    }
    return (
      <Header
        title={i18n.wallets.dashboard.title}
        addFunction={() => this.props.navigation.navigate(Route.CreateWallet)}
      />
    );
  };

  renderWallets = () => {
    const { wallets } = this.props;
    const activeWallet = this.getActiveWallet();

    return (
      <View
        onLayout={event => {
          const { height } = event.nativeEvent.layout;
          this.setState({
            contentdHeaderHeight: height,
          });
        }}
      >
        <DashboarContentdHeader
          onSelectPress={this.showModal}
          balance={activeWallet.balance}
          label={activeWallet.label === CONST.allWallets ? i18n.wallets.dashboard.allWallets : activeWallet.label}
          type={activeWallet.type}
          typeReadable={activeWallet.typeReadable}
          incomingBalance={activeWallet.incoming_balance}
          unit={activeWallet.preferredBalanceUnit}
          onReceivePress={this.receiveCoins}
          onSendPress={this.sendCoins}
          onRecoveryPress={this.recoverCoins}
        />
        {isAllWallets(activeWallet) ? (
          <WalletsCarousel
            ref={this.walletCarouselRef}
            data={wallets.filter(wallet => wallet.label !== CONST.allWallets)}
            keyExtractor={this._keyExtractor}
            onSnapToItem={() => {
              this.props.loadWallets();
            }}
          />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <WalletCard wallet={activeWallet} showEditButton />
          </View>
        )}
      </View>
    );
  };

  renderContent = () => {
    const { query, filters } = this.state;
    const { transactions, allTransactions } = this.props;
    const activeWallet = this.getActiveWallet();

    if (this.hasWallets()) {
      return (
        <TransactionList
          reference={this.transactionListRef}
          refreshing={this.state.isFetching}
          onRefresh={this.refreshTransactions}
          ListHeaderComponent={<>{this.renderWallets()}</>}
          search={query}
          filters={filters}
          transactions={isAllWallets(activeWallet) ? allTransactions : transactions[activeWallet.secret] || []}
          transactionNotes={this.props.transactionNotes}
          label={activeWallet.label}
          headerHeight={this.state.contentdHeaderHeight}
        />
      );
    }
    return (
      <ListEmptyState
        variant={ListEmptyState.Variant.Dashboard}
        onPress={() => this.props.navigation.navigate(Route.CreateWallet)}
      />
    );
  };

  render() {
    const { lastSnappedTo, query } = this.state;
    const { wallets, isInitialized, transactions, allTransactions } = this.props;
    const activeWallet = wallets[lastSnappedTo] || wallets[0];

    if (!isInitialized) {
      return (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }
    return (
      <>
        <ScreenTemplate noScroll contentContainer={styles.contentContainer} header={this.renderHeader()}>
          {this.renderContent()}
        </ScreenTemplate>
        {!!this.props.isFilteringOn && (
          <View style={styles.clearFiltersButtonContainer}>
            <TouchableOpacity onPress={this.resetFilters} style={styles.clearFiltersButton}>
              <StyledText title={i18n.filterTransactions.clearFilters} />
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  }
}

const mapStateToProps = (state: ApplicationState) => ({
  wallets: state.wallets.wallets,
  isInitialized: state.wallets.isInitialized,
  transactions: transactionsSelectors.transactions(state),
  allTransactions: transactionsSelectors.allTransactions(state),
  transactionNotes: state.transactions.transactionNotes,
  isFilteringOn: state.filters.isFilteringOn,
});

const mapDispatchToProps = {
  loadWallets,
  loadTransactions,
  clearFilters,
};

export default connect(mapStateToProps, mapDispatchToProps)(DashboardScreen);

const styles = StyleSheet.create({
  loadingIndicatorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersButtonContainer: {
    backgroundColor: palette.white,
  },
  clearFiltersButton: {
    height: 59,
    paddingHorizontal: 20,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
});
