import { clearCachedSatoshis, conversionCache, getCachedSatoshis, setCachedSatoshis } from '../../components/AmountInput.cache';

describe('AmountInput conversion cache', () => {
  beforeEach(clearCachedSatoshis);

  it('stores, retrieves, overwrites, and isolates exact satoshi values by local amount', () => {
    expect(getCachedSatoshis('50')).toBeUndefined();

    setCachedSatoshis('50', '100000');
    setCachedSatoshis('50.01', '100020');
    expect(getCachedSatoshis('50')).toBe('100000');
    expect(getCachedSatoshis('50.01')).toBe('100020');

    setCachedSatoshis('50', '100001');
    expect(getCachedSatoshis('50')).toBe('100001');
  });

  it('clears all cached conversions without replacing the exported cache object', () => {
    const originalCache = conversionCache;
    setCachedSatoshis('50', '100000');

    clearCachedSatoshis();

    expect(conversionCache).toBe(originalCache);
    expect(conversionCache).toEqual({});
  });
});
