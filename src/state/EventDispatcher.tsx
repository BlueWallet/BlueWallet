import React from 'react';
import { connect } from 'react-redux';

import { Transaction, Wallet } from 'app/consts';
import { loadTransactions, LoadTransactionsAction } from 'app/state/transactions/actions';
import { loadWallets, LoadWalletsAction } from 'app/state/wallets/actions';

import BlueApp from '../../BlueApp';
import EV from '../../events';

const BlueElectrum = require('../../BlueElectrum');

interface Props {
  loadWallets: (wallets: Wallet[]) => LoadWalletsAction;
  loadTransactions: (transactions: Transaction[]) => LoadTransactionsAction;
}

export class EventDispatcher extends React.PureComponent<Props> {
  constructor(props: Props) {
    super(props);
    EV(EV.enum.WALLETS_COUNT_CHANGED, this.handleWalletCountChange);
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED, this.handleTransactionCountChange);
  }

  async componentDidMount() {
    await BlueElectrum.waitTillConnected();
    const balanceStart = +new Date();
    await BlueApp.fetchWalletBalances();
    const balanceEnd = +new Date();
    console.log('fetch all wallet balances took', (balanceEnd - balanceStart) / 1000, 'sec');
    const start = +new Date();
    await BlueApp.fetchWalletTransactions();
    const end = +new Date();
    console.log('fetch all wallet txs took', (end - start) / 1000, 'sec');

    this.forceRefresh();
  }

  forceRefresh = () => {
    EV(EV.enum.WALLETS_COUNT_CHANGED);
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
  };

  handleWalletCountChange = () => {
    const allWalletsBalance = BlueApp.getBalance();
    const allWallets = BlueApp.getWallets();
    const wallets =
      allWallets.length > 1
        ? [{ label: 'All wallets', balance: allWalletsBalance, preferredBalanceUnit: 'BTCV' }, ...allWallets]
        : allWallets;
    this.props.loadWallets(wallets);
  };

  handleTransactionCountChange = () => {
    const transactions = BlueApp.getTransactions(null, 10);
    this.props.loadTransactions(transactions);
  };

  render() {
    return null;
  }
}

const mapDispatchToProps = {
  loadWallets,
  loadTransactions,
};

export default connect(null, mapDispatchToProps)(EventDispatcher);
