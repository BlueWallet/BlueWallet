import assert from 'assert';

import { resolveTransactionListIconVariant } from '../../components/icons/TransactionListIcon';

describe('resolveTransactionListIconVariant', () => {
  it('pending refill uses the pending icon', () => {
    assert.strictEqual(
      resolveTransactionListIconVariant({
        item: { type: 'bitcoind_tx', value: 1000 },
        arkRowKind: 'Refill',
        isPendingRefill: true,
      }),
      'pending',
    );
  });

  it('settled refill uses the refill icon', () => {
    assert.strictEqual(
      resolveTransactionListIconVariant({
        item: { type: 'bitcoind_tx', value: 1000 },
        arkRowKind: 'Refill',
        isPendingRefill: false,
      }),
      'refill',
    );
  });

  it('Ark Lightning legs use badged lightning icons', () => {
    assert.strictEqual(
      resolveTransactionListIconVariant({
        item: { type: 'bitcoind_tx', value: -500 },
        arkRowKind: 'Lightning',
        isPendingRefill: false,
      }),
      'lightning-outgoing',
    );
    assert.strictEqual(
      resolveTransactionListIconVariant({
        item: { type: 'bitcoind_tx', value: 500 },
        arkRowKind: 'Lightning',
        isPendingRefill: false,
      }),
      'lightning-incoming',
    );
  });

  it('plain bitcoind_tx without Ark context uses the onchain icon', () => {
    assert.strictEqual(
      resolveTransactionListIconVariant({
        item: { type: 'bitcoind_tx', value: 1000, confirmations: 6 },
        isPendingRefill: false,
      }),
      'onchain',
    );
  });
});
