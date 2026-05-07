export const withAlpha = (color: string, alpha: number): string => {
  const a = Math.max(0, Math.min(1, alpha));

  // Supports #RGB, #RRGGBB, #RRGGBBAA (alpha in input is ignored).
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

    if (normalized.length === 6) {
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    }
  }

  return 'transparent';
};
