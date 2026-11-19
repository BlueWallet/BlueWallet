export const RECENT_SEND_DESTINATION_LIMIT = 5;

export type RecentSendDestination = {
  address: string;
  count: number;
  lastTimestamp: number;
};

export type RecentSendTransaction = {
  value?: number;
  timestamp?: number;
  counterparty?: string;
  outputs?: Array<{
    scriptPubKey?: {
      addresses?: string[];
    };
  }>;
};

/**
 * Last destinations this wallet paid, newest first.
 * One count per outgoing transaction. Change, self-outputs, and paycode payments are skipped.
 */
export function recentSendDestinations(
  transactions: RecentSendTransaction[],
  isOwnAddress: (address: string) => boolean,
  limit = RECENT_SEND_DESTINATION_LIMIT,
): RecentSendDestination[] {
  const byAddress = new Map<string, RecentSendDestination>();

  for (const tx of transactions) {
    if (typeof tx.value !== 'number' || tx.value >= 0) continue;
    if (tx.counterparty) continue;

    const timestamp = tx.timestamp ?? 0;
    const seenInTx = new Set<string>();
    for (const output of tx.outputs ?? []) {
      for (const address of output.scriptPubKey?.addresses ?? []) {
        if (!address || isOwnAddress(address) || seenInTx.has(address)) continue;
        seenInTx.add(address);
        const existing = byAddress.get(address);
        if (existing) {
          existing.count += 1;
          if (timestamp > existing.lastTimestamp) existing.lastTimestamp = timestamp;
        } else {
          byAddress.set(address, { address, count: 1, lastTimestamp: timestamp });
        }
      }
    }
  }

  return [...byAddress.values()].sort((a, b) => b.lastTimestamp - a.lastTimestamp).slice(0, limit);
}
