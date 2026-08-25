import React from 'react';
import assert from 'assert';
import { render } from '@testing-library/react-native';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import WalletsCarousel, { walletHasPendingTransaction } from '../../components/WalletsCarousel';
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

describe('wallet carousel refresh publish', () => {
  it('updates card balance when wallets are re-published as a new array of the same mutated instances', () => {
    // Mirrors StorageProvider.saveToDisk: setWallets([...BlueApp.getWallets()]) after in-place fetch.
    const wallet = makeWallet({ balance: 100_000_000 });
    const onPress = jest.fn();

    const screen = render(<WalletsCarousel data={[wallet]} onPress={onPress} animateChanges={false} />);
    assert.ok(screen.getByText('1 BTC'));

    wallet.balance = 250_000_000;
    screen.rerender(<WalletsCarousel data={[wallet]} onPress={onPress} animateChanges={false} />);

    assert.ok(screen.getByText('2.5 BTC'));
    assert.strictEqual(screen.queryByText('1 BTC'), null);
  });
});
