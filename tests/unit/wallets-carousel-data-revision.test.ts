import assert from 'assert';

import { getWalletCarouselItemDataRevision } from '../../components/WalletsCarousel';
import { TWallet } from '../../class/wallets/types';

const makeWallet = (overrides: Partial<{
  balance: number;
  latestTransactionTime: number;
  label: string;
  hideBalance: boolean;
  preferredBalanceUnit: string;
  type: string;
  transactions: any[];
}> = {}): TWallet => {
  const state = {
    balance: overrides.balance ?? 0,
    latestTransactionTime: overrides.latestTransactionTime ?? 0,
    label: overrides.label ?? 'Wallet',
    hideBalance: overrides.hideBalance ?? false,
    preferredBalanceUnit: overrides.preferredBalanceUnit ?? 'BTC',
    type: overrides.type ?? 'HDsegwitBech32',
    transactions: overrides.transactions ?? [],
  };

  return {
    type: state.type,
    hideBalance: state.hideBalance,
    getBalance: () => state.balance,
    getLatestTransactionTime: () => state.latestTransactionTime,
    getLabel: () => state.label,
    getPreferredBalanceUnit: () => state.preferredBalanceUnit,
    getTransactions: () => state.transactions,
    // Mutators used by tests to simulate in-place refresh updates.
    __setBalance: (balance: number) => {
      state.balance = balance;
    },
    __setLatestTransactionTime: (time: number) => {
      state.latestTransactionTime = time;
    },
    __setTransactions: (transactions: any[]) => {
      state.transactions = transactions;
    },
  } as unknown as TWallet & {
    __setBalance: (balance: number) => void;
    __setLatestTransactionTime: (time: number) => void;
    __setTransactions: (transactions: any[]) => void;
  };
};

describe('getWalletCarouselItemDataRevision', () => {
  it('changes when balance is mutated in place on the same wallet instance', () => {
    const wallet = makeWallet({ balance: 1000 }) as TWallet & { __setBalance: (n: number) => void };
    const before = getWalletCarouselItemDataRevision(wallet);

    wallet.__setBalance(2500);
    const after = getWalletCarouselItemDataRevision(wallet);

    assert.notStrictEqual(before, after);
  });

  it('changes when latest transaction time is mutated in place', () => {
    const wallet = makeWallet({ latestTransactionTime: 100 }) as TWallet & {
      __setLatestTransactionTime: (n: number) => void;
    };
    const before = getWalletCarouselItemDataRevision(wallet);

    wallet.__setLatestTransactionTime(200);
    const after = getWalletCarouselItemDataRevision(wallet);

    assert.notStrictEqual(before, after);
  });

  it('changes when pending on-chain transaction appears', () => {
    const wallet = makeWallet({ transactions: [{ confirmations: 1 }] }) as TWallet & {
      __setTransactions: (txs: any[]) => void;
    };
    const before = getWalletCarouselItemDataRevision(wallet);

    wallet.__setTransactions([{ confirmations: 0 }]);
    const after = getWalletCarouselItemDataRevision(wallet);

    assert.notStrictEqual(before, after);
  });

  it('stays stable when unrelated mutable fields are unchanged', () => {
    const wallet = makeWallet({ balance: 42, latestTransactionTime: 7 });
    assert.strictEqual(getWalletCarouselItemDataRevision(wallet), getWalletCarouselItemDataRevision(wallet));
  });
});
