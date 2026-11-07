import { shouldUseWideLayout, WIDE_LAYOUT_MIN_LENGTH } from '../../blue_modules/layout';

describe('responsive layout', () => {
  it('uses the short edge so a landscape phone keeps the phone layout', () => {
    expect(shouldUseWideLayout(852, 393, false)).toBe(false);
  });

  it('keeps iPad mini in the wide layout in both orientations', () => {
    expect(WIDE_LAYOUT_MIN_LENGTH).toBe(744);
    expect(shouldUseWideLayout(744, 1133, false)).toBe(true);
    expect(shouldUseWideLayout(1133, 744, false)).toBe(true);
  });

  it('switches at the short-edge boundary', () => {
    expect(shouldUseWideLayout(743, 1200, false)).toBe(false);
    expect(shouldUseWideLayout(744, 1200, false)).toBe(true);
  });

  it('always uses the wide layout on desktop', () => {
    expect(shouldUseWideLayout(600, 500, true)).toBe(true);
  });
});
