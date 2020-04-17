import React, { Component } from 'react';
import { View, Text, StyleSheet, InteractionManager, ScrollView, RefreshControl } from 'react-native';
import { NavigationEvents, NavigationInjectedProps } from 'react-navigation';

import { images } from 'app/assets';
import { ListEmptyState, Image } from 'app/components';
import { Wallet, Route } from 'app/consts';
import { en } from 'app/locale';
import { typography, palette } from 'app/styles';

import BlueApp from '../../../BlueApp';
import EV from '../../../events';
import { DashboardHeader } from './DashboardHeader';
import { WalletsCarousel } from './WalletsCarousel';

const BlueElectrum = require('../../../BlueElectrum');

interface State {
  wallets: Array<Wallet>;
  isLoading: boolean;
  isFlatListRefreshControlHidden: boolean;
  lastSnappedTo: number;
  dataSource: any;
}

type Props = NavigationInjectedProps;

export class DashboardScreen extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isLoading: true,
      isFlatListRefreshControlHidden: true,
      wallets: BlueApp.getWallets(),
      lastSnappedTo: 0,
      dataSource: null,
    };

    EV(EV.enum.WALLETS_COUNT_CHANGED, this.redrawScreen.bind(this));

    // here, when we receive TRANSACTIONS_COUNT_CHANGED we do not query
    // remote server, we just redraw the screen
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED, this.redrawScreen.bind(this));
  }
  walletCarouselRef = React.createRef();

  componentDidMount() {
    this.redrawScreen();
    // the idea is that upon wallet launch we will refresh
    // all balances and all transactions here:
    InteractionManager.runAfterInteractions(async () => {
      let noErr = true;
      try {
        await BlueElectrum.waitTillConnected();
        const balanceStart = +new Date();
        await BlueApp.fetchWalletBalances();
        const balanceEnd = +new Date();
        console.log('fetch all wallet balances took', (balanceEnd - balanceStart) / 1000, 'sec');
        const start = +new Date();
        await BlueApp.fetchWalletTransactions();
        const end = +new Date();
        console.log('fetch all wallet txs took', (end - start) / 1000, 'sec');
      } catch (_) {
        noErr = false;
      }
      if (noErr) this.redrawScreen();
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

          this.redrawScreen();
        });
      },
    );
  }

  redrawScreen() {
    console.log('wallets/list redrawScreen()');

    this.setState({
      isLoading: false,
      isFlatListRefreshControlHidden: true,
      dataSource: BlueApp.getTransactions(null, 10),
      wallets: BlueApp.getWallets(),
    });
  }

  chooseItemFromModal = async (index: number) => {
    this.setState({ lastSnappedTo: index });
    this.walletCarouselRef!.current.snap(index);
  };

  onSnapToItem = async (index: number) => {
    this.setState({ lastSnappedTo: index });

    // now, lets try to fetch balance and txs for this wallet in case it has changed
    this.lazyRefreshWallet(index);
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
          this.redrawScreen();
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
          this.redrawScreen();
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
    const { wallets, lastSnappedTo } = this.state;
    const activeWallet = wallets[lastSnappedTo] as Wallet;
    this.props.navigation.navigate('SendDetails', {
      fromAddress: activeWallet.address,
      fromSecret: activeWallet.secret,
      fromWallet: activeWallet,
    });
  };

  receiveCoins = () => {
    const { wallets, lastSnappedTo } = this.state;
    const activeWallet = wallets[lastSnappedTo];
    this.props.navigation.navigate('ReceiveDetails', {
      secret: activeWallet.secret,
    });
  };

  showModal = () => {
    const { wallets, lastSnappedTo } = this.state;
    this.props.navigation.navigate('ActionSheet', {
      wallets: wallets,
      selectedIndex: lastSnappedTo,
      onPress: this.chooseItemFromModal,
    });
  };

  render() {
    const { wallets, lastSnappedTo, isLoading } = this.state;
    const activeWallet = wallets[lastSnappedTo];
    if (isLoading) {
      return <View />;
    }

    if (wallets.length) {
      return (
        <ScrollView
          refreshControl={
            <RefreshControl
              onRefresh={() => this.refreshTransactions()}
              refreshing={!this.state.isFlatListRefreshControlHidden}
            />
          }>
          <NavigationEvents
            onWillFocus={() => {
              this.redrawScreen();
            }}
          />
          <DashboardHeader
            onSelectPress={this.showModal}
            balance={activeWallet.balance}
            label={activeWallet.label}
            unit={activeWallet.preferredBalanceUnit}
            onReceivePress={this.receiveCoins}
            onSendPress={this.sendCoins}
          />
          <WalletsCarousel
            ref={this.walletCarouselRef as any}
            data={wallets}
            keyExtractor={this._keyExtractor as as}
            onSnapToItem={index => {
              this.onSnapToItem(index);
            }}
          />
          {!activeWallet.transactions.length && (
            <View style={styles.noTransactionsContainer}>
              <Image source={images.noTransactions} style={styles.noTransactionsImage} />
              <Text style={styles.noTransactionsLabel}>{en.dashboard.noTransactions}</Text>
            </View>
          )}
        </ScrollView>
      );
    }
    return (
      <ListEmptyState
        variant={ListEmptyState.Variant.Dashboard}
        onPress={() => this.props.navigation.navigate(Route.AddWallet)}
      />
    );
  }
}

const styles = StyleSheet.create({
  noTransactionsContainer: {
    alignItems: 'center',
  },
  noTransactionsImage: { height: 167, width: 167, marginVertical: 30 },
  noTransactionsLabel: {
    ...typography.caption,
    color: palette.textGrey,
  },
});
