import assert from 'assert';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import { walletHasPendingTransaction } from '../../components/WalletsCarousel';
import { TWallet } from '../../class/wallets/types';

type MutableWallet = TWallet & { transactions: any[] };

const wallet = (partial: Partial<MutableWallet> = {}): MutableWallet => {
  const w = {
    type: 'HDsegwitBech32',
    hideBalance: false,
    transactions: [] as any[],
    ...partial,
    getBalance: () => 0,
    getLatestTransactionTime: () => 0,
    getLabel: () => 'Wallet',
    getPreferredBalanceUnit: () => 'BTC',
    getTransactions() {
      return this.transactions;
    },
  };
  return w as MutableWallet;
};

describe('walletHasPendingTransaction', () => {
  it('detects pending on-chain txs via confirmations === 0', () => {
    assert.strictEqual(walletHasPendingTransaction(wallet({ transactions: [{ confirmations: 1 }] })), false);
    assert.strictEqual(walletHasPendingTransaction(wallet({ transactions: [{ confirmations: 0 }] })), true);
  });

  it('treats unpaid Lightning/Ark swaps as pending, but not failed ones', () => {
    assert.strictEqual(
      walletHasPendingTransaction(wallet({ type: LightningArkWallet.type, transactions: [{ ispaid: false, failed: false }] })),
      true,
    );
    assert.strictEqual(
      walletHasPendingTransaction(wallet({ type: LightningArkWallet.type, transactions: [{ ispaid: false, failed: true }] })),
      false,
    );
  });
});
