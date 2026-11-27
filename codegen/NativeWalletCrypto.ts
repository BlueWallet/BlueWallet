import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native';

/**
 * libsodium's argon2id and XChaCha20-Poly1305 (Android:
 * android/walletcrypto). Synchronous, so the store code keeps its order of
 * reads and writes. Every byte string is base64url without padding; text is
 * passed as is and sealed as UTF-8. Null on iOS until it is built there.
 */
export interface Spec extends TurboModule {
  /** argon2id v1.3, one lane: a 32-byte key from the UTF-8 password and a 16-byte salt. Throws when memory runs out. */
  deriveKey(password: string, salt: string, opsLimit: number, memLimitKiB: number): string;
  /** Ciphertext and 16-byte tag of `plaintext` under a 32-byte key and a 24-byte nonce, `aad` authenticated too. */
  seal(key: string, nonce: string, plaintext: string, aad: string): string;
  /** The plaintext, or null when the tag does not verify. */
  open(key: string, nonce: string, ciphertext: string, aad: string): string | null;
}

const nativeModule = TurboModuleRegistry.get<Spec>('WalletCrypto');

export default nativeModule;
