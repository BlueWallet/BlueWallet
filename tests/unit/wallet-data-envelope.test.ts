import { decryptWalletData, encryptWalletData, isWalletDataEnvelope } from '../../blue_modules/wallet-data-envelope';

describe('wallet data envelope', () => {
  const key = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
  const nonce = Uint8Array.from({ length: 12 }, (_, index) => index + 20);

  it('round-trips wallet data using an authenticated versioned envelope', () => {
    const plaintext = JSON.stringify({ wallets: ['wallet-secret'], tx_metadata: {}, counterparty_metadata: {} });
    const encrypted = encryptWalletData(plaintext, key, nonce);

    expect(isWalletDataEnvelope(encrypted)).toBe(true);
    expect(encrypted).not.toContain('wallet-secret');
    expect(decryptWalletData(encrypted, key)).toBe(plaintext);
  });

  it('rejects modified ciphertext', () => {
    const encrypted = JSON.parse(encryptWalletData('long-enough-wallet-data', key, nonce));
    encrypted.ciphertext = `${encrypted.ciphertext.slice(0, -2)}AA`;

    expect(() => decryptWalletData(JSON.stringify(encrypted), key)).toThrow();
  });

  it('does not confuse legacy wallet formats with an envelope', () => {
    expect(isWalletDataEnvelope(JSON.stringify({ wallets: [] }))).toBe(false);
    expect(isWalletDataEnvelope(JSON.stringify(['legacy-password-bucket']))).toBe(false);
  });

  it('rejects malformed input with the envelope validation error', () => {
    expect(() => decryptWalletData('not-json', key)).toThrow('Unsupported wallet-data envelope');
  });
});
