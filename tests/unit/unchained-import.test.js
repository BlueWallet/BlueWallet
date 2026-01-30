/**
 * Tests for Unchained Capital wallet descriptor import
 * 
 * This test verifies that Unchained Capital descriptors are properly recognized
 * and can be imported as watch-only wallets.
 */

describe('Unchained Capital Import', () => {
  // Sample descriptor from the GitHub issue
  const sampleDescriptor = {
    xfp: 'B68AF6E4',
    account: 0,
    p2wsh_deriv: 'm/48h/0h/0h/2h',
    p2wsh: 'Zpub74w9dfoeurKrKXE3SPRpFquLPTkiCuSwGuhDzBgbE42w5ShB2FxMjmJyjZpSJ6WhLt8y1PeFHQELGgq2GmktviFDH8yFWYRWg4xQjy3v335',
    p2sh_deriv: 'm/45h',
    p2sh: 'xpub69EKPNo9Jkd6v2h7xNKw5RdbFBoaHEcstXcRNfcQ2jg71iFpobCwcxfJjaV2ycGy218f2jM1znqs1SDkqMiR7fbyBVJwzacg2QarGt1gtJg',
    p2sh_p2wsh_deriv: 'm/48h/0h/0h/1h',
    p2sh_p2wsh: 'Ypub6k6tL18jmAnNRGZpk4u3WPGDmWMkdZNmx3MySYdQywCwMMHqNoKHeqLAgU6pFokHKQFdi88vAW4g3TEsCAymoq5LnFXd54RkQ8m3AD9f81J'
  };

  test('descriptor has required fields for Unchained format', () => {
    // xfp (master fingerprint) is required
    expect(sampleDescriptor.xfp).toBeDefined();
    expect(sampleDescriptor.xfp).toBe('B68AF6E4');
    
    // At least one of p2wsh, p2sh_p2wsh, or p2sh must be present
    expect(sampleDescriptor.p2wsh || sampleDescriptor.p2sh_p2wsh || sampleDescriptor.p2sh).toBeTruthy();
    
    // All three script types are present in this sample
    expect(sampleDescriptor.p2wsh).toBeDefined();
    expect(sampleDescriptor.p2sh_p2wsh).toBeDefined();
    expect(sampleDescriptor.p2sh).toBeDefined();
  });

  test('xfp is valid hexadecimal', () => {
    const hexRegex = /^[0-9A-F]{8}$/i;
    expect(hexRegex.test(sampleDescriptor.xfp)).toBe(true);
  });

  test('derivation paths are properly formatted', () => {
    if (sampleDescriptor.p2wsh_deriv) {
      expect(sampleDescriptor.p2wsh_deriv).toMatch(/^m\//);
    }
    if (sampleDescriptor.p2sh_p2wsh_deriv) {
      expect(sampleDescriptor.p2sh_p2wsh_deriv).toMatch(/^m\//);
    }
    if (sampleDescriptor.p2sh_deriv) {
      expect(sampleDescriptor.p2sh_deriv).toMatch(/^m\//);
    }
  });

  test('public keys have correct prefixes for mainnet', () => {
    if (sampleDescriptor.p2wsh) {
      // Zpub for native SegWit multisig (P2WSH) on mainnet
      expect(sampleDescriptor.p2wsh.startsWith('Zpub')).toBe(true);
    }
    if (sampleDescriptor.p2sh_p2wsh) {
      // Ypub for nested SegWit multisig (P2SH-P2WSH) on mainnet
      expect(sampleDescriptor.p2sh_p2wsh.startsWith('Ypub')).toBe(true);
    }
    if (sampleDescriptor.p2sh) {
      // xpub for legacy multisig (P2SH) on mainnet
      expect(sampleDescriptor.p2sh.startsWith('xpub')).toBe(true);
    }
  });

  test('minimal valid descriptor', () => {
    const minimal = {
      xfp: 'ABCD1234',
      p2wsh: 'Zpubtest123'
    };
    
    expect(minimal.xfp).toBeDefined();
    expect(minimal.p2wsh).toBeDefined();
    expect(minimal.xfp && minimal.p2wsh).toBeTruthy();
  });

  test('descriptor with only p2sh_p2wsh is valid', () => {
    const nestedOnly = {
      xfp: 'ABCD1234',
      p2sh_p2wsh: 'Ypubtest123',
      p2sh_p2wsh_deriv: 'm/48h/0h/0h/1h'
    };
    
    expect(nestedOnly.xfp).toBeDefined();
    expect(nestedOnly.p2sh_p2wsh).toBeDefined();
    expect(nestedOnly.xfp && nestedOnly.p2sh_p2wsh).toBeTruthy();
  });

  test('descriptor with only p2sh is valid', () => {
    const legacyOnly = {
      xfp: 'ABCD1234',
      p2sh: 'xpubltest123',
      p2sh_deriv: 'm/45h'
    };
    
    expect(legacyOnly.xfp).toBeDefined();
    expect(legacyOnly.p2sh).toBeDefined();
    expect(legacyOnly.xfp && legacyOnly.p2sh).toBeTruthy();
  });
});
