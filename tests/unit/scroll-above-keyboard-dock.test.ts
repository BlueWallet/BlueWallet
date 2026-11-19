import assert from 'assert';

import { scrollOffsetToRevealInput } from '../../components/scrollAboveKeyboardDock';

const base = {
  scrollY: 40,
  keyboardHeight: 300,
  windowHeight: 800,
  barHeight: 44,
  margin: 8,
};

describe('scrollOffsetToRevealInput', () => {
  it('scrolls a field that sits under the keyboard and the dock bar', () => {
    const next = scrollOffsetToRevealInput({ ...base, inputY: 500, inputHeight: 44 });
    // visible bottom is 800 - 300 - 44 = 456; input bottom is 544; overlap 88 + margin 8
    assert.strictEqual(next, 40 + 88 + 8);
  });

  it('leaves a field that is already above the bar', () => {
    assert.strictEqual(scrollOffsetToRevealInput({ ...base, inputY: 100, inputHeight: 44 }), null);
  });

  it('does not jump a tall editor down to its bottom', () => {
    assert.strictEqual(scrollOffsetToRevealInput({ ...base, inputY: 80, inputHeight: 400 }), null);
  });

  it('brings the top of a tall editor into view when the keyboard covers it', () => {
    const next = scrollOffsetToRevealInput({ ...base, inputY: 500, inputHeight: 400 });
    assert.strictEqual(next, 40 + 500 - 8);
  });

  it('does nothing before the keyboard has a height', () => {
    assert.strictEqual(scrollOffsetToRevealInput({ ...base, keyboardHeight: 0, inputY: 500, inputHeight: 44 }), null);
  });
});
