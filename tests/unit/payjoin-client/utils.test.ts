import assert from 'assert';
import * as bitcoin from 'bitcoinjs-lib';
import { getEndpointUrl, getInputIndex, getVirtualSize, ScriptPubKeyType } from '../../../blue_modules/payjoin-client';

describe('payjoin-client utils', () => {
  it('getEndpointUrl adds parameters specified', () => {
    assert.strictEqual(
      getEndpointUrl('https://gozo.com', {
        additionalFeeOutputIndex: 0,
        disableOutputSubstitution: false,
        minimumFeeRate: 1,
        payjoinVersion: 2,
        maxAdditionalFeeContribution: 2,
      }),
      'https://gozo.com/?disableoutputsubstitution=false&v=2&minfeerate=1&maxadditionalfeecontribution=2&additionalfeeoutputindex=0',
    );
    assert.strictEqual(getEndpointUrl('https://gozo.com', {}), 'https://gozo.com');
    assert.strictEqual(getEndpointUrl('https://gozo.com'), 'https://gozo.com');
  });

  it('getVirtualSize', () => {
    assert.strictEqual(getVirtualSize(ScriptPubKeyType.Legacy), 148);
    assert.strictEqual(getVirtualSize(ScriptPubKeyType.Segwit), 68);
    assert.strictEqual(getVirtualSize(ScriptPubKeyType.SegwitP2SH), 91);
    assert.strictEqual(getVirtualSize(undefined), 110);
  });

  it('getInputIndex compares Uint8Array hashes', () => {
    const psbt = new bitcoin.Psbt();
    const hash = new Uint8Array(32).fill(7);
    psbt.addInput({ hash, index: 1 });
    assert.strictEqual(getInputIndex(psbt, new Uint8Array(32).fill(7), 1), 0);
    assert.strictEqual(getInputIndex(psbt, new Uint8Array(32).fill(7), 0), -1);
    assert.strictEqual(getInputIndex(psbt, new Uint8Array(32).fill(8), 1), -1);
  });
});
