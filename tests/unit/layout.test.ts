import { shouldUseWideLayout, WIDE_LAYOUT_MIN_WIDTH } from '../../blue_modules/layout';

describe('responsive layout', () => {
  it('uses the split layout for Plus, Pro Max, and similar Android phones in landscape', () => {
    expect(shouldUseWideLayout(736)).toBe(true);
    expect(shouldUseWideLayout(932)).toBe(true);
    expect(shouldUseWideLayout(1080)).toBe(true);
  });

  it('keeps phones compact in portrait', () => {
    expect(shouldUseWideLayout(430)).toBe(false);
    expect(shouldUseWideLayout(480)).toBe(false);
  });

  it('keeps iPad mini in the wide layout in both orientations', () => {
    expect(WIDE_LAYOUT_MIN_WIDTH).toBe(700);
    expect(shouldUseWideLayout(744)).toBe(true);
    expect(shouldUseWideLayout(1133)).toBe(true);
  });

  it('switches at the width boundary', () => {
    expect(shouldUseWideLayout(699)).toBe(false);
    expect(shouldUseWideLayout(700)).toBe(true);
  });

  it('uses compact layout for narrow desktop and Catalyst windows', () => {
    expect(shouldUseWideLayout(600)).toBe(false);
  });
});
