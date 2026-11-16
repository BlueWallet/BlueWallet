import * as bip39 from 'bip39';

/**
 * Encodes an English BIP39 mnemonic as a Standard SeedQR payload (https://github.com/SeedSigner/seedsigner/blob/dev/docs/seed_qr/README.md):
 * every word is replaced by its zero-padded 4-digit index in the wordlist, and the digits are concatenated.
 * Such a QR can be scanned by SeedSigner to verify a seed on an offline device.
 *
 * @returns SeedQR payload, or `null` if the mnemonic is not a valid English BIP39 mnemonic
 */
export function mnemonicToSeedQR(mnemonic: string): string | null {
  const words = mnemonic.trim().split(/\s+/);
  const wordlist = bip39.wordlists.english;
  if (!bip39.validateMnemonic(words.join(' '), wordlist)) return null;
  return words.map(word => wordlist.indexOf(word).toString().padStart(4, '0')).join('');
}
