import assert from 'assert';
import { errorMessage } from '../../helpers/errorMessage';

describe('errorMessage', () => {
  it('reads Error.message', () => {
    assert.strictEqual(errorMessage(new Error('boom')), 'boom');
  });

  it('reads message off plain objects, as electrum-client rejects with', () => {
    assert.strictEqual(
      errorMessage({ code: -32600, message: 'verbose transactions are currently unsupported' }),
      'verbose transactions are currently unsupported',
    );
  });

  it('stringifies anything else', () => {
    assert.strictEqual(errorMessage('CANCELLED'), 'CANCELLED');
    assert.strictEqual(errorMessage(undefined), 'undefined');
    assert.strictEqual(errorMessage({ code: 1 }), '[object Object]');
  });
});
