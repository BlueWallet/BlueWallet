const HEX6_RE = /^[0-9a-fA-F]{6}$/;

/** Apply alpha to `#RGB`/`#RRGGBB`/`#RRGGBBAA` (input alpha ignored). Other formats returned unchanged. */
export const withAlpha = (color: string, alpha: number): string => {
  const a = Math.max(0, Math.min(1, alpha));

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map(c => c + c)
            .join('')
        : hex.length === 8
          ? hex.slice(0, 6)
          : hex;

    if (normalized.length === 6 && HEX6_RE.test(normalized)) {
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
  }

  if (__DEV__) {
    console.warn(`[withAlpha] unsupported color format: ${String(color)}`);
  }

  return color;
};
