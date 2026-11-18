import b58 from 'bs58check';

import { concatUint8Arrays, hexToUint8Array } from '../blue_modules/uint8array-extras';
import { AbstractWallet } from './wallets/abstract-wallet';
import { AbstractHDElectrumWallet } from './wallets/abstract-hd-electrum-wallet';
import { HDAezeedWallet } from './wallets/hd-aezeed-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from './wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from './wallets/hd-segwit-electrum-seed-p2wpkh-wallet';
import type { TWallet } from './wallets/types';

const XPUB_VERSION = hexToUint8Array('0488b21e');

export class WalletDescriptor {
  /**
   * Re-encodes ypub/zpub as xpub: inside a descriptor the script type comes from the wrapper (wpkh, sh(wpkh)…),
   * so the key must use the plain xpub version bytes. Any other key is returned as is.
   */
  static normalizeToXpub(key: string): string {
    if (!key.startsWith('ypub') && !key.startsWith('zpub')) return key;
    return b58.encode(concatUint8Arrays([XPUB_VERSION, b58.decode(key).slice(4)]));
  }

  static getDescriptor(fpHex: string, path: string, xpub: string, scriptType: NonNullable<AbstractWallet['segwitType']>): string {
    const key = `[${fpHex.toLowerCase()}/${path.replace('m/', '')}]${WalletDescriptor.normalizeToXpub(xpub)}`;
    switch (scriptType) {
      case 'p2tr':
        return `tr(${key})`;
      case 'p2wpkh':
        return `wpkh(${key})`;
      case 'p2sh(p2wpkh)':
        return `sh(wpkh(${key}))`;
      case 'p2pkh':
        return `pkh(${key})`;
      default:
        throw new Error('Dont know how to make a descriptor');
    }
  }

  /**
   * Descriptor for a single-sig HD wallet's account xpub, or undefined when the wallet has no xpub to show or can't be
   * described faithfully: Electrum-seed and aezeed wallets derive keys from a non-BIP39 seed, so
   * getMasterFingerprintHex() is not their real master fingerprint.
   */
  static fromWallet(wallet: TWallet): string | undefined {
    if (
      !wallet.allowXpub() ||
      !(wallet instanceof AbstractHDElectrumWallet) ||
      wallet instanceof HDAezeedWallet ||
      wallet instanceof HDSegwitElectrumSeedP2WPKHWallet ||
      wallet instanceof HDLegacyElectrumSeedP2PKHWallet
    ) {
      return undefined;
    }
    const path = wallet.getDerivationPath();
    if (!path) return undefined;
    // HD classes without segwitType (HDLegacyP2PKHWallet and subclasses) are p2pkh whatever their path
    return WalletDescriptor.getDescriptor(wallet.getMasterFingerprintHex(), path, wallet.getXpub(), wallet.segwitType ?? 'p2pkh');
  }
}
