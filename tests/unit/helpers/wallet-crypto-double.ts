/**
 * The native `WalletCrypto` module for Jest: the same primitives libsodium
 * runs on the phone (argon2id v1.3 and XChaCha20-Poly1305), from other
 * implementations: Node's own argon2id (OpenSSL, Node 24.7+; @noble's on
 * older Node, much slower under Jest) and @noble's XChaCha20-Poly1305.
 * `encryption.test.ts` checks this double against vectors made by the
 * vendored libsodium itself, so tests that pass here pass with the real one.
 */
import crypto from 'crypto';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { argon2id } from '@noble/hashes/argon2';

const bytes = (base64url: string) => new Uint8Array(Buffer.from(base64url, 'base64url'));
const text = (value: Uint8Array) => Buffer.from(value).toString('base64url');

/** Every derivation made, so tests can count them. */
export const derivations: Array<{ salt: string; t: number; m: number }> = [];

const WalletCryptoDouble = {
  deriveKey(password: string, salt: string, opsLimit: number, memLimitKiB: number): string {
    derivations.push({ salt, t: opsLimit, m: memLimitKiB });
    if (bytes(salt).length !== 16) throw new Error('argon2id failed (parameters or memory)');
    const nodeArgon2 = (crypto as any).argon2Sync;
    if (typeof nodeArgon2 === 'function') {
      const options = {
        message: bytes(password),
        nonce: bytes(salt),
        parallelism: 1,
        tagLength: 32,
        memory: memLimitKiB,
        passes: opsLimit,
      };
      return text(new Uint8Array(nodeArgon2('argon2id', options)));
    }
    return text(
      argon2id(bytes(password), bytes(salt), {
        t: opsLimit,
        m: memLimitKiB,
        p: 1,
        dkLen: 32,
        version: 0x13,
      }),
    );
  },
  seal(key: string, nonce: string, plaintext: string, aad: string): string {
    return text(xchacha20poly1305(bytes(key), bytes(nonce), new TextEncoder().encode(aad)).encrypt(new TextEncoder().encode(plaintext)));
  },
  open(key: string, nonce: string, ciphertext: string, aad: string): string | null {
    try {
      const plaintext = xchacha20poly1305(bytes(key), bytes(nonce), new TextEncoder().encode(aad)).decrypt(bytes(ciphertext));
      return new TextDecoder().decode(plaintext);
    } catch {
      return null;
    }
  },
};

export default WalletCryptoDouble;
