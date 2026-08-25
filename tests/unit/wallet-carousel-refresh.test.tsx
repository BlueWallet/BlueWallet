import React from 'react';
import assert from 'assert';
import { SectionList } from 'react-native';
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
  // One mechanism, three render paths — not five copy-paste balance asserts.
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

    // In-place mutation without a new wallets array must not repaint (saveToDisk contract).
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

  it('updates carousel inside SectionList when extraData wallets array is republished', () => {
    // WalletsList: carousel section data is a static string; extraData={wallets} forces the row to refresh.
    const wallet = makeWallet();
    const onPress = jest.fn();
    const sections = [{ key: 'CAROUSEL', data: ['CAROUSEL'] }];

    let wallets: TWallet[] = [wallet];
    const renderScreen = () => (
      <SectionList
        sections={sections}
        extraData={wallets}
        keyExtractor={item => String(item)}
        renderItem={() => <WalletsCarousel data={wallets} onPress={onPress} animateChanges />}
      />
    );

    const screen = render(renderScreen());
    assert.ok(screen.getByText('1 BTC'));

    wallet.balance = 250_000_000;
    wallets = [wallet];
    screen.rerender(renderScreen());

    assert.ok(screen.getByText('2.5 BTC'));
    assert.strictEqual(screen.queryByText('1 BTC'), null);
  });

  it('does not let caller extraData clobber FlatList update signals', () => {
    // extraData is merged after `{...props}` so a caller value cannot drop `data`.
    const wallet = makeWallet();
    const onPress = jest.fn();
    const screen = render(<WalletsCarousel data={[wallet]} onPress={onPress} extraData="caller" animateChanges />);

    assert.ok(screen.getByText('1 BTC'));
    wallet.balance = 250_000_000;
    screen.rerender(<WalletsCarousel data={[wallet]} onPress={onPress} extraData="caller" animateChanges />);
    assert.ok(screen.getByText('2.5 BTC'));
  });
});
