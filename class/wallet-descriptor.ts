import b58 from 'bs58check';

import { concatUint8Arrays, hexToUint8Array } from '../blue_modules/uint8array-extras';

export type DescriptorScriptType = 'p2pkh' | 'p2sh(p2wpkh)' | 'p2wpkh' | 'p2tr';

const XPUB_VERSION = hexToUint8Array('0488b21e');

export class WalletDescriptor {
  /**
   * Normalize ypub/zpub/xpub to standard xpub encoding (version bytes 0x0488B21E).
   * Inside output descriptors the script semantics are conveyed by the wrapper
   * (wpkh, sh(wpkh), …), so the key itself should always use the base xpub prefix.
   */
  static normalizeToXpub(key: string): string {
    if (key.startsWith('xpub') || key.startsWith('tpub')) return key;
    const decoded = b58.decode(key);
    const payload = decoded.slice(4);
    return b58.encode(concatUint8Arrays([XPUB_VERSION, payload]));
  }

  static scriptTypeFromPath(path: string): DescriptorScriptType | undefined {
    if (path.startsWith("m/86'")) return 'p2tr';
    if (path.startsWith("m/84'")) return 'p2wpkh';
    if (path.startsWith("m/49'")) return 'p2sh(p2wpkh)';
    if (path.startsWith("m/44'")) return 'p2pkh';
    return undefined;
  }

  static getDescriptor(fpHex: string, path: string, xpub: string, scriptType?: DescriptorScriptType): string {
    const normalizedXpub = WalletDescriptor.normalizeToXpub(xpub);
    const origin = `[${fpHex.toLowerCase()}/${path.replace('m/', '')}]`;
    const keyExpr = `${origin}${normalizedXpub}/<0;1>/*`;

    const effectiveType = scriptType ?? WalletDescriptor.scriptTypeFromPath(path);

    switch (effectiveType) {
      case 'p2tr':
        return `tr(${keyExpr})`;
      case 'p2wpkh':
        return `wpkh(${keyExpr})`;
      case 'p2sh(p2wpkh)':
        return `sh(wpkh(${keyExpr}))`;
      case 'p2pkh':
        return `pkh(${keyExpr})`;
      default:
        throw new Error('Dont know how to make a descriptor');
    }
  }
}
