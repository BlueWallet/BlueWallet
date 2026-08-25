import React from 'react';
import assert from 'assert';
import { render } from '@testing-library/react-native';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import { walletHasPendingTransaction, WalletCarouselItem } from '../../components/WalletsCarousel';
import { TWallet } from '../../class/wallets/types';

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
    },
  }),
}));

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return ({ children, ...props }: any) => <View {...props}>{children}</View>;
});

jest.mock('../../class/wallet-gradient', () => ({
  __esModule: true,
  default: { gradientsFor: () => ['#111', '#222'] },
}));

type MutableWallet = TWallet & {
  balance: number;
  latestTransactionTime: number;
  transactions: any[];
};

const makeWallet = (partial: Partial<MutableWallet> = {}): MutableWallet => {
  const w = {
    type: 'HDsegwitBech32',
    hideBalance: false,
    balance: 0,
    latestTransactionTime: 1,
    transactions: [] as any[],
    ...partial,
    getID: () => 'wallet-1',
    getBalance() {
      return this.balance;
    },
    getLatestTransactionTime() {
      return this.latestTransactionTime;
    },
    getLabel: () => 'Test Wallet',
    getPreferredBalanceUnit: () => 'BTC',
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

  it('treats unpaid Lightning/Ark swaps as pending, but not failed ones', () => {
    assert.strictEqual(
      walletHasPendingTransaction(makeWallet({ type: LightningArkWallet.type, transactions: [{ ispaid: false, failed: false }] })),
      true,
    );
    assert.strictEqual(
      walletHasPendingTransaction(makeWallet({ type: LightningArkWallet.type, transactions: [{ ispaid: false, failed: true }] })),
      false,
    );
  });
});

describe('WalletCarouselItem refresh publish', () => {
  it('shows updated balance after in-place mutation when parent re-renders (setWallets publish)', () => {
    const wallet = makeWallet({ balance: 100_000_000 });
    const onPress = jest.fn();

    const screen = render(<WalletCarouselItem item={wallet} hideBalance={false} onPress={onPress} animationsEnabled={false} />);
    assert.ok(screen.getByText('1 BTC'), 'initial balance should render');

    // Simulate StorageProvider refresh: mutate wallet in place, then re-publish via parent re-render
    // with the same object reference (the case React.memo previously hid).
    wallet.balance = 250_000_000;
    screen.rerender(<WalletCarouselItem item={wallet} hideBalance={false} onPress={onPress} animationsEnabled={false} />);

    assert.ok(screen.queryByText('2.5 BTC'), 'card should show post-refresh balance after parent re-render');
    assert.strictEqual(screen.queryByText('1 BTC'), null, 'stale pre-refresh balance must not remain');
  });
});
