import assert from 'assert';

import { isOnChainTransaction, resolveTxDisplayState } from '../../blue_modules/transactionDisplayState';

describe('transactionDisplayState', () => {
  describe('isOnChainTransaction', () => {
    it('is true only when a non-empty hash string is present', () => {
      assert.strictEqual(isOnChainTransaction({ hash: 'abc123' }), true);
      assert.strictEqual(isOnChainTransaction({ hash: '' }), false);
      assert.strictEqual(isOnChainTransaction({ txid: 'ark-deadbeef' }), false);
      assert.strictEqual(isOnChainTransaction({}), false);
      assert.strictEqual(isOnChainTransaction(null), false);
      assert.strictEqual(isOnChainTransaction(undefined), false);
    });
  });

  describe('resolveTxDisplayState — on-chain (real hash present)', () => {
    it('confirmed receive → received', () => {
      assert.strictEqual(resolveTxDisplayState({ hash: 'ab', confirmations: 3, value: 1000 }), 'received');
    });
    it('confirmed send → sent', () => {
      assert.strictEqual(resolveTxDisplayState({ hash: 'ab', confirmations: 6, value: -1000 }), 'sent');
    });
    it('zero confirmations → pending', () => {
      assert.strictEqual(resolveTxDisplayState({ hash: 'ab', confirmations: 0, value: -1000 }), 'pending');
    });
    it('missing confirmations → pending (matches the !confirmations fallback)', () => {
      assert.strictEqual(resolveTxDisplayState({ hash: 'ab', value: 500 }), 'pending');
    });
  });

  describe('resolveTxDisplayState — off-chain Ark/Lightning (no hash)', () => {
    it('native Ark receive (bitcoind_tx, positive) → received', () => {
      assert.strictEqual(resolveTxDisplayState({ txid: 'ark-deadbeef', type: 'bitcoind_tx', value: 5000 }), 'received');
    });
    it('native Ark send (bitcoind_tx, negative) → sent', () => {
      assert.strictEqual(resolveTxDisplayState({ txid: 'ark-deadbeef', type: 'bitcoind_tx', value: -5000 }), 'sent');
    });
    it('refill (boarding-, positive) → received', () => {
      assert.strictEqual(resolveTxDisplayState({ txid: 'boarding-deadbeef', type: 'bitcoind_tx', value: 5000 }), 'received');
    });
    it('pending refill (boarding-utxo-, positive) → pending (parity with the list)', () => {
      assert.strictEqual(resolveTxDisplayState({ txid: 'boarding-utxo-deadbeef:0', type: 'bitcoind_tx', value: 5000 }), 'pending');
    });
    it('a native Ark leg (ark-) is never pending, even with no confirmations field', () => {
      assert.notStrictEqual(resolveTxDisplayState({ txid: 'ark-x', type: 'bitcoind_tx', value: 1 }), 'pending');
    });
    it('a settled refill (boarding-) is a confirmed receive, not pending', () => {
      assert.strictEqual(resolveTxDisplayState({ txid: 'boarding-deadbeef', type: 'bitcoind_tx', value: 5000 }), 'received');
    });
  });

  describe('resolveTxDisplayState — defensive invoice rows (route to LNDViewInvoice today)', () => {
    it('paid_invoice → sent', () => {
      assert.strictEqual(resolveTxDisplayState({ type: 'paid_invoice', value: -5000 }), 'sent');
    });
    it('unpaid user_invoice → pending', () => {
      assert.strictEqual(resolveTxDisplayState({ type: 'user_invoice', ispaid: false, value: 5000 }), 'pending');
    });
    it('paid user_invoice → received', () => {
      assert.strictEqual(resolveTxDisplayState({ type: 'user_invoice', ispaid: true, value: 5000 }), 'received');
    });
    it('unpaid payment_request → pending', () => {
      assert.strictEqual(resolveTxDisplayState({ type: 'payment_request', ispaid: false, value: 5000 }), 'pending');
    });
  });
});
