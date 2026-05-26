import assert from 'assert';

import type { ElectrumTransaction } from '../../blue_modules/BlueElectrum';

// Issue #8093: an Electrum verbose-tx response for an *unconfirmed* (mempool)
// transaction does not carry the blockhash / confirmations / time / blocktime
// fields. Before this fix the type required them, so TypeScript would not
// detect unsafe access on a mempool tx. After the fix the four fields are
// optional and accessing them without a guard is a TS error.
const mempoolTx: ElectrumTransaction = {
  txid: '0000000000000000000000000000000000000000000000000000000000000000',
  hash: '0000000000000000000000000000000000000000000000000000000000000000',
  version: 2,
  size: 110,
  vsize: 110,
  weight: 440,
  locktime: 0,
  vin: [],
  vout: [],
};

describe('ElectrumTransaction type', () => {
  it('treats blockhash/confirmations/time/blocktime as optional for mempool txs', () => {
    assert.strictEqual(mempoolTx.blockhash, undefined);
    assert.strictEqual(mempoolTx.confirmations, undefined);
    assert.strictEqual(mempoolTx.time, undefined);
    assert.strictEqual(mempoolTx.blocktime, undefined);
  });
});
