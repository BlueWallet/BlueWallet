import assert from 'assert';

import { androidSettledHeight } from '../../components/AndroidKeyboardAccessoryDock';

describe('androidSettledHeight', () => {
  it('ignores an OPEN height until the keyboard has finished showing', () => {
    assert.strictEqual(androidSettledHeight(true, false, true, 320), 0);
  });

  it('uses the OPEN height once the show event has fired', () => {
    assert.strictEqual(androidSettledHeight(true, true, true, 320), 320);
  });

  it('drops the height when the field blurs, the IME closes, or the height is 0', () => {
    assert.strictEqual(androidSettledHeight(false, true, true, 320), 0);
    assert.strictEqual(androidSettledHeight(true, true, false, 320), 0);
    assert.strictEqual(androidSettledHeight(true, true, true, 0), 0);
  });
});
