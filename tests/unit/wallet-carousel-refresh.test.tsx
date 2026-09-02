import React from 'react';
import assert from 'assert';
import { render } from '@testing-library/react-native';

import WalletsCarousel from '../../components/WalletsCarousel';
import { TWallet } from '../../class/wallets/types';
import loc, { formatBalance } from '../../loc';

jest.mock('../../blue_modules/sizeClass', () => ({
  SizeClass: { Compact: 'Compact', Regular: 'Regular', Large: 'Large' },
  useSizeClass: () => ({ sizeClass: 'Regular', isLarge: false }),
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      background: '#000',
      shadowColor: '#000',
      inverseForegroundColor: '#fff',
      foregroundColor: '#fff',
      alternativeTextColor: '#aaa',
      brandingColor: '#000',
    },
  }),
}));

jest.mock('../../hooks/useWalletActivity', () => ({
  useWalletActivitySummary: (wallet: TWallet) => {
    const transactions = wallet.getTransactions();
    return {
      latestTransaction:
        transactions.length > 0
          ? {
              ...transactions[0],
              timestamp: new Date(wallet.getLatestTransactionTime()).getTime() / 1000,
            }
          : undefined,
      hasPendingTransaction: transactions.some((transaction: any) =>
        typeof transaction.ispaid === 'boolean' ? transaction.ispaid === false && !transaction.failed : transaction.confirmations === 0,
      ),
    };
  },
}));

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return ({ children, ...props }: any) => <View {...props}>{children}</View>;
});

jest.mock('../../class/wallet-gradient', () => ({
  __esModule: true,
  default: {
    gradientsFor: () => ['#111', '#222'],
    createWallet: () => '#333',
  },
}));

type MutableWallet = TWallet & {
  balance: number;
  latestTransactionTime: number;
  transactions: any[];
  label: string;
  preferredBalanceUnit: string;
};

const makeWallet = (partial: Partial<MutableWallet> = {}): MutableWallet => {
  const w = {
    type: 'HDsegwitBech32',
    hideBalance: false,
    balance: 100_000_000,
    latestTransactionTime: Date.now(),
    transactions: [{ confirmations: 1 }] as any[],
    label: 'Old Label',
    preferredBalanceUnit: 'BTC',
    ...partial,
    getID: () => 'wallet-1',
    getBalance() {
      return this.balance;
    },
    getLatestTransactionTime() {
      return this.latestTransactionTime;
    },
    getLabel() {
      return this.label;
    },
    getPreferredBalanceUnit() {
      return this.preferredBalanceUnit;
    },
    getTransactions() {
      return this.transactions;
    },
  };
  return w as MutableWallet;
};

describe('wallet carousel refresh publish', () => {
  it.each([
    { name: 'FlatList animateChanges', props: { animateChanges: true } },
    { name: 'FlatList default (no animateChanges)', props: {} },
    { name: 'drawer non-FlatList', props: { isFlatList: false, horizontal: false, animateChanges: true } },
  ])('stays stale until re-publish, then refreshes card fields ($name)', ({ props }) => {
    const wallet = makeWallet();
    const onPress = jest.fn();
    const screen = render(<WalletsCarousel data={[wallet]} onPress={onPress} {...props} />);

    assert.ok(screen.getByText('Old Label'));
    assert.ok(screen.getByText('1 BTC'));
    assert.strictEqual(screen.queryByText(loc.transactions.pending), null);

    wallet.balance = 250_000_000;
    assert.ok(screen.getByText('1 BTC'));
    assert.strictEqual(screen.queryByText('2.5 BTC'), null);

    wallet.transactions = [{ confirmations: 0 }];
    wallet.label = 'New Label';
    wallet.preferredBalanceUnit = 'sats';
    screen.rerender(<WalletsCarousel data={[wallet]} onPress={onPress} {...props} />);

    assert.ok(screen.getByText('New Label'));
    assert.ok(screen.getByText(formatBalance(250_000_000, 'sats', true)));
    assert.ok(screen.getByText(loc.transactions.pending));
    assert.strictEqual(screen.queryByText('Old Label'), null);
    assert.strictEqual(screen.queryByText('1 BTC'), null);

    wallet.hideBalance = true;
    screen.rerender(<WalletsCarousel data={[wallet]} onPress={onPress} {...props} />);
    assert.strictEqual(screen.queryByText(formatBalance(250_000_000, 'sats', true)), null);
  });

  it('extraData busts PureComponent row cache when section data is static', () => {
    // SectionList rows are PureComponents; WalletsList keeps carousel section data as a static string.
    let rowRenders = 0;

    class CarouselRowHost extends React.PureComponent<{ extraData?: TWallet[]; wallets: TWallet[] }> {
      render() {
        rowRenders++;
        return <WalletsCarousel data={this.props.wallets} onPress={() => {}} animateChanges />;
      }
    }

    const wallet = makeWallet();
    const wallets: TWallet[] = [wallet];
    const screen = render(<CarouselRowHost wallets={wallets} />);
    assert.ok(screen.getByText('1 BTC'));
    assert.strictEqual(rowRenders, 1);

    (wallet as MutableWallet).balance = 250_000_000;
    screen.rerender(<CarouselRowHost wallets={wallets} />);
    assert.strictEqual(rowRenders, 1);
    assert.ok(screen.getByText('1 BTC'));

    screen.rerender(<CarouselRowHost wallets={wallets} extraData={[wallet]} />);
    assert.strictEqual(rowRenders, 2);
    assert.ok(screen.getByText('2.5 BTC'));
  });

  it('does not let caller extraData clobber FlatList update signals', () => {
    const wallet = makeWallet();
    const onPress = jest.fn();
    const screen = render(<WalletsCarousel data={[wallet]} onPress={onPress} extraData="caller" animateChanges />);

    assert.ok(screen.getByText('1 BTC'));
    wallet.balance = 250_000_000;
    screen.rerender(<WalletsCarousel data={[wallet]} onPress={onPress} extraData="caller" animateChanges />);
    assert.ok(screen.getByText('2.5 BTC'));
  });
});
