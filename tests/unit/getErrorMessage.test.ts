import assert from 'assert';
import { getErrorMessage } from '../../blue_modules/getErrorMessage';

describe('getErrorMessage', () => {
  it('reads Error.message', () => {
    assert.strictEqual(getErrorMessage(new Error('boom')), 'boom');
  });

  it('reads plain strings', () => {
    assert.strictEqual(getErrorMessage('nope'), 'nope');
  });

  it('reads Electrum JSON-RPC rejection objects', () => {
    // electrum-client rejects with msg.error, which is `{ code, message }` — not an Error
    assert.strictEqual(
      getErrorMessage({
        code: 1,
        message: 'the transaction was rejected by network rules.\n\nbad-txns-inputs-missingorspent',
      }),
      'the transaction was rejected by network rules.\n\nbad-txns-inputs-missingorspent',
    );
  });

  it('falls back for empty / unknown values', () => {
    assert.strictEqual(getErrorMessage(null), 'Unknown error');
    assert.strictEqual(getErrorMessage(undefined), 'Unknown error');
    assert.strictEqual(getErrorMessage({}), 'Unknown error');
    assert.strictEqual(getErrorMessage(new Error(''), 'fallback'), 'fallback');
  });
});
