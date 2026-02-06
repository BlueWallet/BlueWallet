import { isValidBech32Address } from '../../util/isValidBech32Address.ts';

describe('isValidBech32Address', () => {
  const validBech32Addresses: string[] = [
    'bc1qatswv5uv7qetzz4n8u9u2x2ckmaxvc8qng5s7r', // P2WPKH (SegWit v0)
    'bc1ph76f32dqjkvd523g02ucylqstljj5pysqe3lmyuepnuyz5d7lw9sl0pp4m', // P2TR (Taproot v1)
    'tb1ql4jps5nxnyz7qxgle9dp3q0mww2jk4ckfua6lr', // Testnet SegWit v0
    'tb1p4tp4l6glyr2gs94neqcpr5gha7344nfyznfkc8szkreflscsdkgqsdent4', // Testnet Taproot v1
  ];

  const invalidBech32Addresses: (string | null | undefined)[] = [
    'moKVV6XEhfrBCE3QCYq6ppT7AaMF8KsZ1B',
    '16X9EwoL5fgUr2ordTy8bs7wT4Ff3QGQPW', // Legacy (P2PKH)
    '3HFvmZJhc7KbqVXXQXaa34StUPk4gxcQyR', // P2SH
    'bc1zw508d6qejxtdg4y5r3zarvaryvg6kdaj', // Invalid checksum
    'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kyd39', // Too short
    'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KYGT080', // Uppercase (invalid Bech32)
    'bcrt1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', // Regtest
    '', // Empty string
    null,
    undefined,
  ];

  test.each(validBech32Addresses)('should return true for valid Bech32 address: %s', (address: string) => {
    expect(isValidBech32Address(address)).toBe(true);
  });

  test.each(invalidBech32Addresses)('should return false for invalid Bech32 address: %s', (address: string | null | undefined) => {
    expect(isValidBech32Address(address as string)).toBe(false);
  });
});
