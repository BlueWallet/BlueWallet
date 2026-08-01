import assert from 'assert';

import { assertRngSample } from '../../class/rng-selftest';

describe('assertRngSample', () => {
  it('rejects empty sample', () => {
    assert.throws(() => assertRngSample(new Uint8Array(0)), /empty/);
  });

  it('rejects constant output', () => {
    assert.throws(() => assertRngSample(new Uint8Array(32).fill(0x00)), /constant/);
    assert.throws(() => assertRngSample(new Uint8Array(32).fill(0xff)), /constant/);
  });

  it('rejects extreme bit bias on large samples', () => {
    // Almost all zeros, but not constant — fails monobit
    const biased = new Uint8Array(1024);
    biased[0] = 1;
    assert.throws(() => assertRngSample(biased), /monobit/);
  });

  it('accepts balanced sample', () => {
    // 0x55 = 01010101 — exactly 50% ones
    assertRngSample(new Uint8Array(1024).fill(0x55));
  });

  it('skips monobit for tiny non-constant samples', () => {
    // Too small for monobit; only constant-check applies
    const tiny = new Uint8Array([0x00, 0xff]);
    assertRngSample(tiny);
  });
});
