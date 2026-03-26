/**
 * Address Poisoning Detection
 *
 * Detects potential address poisoning attacks where a scammer sends a small
 * amount to an address that looks very similar to one the user has recently
 * interacted with (especially change addresses). The goal is to trick the user
 * into copying the poisoned address for future transactions.
 *
 * Based on issue #8292:
 * - One input, one output pattern is suspicious
 * - Addresses that are similar but not identical to recently-seen addresses
 */

import { Transaction } from '../class/wallets/types';

/**
 * Calculates the Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Returns the number of characters that differ between two strings of equal length.
 * Compares character by character and counts mismatches. For strings of different
 * lengths, the shorter one is padded conceptually (extra chars count as differences).
 */
function countCharDifferences(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  let differences = Math.abs(a.length - b.length);
  const minLen = Math.min(a.length, b.length);

  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) {
      differences++;
    }
  }

  return differences;
}

/**
 * Check if two addresses share the same prefix (HRP for bech32, or first few chars for others).
 * Address poisoning commonly uses the same prefix to look legitimate.
 */
function hasSamePrefix(a: string, b: string, prefixLength: number = 8): boolean {
  return a.substring(0, prefixLength) === b.substring(0, prefixLength);
}

/**
 * Normalizes a Bitcoin address for comparison by lowercasing it.
 * This is safe because Bitcoin addresses are case-insensitive for the data part.
 */
function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export interface AddressPoisoningWarning {
  /** The address that might be poisoned */
  address: string;
  /** The address it looks similar to */
  similarTo: string;
  /** Number of character differences */
  differences: number;
  /** Levenshtein distance */
  levenshtein: number;
  /** Human-readable reason for the warning */
  reason: string;
}

export interface PoisoningCheckResult {
  /** Whether address poisoning is suspected */
  isSuspicious: boolean;
  /** Warnings about suspicious addresses */
  warnings: AddressPoisoningWarning[];
}

/**
 * Check if a set of output addresses might be poisoned.
 *
 * Compares output addresses against a list of known addresses (from recent transactions
 * and the user's own wallets) to detect lookalike addresses.
 *
 * @param outputAddresses - Addresses in the current transaction's outputs
 * @param knownAddresses - Addresses the user has interacted with recently
 * @param ownAddresses - Addresses owned by the user's wallets
 * @param inputAddresses - Addresses in the current transaction's inputs
 * @returns PoisoningCheckResult with warnings if any suspicious patterns are found
 */
export function checkForAddressPoisoning(
  outputAddresses: string[],
  knownAddresses: string[],
  ownAddresses: Set<string>,
  inputAddresses: string[],
): PoisoningCheckResult {
  const warnings: AddressPoisoningWarning[] = [];

  const filteredOutputs = outputAddresses.filter(addr => !ownAddresses.has(addr) && addr.length > 0);
  const filteredKnown = knownAddresses.filter(addr => !ownAddresses.has(addr) && addr.length > 0);

  for (const outputAddr of filteredOutputs) {
    const normalizedOutput = normalizeAddress(outputAddr);

    // Check against all known (recently-interacted) addresses
    for (const knownAddr of filteredKnown) {
      // Skip comparing the same address
      if (normalizeAddress(outputAddr) === normalizeAddress(knownAddr)) continue;

      const normalizedKnown = normalizeAddress(knownAddr);
      const levenshtein = levenshteinDistance(normalizedOutput, normalizedKnown);
      const charDiffs = countCharDifferences(normalizedOutput, normalizedKnown);
      const samePrefix = hasSamePrefix(normalizedOutput, normalizedKnown);
      const similarLength = Math.abs(outputAddr.length - knownAddr.length) <= 2;

      // Detection heuristics:
      // 1. Very small Levenshtein distance (1-3 edits) for same-length addresses
      // 2. Very few character differences (1-3) with same prefix
      // 3. Same prefix + very similar length + small edit distance
      const isVerySimilar =
        (levenshtein <= 3 && similarLength) || (charDiffs <= 3 && samePrefix && similarLength);

      // 4. Special case: single-char difference is almost certainly poisoning
      const isSingleCharDiff = charDiffs === 1 && samePrefix;

      // 5. Very small Levenshtein distance with same prefix is highly suspicious
      const isHighlySuspicious = levenshtein <= 2 && samePrefix;

      if (isSingleCharDiff || isHighlySuspicious || isVerySimilar) {
        const severity = isSingleCharDiff ? 'critical' : isHighlySuspicious ? 'high' : 'medium';

        let reason: string;
        if (isSingleCharDiff) {
          reason = `This address differs from a known address by only ${charDiffs} character. This is a common address poisoning tactic.`;
        } else if (isHighlySuspicious) {
          reason = `This address is very similar (Levenshtein distance: ${levenshtein}) to an address you've previously interacted with.`;
        } else {
          reason = `This address looks similar to one you've recently seen (${charDiffs} character difference${charDiffs > 1 ? 's' : ''}).`;
        }

        warnings.push({
          address: outputAddr,
          similarTo: knownAddr,
          differences: charDiffs,
          levenshtein,
          reason,
        });

        // Don't add duplicate warnings for the same output address
        // (we already found the most suspicious match)
        break;
      }
    }
  }

  // Additional structural check: if the tx has exactly 1 input and 1 non-own output,
  // and that output looks similar to the input address, that's extra suspicious
  if (inputAddresses.length === 1 && filteredOutputs.length === 1) {
    const inputAddr = inputAddresses[0];
    const outputAddr = filteredOutputs[0];
    const normalizedInput = normalizeAddress(inputAddr);
    const normalizedOutput = normalizeAddress(outputAddr);

    if (normalizedInput !== normalizedOutput) {
      const charDiffs = countCharDifferences(normalizedInput, normalizedOutput);
      const samePrefix = hasSamePrefix(normalizedInput, normalizedOutput);
      const levenshtein = levenshteinDistance(normalizedInput, normalizedOutput);

      // Single input, single output, similar addresses = classic poisoning pattern
      if ((charDiffs <= 3 && samePrefix) || levenshtein <= 2) {
        // Check if we already have a warning for this output
        const alreadyWarned = warnings.some(w => w.address === outputAddr);
        if (!alreadyWarned) {
          warnings.push({
            address: outputAddr,
            similarTo: inputAddr,
            differences: charDiffs,
            levenshtein,
            reason: `This transaction has a suspicious pattern (1 input → 1 output) and the output address differs from the input by only ${charDiffs} character${charDiffs > 1 ? 's' : ''}. This is a common address poisoning attack.`,
          });
        } else {
          // Upgrade the existing warning to mention the structural pattern
          const existingWarning = warnings.find(w => w.address === outputAddr);
          if (existingWarning) {
            existingWarning.reason += ' Additionally, this transaction has a suspicious 1-input-to-1-output structure.';
          }
        }
      }
    }
  }

  // Deduplicate warnings by address (keep the most suspicious one - lowest differences)
  const dedupedWarnings: AddressPoisoningWarning[] = [];
  const seenAddresses = new Set<string>();
  const sortedBySeverity = [...warnings].sort((a, b) => a.differences - b.differences);

  for (const warning of sortedBySeverity) {
    if (!seenAddresses.has(warning.address)) {
      seenAddresses.add(warning.address);
      dedupedWarnings.push(warning);
    }
  }

  return {
    isSuspicious: dedupedWarnings.length > 0,
    warnings: dedupedWarnings,
  };
}

/**
 * Collect all addresses from recent transactions (excluding own addresses).
 * Used to build a reference set for address poisoning detection.
 *
 * @param allTransactions - All transactions from the user's wallets
 * @param ownAddresses - Set of addresses owned by the user's wallets
 * @param maxTransactions - Maximum number of recent transactions to consider
 * @returns Array of recently-seen non-own addresses
 */
export function collectRecentlyUsedAddresses(
  allTransactions: Transaction[],
  ownAddresses: Set<string>,
  maxTransactions: number = 100,
): string[] {
  // Sort by timestamp descending to get most recent first
  const sorted = [...allTransactions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const recent = sorted.slice(0, maxTransactions);

  const addresses: string[] = [];

  for (const tx of recent) {
    // Collect input addresses
    for (const input of tx.inputs) {
      if (input?.addresses) {
        for (const addr of input.addresses) {
          if (!ownAddresses.has(addr) && addr.length > 0 && !addresses.includes(addr)) {
            addresses.push(addr);
          }
        }
      }
    }

    // Collect output addresses
    for (const output of tx.outputs) {
      if (output?.scriptPubKey?.addresses) {
        for (const addr of output.scriptPubKey.addresses) {
          if (!ownAddresses.has(addr) && addr.length > 0 && !addresses.includes(addr)) {
            addresses.push(addr);
          }
        }
      }
    }
  }

  return addresses;
}
