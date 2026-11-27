import { sha256 } from '@noble/hashes/sha256';

import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';

/**
 * Wallet identity, second formula. The legacy formula concatenated its parts
 * without separators and left the network out, so the same words imported on
 * mainnet and testnet, or two hardware devices on the same path, got the same
 * ID. Encoding the parts as a JSON array removes the ambiguity, and the prefix
 * keeps these hashes disjoint from legacy ones.
 *
 * The ID is a local label only: it never feeds key derivation or addresses.
 */
export function walletIdV2(parts: readonly string[]): string {
  return uint8ArrayToHex(sha256('neurai-wallet-id/v2\n' + JSON.stringify(parts)));
}
