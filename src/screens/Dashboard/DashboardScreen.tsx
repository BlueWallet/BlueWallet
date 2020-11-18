import { StackNavigationProp } from '@react-navigation/stack';
import React, { Component } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, SectionList } from 'react-native';
import { connect } from 'react-redux';

import { ListEmptyState, WalletCard, ScreenTemplate, Header, SearchBar, StyledText } from 'app/components';
import { Wallet, Route, EnhancedTransaction, CONST } from 'app/consts';
import { isAllWallets } from 'app/helpers/helpers';
import { ApplicationState } from 'app/state';
import { clearFilters, ClearFiltersAction } from 'app/state/filters/actions';
import * as transactionsNotesSelectors from 'app/state/transactionsNotes/selectors';
import { loadWallets, LoadWalletsAction } from 'app/state/wallets/actions';
import * as walletsSelectors from 'app/state/wallets/selectors';
import { palette } from 'app/styles';

import { DashboardContentHeader } from './DashboardContentHeader';
import { DashboardHeader } from './DashboardHeader';
import TransactionList from './TransactionList';
import { WalletsCarousel } from './WalletsCarousel';

const i18n = require('../../../loc');

interface Props {
  navigation: StackNavigationProp<any, Route.Dashboard>;
  wallets: Wallet[];
  isLoading: boolean;
  allTransactions: EnhancedTransaction[];
  transactionNotes: Record<string, string>;
  isInitialized: boolean;
  loadWallets: () => LoadWalletsAction;
  clearFilters: () => ClearFiltersAction;
  isFilteringOn?: boolean;
}

interface State {
  query: string;
  contentdHeaderHeight: number;
  lastSnappedTo: number;
}

class DashboardScreen extends Component<Props, State> {
  state: State = {
    query: '',
    contentdHeaderHeight: 0,
    lastSnappedTo: 0,
  };

  walletCarouselRef = React.createRef<WalletsCarousel>();
  transactionListRef = React.createRef<SectionList>();
  componentDidMount() {
    this.props.loadWallets();
  }

  refreshTransactions = () => {
    this.props.loadWallets();
  };

  chooseItemFromModal = (index: number) => {
    this.walletCarouselRef.current?.snap(index);
    this.setState({ lastSnappedTo: index });
  };

  _keyExtractor = (item: Wallet, index: number) => index.toString();

  getIndex = (index: number) => this.setState({ lastSnappedTo: index });

  getActiveWallet = () => {
    const { lastSnappedTo } = this.state;
    const { wallets } = this.props;
    return wallets[lastSnappedTo] || wallets[wallets.length - 1];
  };

  sendCoins = () => {
    const actionWallet = this.getActiveWallet();
    this.props.navigation.navigate(Route.SendCoins, {
      fromAddress: actionWallet.getAddress(),
      fromSecret: actionWallet.getSecret(),
      fromWallet: actionWallet,
    });
  };

  receiveCoins = () => {
    const actionWallet = this.getActiveWallet();
    this.props.navigation.navigate(Route.ReceiveCoins, {
      id: actionWallet.id,
    });
  };

  recoverCoins = () => {
    const actionWallet = this.getActiveWallet();
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

  scrollTo = (offset: number) => {
    // hack, there is no scrollTo method available on SectionList, https://github.com/facebook/react-native/issues/13151
    // @ts-ignore
    this.transactionListRef.current?._wrapperListRef._listRef.scrollToOffset({
      offset,
    });
  };

  scrollToTransactionList = () => {
    this.scrollTo(this.state.contentdHeaderHeight + 24);
  };

  resetFilters = () => {
    this.props.clearFilters();
    this.scrollTo(0);
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
              onFilterPress: this.scrollToTransactionList,
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
        <DashboardContentHeader
          onSelectPress={this.showModal}
          balance={activeWallet.balance}
          isAllWallets={isAllWallets(activeWallet)}
          label={activeWallet.label === CONST.allWallets ? i18n.wallets.dashboard.allWallets : activeWallet.label}
          type={activeWallet.type}
          typeReadable={activeWallet.typeReadable}
          incomingBalance={activeWallet.incoming_balance}
          unit={activeWallet.preferredBalanceUnit}
          onReceivePress={this.receiveCoins}
          onSendPress={this.sendCoins}
          onRecoveryPress={this.recoverCoins}
        />
        {this.hasWallets() ? (
          <WalletsCarousel
            ref={this.walletCarouselRef}
            getIndex={this.getIndex}
            data={wallets}
            keyExtractor={this._keyExtractor}
          />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <WalletCard wallet={activeWallet} showEditButton />
          </View>
        )}
      </View>
    );
  };

  getTransactions = () => {
    const { allTransactions } = this.props;

    const activeWallet = this.getActiveWallet();

    return isAllWallets(activeWallet) ? allTransactions : allTransactions.filter(t => t.walletId === activeWallet.id);
  };

  renderContent = () => {
    const { query } = this.state;
    const { isLoading } = this.props;
    const activeWallet = this.getActiveWallet();

    if (this.hasWallets()) {
      return (
        <TransactionList
          reference={this.transactionListRef}
          refreshing={isLoading}
          onRefresh={this.refreshTransactions}
          ListHeaderComponent={<>{this.renderWallets()}</>}
          search={query}
          transactions={this.getTransactions()}
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
    const { isInitialized } = this.props;

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
  wallets: walletsSelectors.allWallets(state),
  isLoading: walletsSelectors.isLoading(state),
  isInitialized: state.wallets.isInitialized,
  allTransactions: walletsSelectors.transactions(state),
  transactionNotes: transactionsNotesSelectors.transactionNotes(state),
  isFilteringOn: state.filters.isFilteringOn,
});

const mapDispatchToProps = {
  loadWallets,
  clearFilters,
};

// @ts-ignore - TODO: fix it later
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
