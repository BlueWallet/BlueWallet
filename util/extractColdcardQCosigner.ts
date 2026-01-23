/**
 *  Extracts a cosigner from a ColdcardQ JSON export for a given multisig wallet format.
 *
 * @param {object} data - The parsed JSON object from a ColdcardQ export.
 * @param {string} format - The multisig wallet format, e.g., p2wsh, p2sh-p2wsh, p2wsh-p2sh, p2sh.
 * @returns {{ xfp: string, path: string, xpub: string } | undefined} - The extracted cosigner components or undefined if extraction fails.
 *
 */

import { MultisigHDWallet } from '../class';

export function extractColdcardQCosigner(data: any, format: string): { xfp: string; path: string; xpub: string } | undefined {
  if (!data || data.chain !== 'BTC' || !data.xfp || (!data.bip48_1 && !data.bip48_2 && !data.bip45)) {
    return;
  }

  let entry;

  switch (format) {
    case MultisigHDWallet.FORMAT_P2WSH:
      entry = data.bip48_2;
      break;

    case MultisigHDWallet.FORMAT_P2SH_P2WSH:
    case MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT:
      entry = data.bip48_1;
      break;

    case MultisigHDWallet.FORMAT_P2SH:
      entry = data.bip45;
      break;

    default:
      return;
  }

  if (!entry?.xpub || !entry?.deriv) return;

  return {
    xfp: data.xfp,
    path: entry.deriv.replace(/^m/i, ''),
    xpub: entry.xpub,
  };
}
