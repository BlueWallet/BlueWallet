import assert from 'assert';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import { getWalletCarouselItemDataRevision, walletHasPendingTransaction } from '../../components/WalletsCarousel';
import { TWallet } from '../../class/wallets/types';

type MutableWallet = TWallet & {
  balance: number;
  latestTransactionTime: number;
  label: string;
  preferredBalanceUnit: string;
  transactions: any[];
};

const wallet = (partial: Partial<MutableWallet> = {}): MutableWallet => {
  const w = {
    type: 'HDsegwitBech32',
    hideBalance: false,
    balance: 0,
    latestTransactionTime: 0,
    label: 'Wallet',
    preferredBalanceUnit: 'BTC',
    transactions: [] as any[],
    ...partial,
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

describe('wallet carousel data revision', () => {
  it('changes when balance is mutated in place', () => {
    const w = wallet({ balance: 1000 });
    const before = getWalletCarouselItemDataRevision(w);
    w.balance = 2500;
    assert.notStrictEqual(before, getWalletCarouselItemDataRevision(w));
  });

  it('changes when latest transaction time is mutated in place', () => {
    const w = wallet({ latestTransactionTime: 100 });
    const before = getWalletCarouselItemDataRevision(w);
    w.latestTransactionTime = 200;
    assert.notStrictEqual(before, getWalletCarouselItemDataRevision(w));
  });

  it('changes when label, hideBalance, or preferred unit change', () => {
    const w = wallet();
    const base = getWalletCarouselItemDataRevision(w);

    w.label = 'Renamed';
    assert.notStrictEqual(base, getWalletCarouselItemDataRevision(w));

    const afterLabel = getWalletCarouselItemDataRevision(w);
    w.hideBalance = true;
    assert.notStrictEqual(afterLabel, getWalletCarouselItemDataRevision(w));

    const afterHide = getWalletCarouselItemDataRevision(w);
    w.preferredBalanceUnit = 'sats';
    assert.notStrictEqual(afterHide, getWalletCarouselItemDataRevision(w));
  });

  it('detects pending on-chain txs via confirmations === 0', () => {
    const w = wallet({ transactions: [{ confirmations: 1 }] });
    assert.strictEqual(walletHasPendingTransaction(w), false);
    w.transactions = [{ confirmations: 0 }];
    assert.strictEqual(walletHasPendingTransaction(w), true);
    assert.notStrictEqual(
      getWalletCarouselItemDataRevision(wallet({ transactions: [{ confirmations: 1 }] })),
      getWalletCarouselItemDataRevision(w),
    );
  });

  it('treats unpaid Lightning/Ark swaps as pending, but not failed ones', () => {
    const pending = wallet({
      type: LightningArkWallet.type,
      transactions: [{ ispaid: false, failed: false }],
    });
    assert.strictEqual(walletHasPendingTransaction(pending), true);

    const failed = wallet({
      type: LightningArkWallet.type,
      transactions: [{ ispaid: false, failed: true }],
    });
    assert.strictEqual(walletHasPendingTransaction(failed), false);
    assert.notStrictEqual(getWalletCarouselItemDataRevision(pending), getWalletCarouselItemDataRevision(failed));
  });
});
