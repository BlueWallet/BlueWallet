import {
  calculatePendingOnchainTransactions,
  createPendingTransactionsWatchConfiguration,
} from '../../blue_modules/pendingTransactions';
import { Chain } from '../../models/bitcoinUnits';
import type { Transaction, TWallet } from '../../class/wallets/types';

const transaction = (txid: string, value: number, confirmations?: number): Transaction =>
  ({ txid, hash: txid, value, confirmations }) as Transaction;

const wallet = (
  transactions: Transaction[],
  chain: Chain = Chain.ONCHAIN,
  hideBalance = false,
  addresses: string[] = [],
): TWallet =>
  ({
    chain,
    hideBalance,
    getTransactions: () => transactions,
    getAllExternalAddresses: () => addresses,
  }) as TWallet;

describe('calculatePendingOnchainTransactions', () => {
  it('counts unique unconfirmed on-chain transactions and totals their absolute portfolio impact', () => {
    const wallets = [
      wallet([
        transaction('incoming', 50_000, 0),
        transaction('incoming', 50_000, 0),
        transaction('outgoing', -125_000),
        transaction('confirmed', 10_000, 1),
      ]),
      wallet([transaction('offchain', 999_999, 0)], Chain.OFFCHAIN),
      wallet([transaction('hidden', 999_999, 0)], Chain.ONCHAIN, true),
    ];

    expect(calculatePendingOnchainTransactions(wallets)).toEqual({
      pendingTransactionCount: 2,
      totalPendingSats: 175_000,
    });
  });

  it('combines a transaction found in multiple wallets before calculating its amount', () => {
    const wallets = [
      wallet([transaction('local-transfer', -80_000, 0), transaction('receive', 25_000, 0)]),
      wallet([transaction('local-transfer', 75_000, 0)]),
    ];

    expect(calculatePendingOnchainTransactions(wallets)).toEqual({
      pendingTransactionCount: 2,
      totalPendingSats: 30_000,
    });
  });
});

describe('createPendingTransactionsWatchConfiguration', () => {
  it('exports stable, deduplicated Electrum script hashes for visible on-chain wallets', () => {
    const address = '1BoatSLRHtKNngkdXEeobR76b53LETtpyT';
    const configuration = createPendingTransactionsWatchConfiguration([
      wallet([], Chain.ONCHAIN, false, [address, address]),
      wallet([], Chain.OFFCHAIN, false, ['1BitcoinEaterAddressDontSendf59kuE']),
      wallet([], Chain.ONCHAIN, true, ['1BitcoinEaterAddressDontSendf59kuE']),
    ]);

    expect(configuration).toEqual({
      version: 1,
      isEnabled: true,
      scriptHashes: [expect.stringMatching(/^[0-9a-f]{64}$/)],
    });
  });

  it('exports no wallet identifiers when disabled', () => {
    expect(createPendingTransactionsWatchConfiguration([wallet([], Chain.ONCHAIN, false, ['1BoatSLRHtKNngkdXEeobR76b53LETtpyT'])], false)).toEqual({
      version: 1,
      isEnabled: false,
      scriptHashes: [],
    });
  });
});
