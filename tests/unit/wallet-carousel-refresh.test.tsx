import React from 'react';
import assert from 'assert';
import { SectionList } from 'react-native';
import { render } from '@testing-library/react-native';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import WalletsCarousel, { walletHasPendingTransaction } from '../../components/WalletsCarousel';
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
    balance: 0,
    latestTransactionTime: 1,
    transactions: [] as any[],
    label: 'Test Wallet',
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

describe('walletHasPendingTransaction', () => {
  it('detects pending on-chain txs via confirmations === 0', () => {
    assert.strictEqual(walletHasPendingTransaction(makeWallet({ transactions: [{ confirmations: 1 }] })), false);
    assert.strictEqual(walletHasPendingTransaction(makeWallet({ transactions: [{ confirmations: 0 }] })), true);
  });

  it('treats unpaid Lightning Ark swaps as pending, but not failed ones', () => {
    assert.strictEqual(
      walletHasPendingTransaction(makeWallet({ type: LightningArkWallet.type, transactions: [{ ispaid: false, failed: false }] })),
      true,
    );
    assert.strictEqual(
      walletHasPendingTransaction(makeWallet({ type: LightningArkWallet.type, transactions: [{ ispaid: false, failed: true }] })),
      false,
    );
  });

  it('treats unpaid Lightning Custodian invoices as pending, but not failed ones', () => {
    assert.strictEqual(
      walletHasPendingTransaction(
        makeWallet({ type: LightningCustodianWallet.type, transactions: [{ ispaid: false, failed: false }] }),
      ),
      true,
    );
    assert.strictEqual(
      walletHasPendingTransaction(makeWallet({ type: LightningCustodianWallet.type, transactions: [{ ispaid: false, failed: true }] })),
      false,
    );
  });
});

describe('wallet carousel refresh publish', () => {
  it('stays stale after in-place mutation until wallets are re-published', () => {
    // Production only updates when saveToDisk → setWallets([...]) re-renders consumers.
    const wallet = makeWallet({ balance: 100_000_000, latestTransactionTime: Date.now() });
    const onPress = jest.fn();
    const data = [wallet];

    const screen = render(<WalletsCarousel data={data} onPress={onPress} animateChanges={true} />);
    assert.ok(screen.getByText('1 BTC'));

    wallet.balance = 250_000_000;
    // No re-render / no new array — UI must remain frozen.
    assert.ok(screen.getByText('1 BTC'));
    assert.strictEqual(screen.queryByText('2.5 BTC'), null);

    screen.rerender(<WalletsCarousel data={[wallet]} onPress={onPress} animateChanges={true} />);
    assert.ok(screen.getByText('2.5 BTC'));
    assert.strictEqual(screen.queryByText('1 BTC'), null);
  });

  it('updates balance and pending footer when wallets are re-published (production animateChanges path)', () => {
    const wallet = makeWallet({
      balance: 100_000_000,
      latestTransactionTime: Date.now(),
      transactions: [{ confirmations: 1 }],
    });
    const onPress = jest.fn();

    const screen = render(<WalletsCarousel data={[wallet]} onPress={onPress} animateChanges={true} />);
    assert.ok(screen.getByText('1 BTC'));
    assert.strictEqual(screen.queryByText(loc.transactions.pending), null);

    wallet.balance = 250_000_000;
    wallet.transactions = [{ confirmations: 0 }];
    screen.rerender(<WalletsCarousel data={[wallet]} onPress={onPress} animateChanges={true} />);

    assert.ok(screen.getByText('2.5 BTC'));
    assert.ok(screen.getByText(loc.transactions.pending));
    assert.strictEqual(screen.queryByText('1 BTC'), null);
  });

  it('updates label, preferred unit, and hideBalance after re-publish', () => {
    const wallet = makeWallet({
      balance: 100_000_000,
      latestTransactionTime: Date.now(),
      label: 'Old Label',
      preferredBalanceUnit: 'BTC',
      hideBalance: false,
    });
    const onPress = jest.fn();

    const screen = render(<WalletsCarousel data={[wallet]} onPress={onPress} animateChanges={true} />);
    assert.ok(screen.getByText('Old Label'));
    assert.ok(screen.getByText('1 BTC'));

    wallet.label = 'New Label';
    wallet.preferredBalanceUnit = 'sats';
    screen.rerender(<WalletsCarousel data={[wallet]} onPress={onPress} animateChanges={true} />);

    assert.ok(screen.getByText('New Label'));
    assert.ok(screen.getByText(formatBalance(100_000_000, 'sats', true)));
    assert.strictEqual(screen.queryByText('Old Label'), null);
    assert.strictEqual(screen.queryByText('1 BTC'), null);

    wallet.hideBalance = true;
    screen.rerender(<WalletsCarousel data={[wallet]} onPress={onPress} animateChanges={true} />);
    assert.strictEqual(screen.queryByText(formatBalance(100_000_000, 'sats', true)), null);
  });

  it('updates drawer-style non-FlatList carousel when wallets are re-published', () => {
    // Mirrors DrawerList: isFlatList={false}, horizontal={false}, animateChanges.
    const wallet = makeWallet({ balance: 100_000_000, latestTransactionTime: Date.now() });
    const onPress = jest.fn();

    const screen = render(
      <WalletsCarousel data={[wallet]} onPress={onPress} isFlatList={false} horizontal={false} animateChanges={true} />,
    );
    assert.ok(screen.getByText('1 BTC'));

    wallet.balance = 250_000_000;
    screen.rerender(
      <WalletsCarousel data={[wallet]} onPress={onPress} isFlatList={false} horizontal={false} animateChanges={true} />,
    );

    assert.ok(screen.getByText('2.5 BTC'));
    assert.strictEqual(screen.queryByText('1 BTC'), null);
  });

  it('updates carousel inside SectionList when extraData wallets array is republished', () => {
    // Mirrors WalletsList: carousel section data is a static string; extraData={wallets} forces the row to refresh.
    const wallet = makeWallet({ balance: 100_000_000, latestTransactionTime: Date.now() });
    const onPress = jest.fn();
    const sections = [{ key: 'CAROUSEL', data: ['CAROUSEL'] }];

    let wallets: TWallet[] = [wallet];
    const renderScreen = () => (
      <SectionList
        sections={sections}
        extraData={wallets}
        keyExtractor={item => String(item)}
        renderItem={() => <WalletsCarousel data={wallets} onPress={onPress} animateChanges={true} />}
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
});
