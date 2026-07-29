import { Chain } from '../models/bitcoinUnits';

export type WalletHistoryNote = {
  transactionId: string;
  memo: string;
};

export type WalletHistoryMetadata = Record<string, { memo?: string }>;

export type WalletHistoryNoteImportPlan = {
  updates: Map<string, string>;
  overwriteCount: number;
};

export const canImportWalletHistoryNotes = (chain: Chain): boolean => chain === Chain.ONCHAIN;

export const encodeCsvRow = (values: Array<string | number>): string =>
  values
    .map(value => {
      const stringValue = String(value);
      return /[",\r\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
    })
    .join(',');

const parseCsv = (contents: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < contents.length; index++) {
    const character = contents[index];

    if (quoted) {
      if (character === '"' && contents[index + 1] === '"') {
        value += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && contents[index + 1] === '\n') index++;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error('Unterminated quoted field');
  if (row.length > 0 || value.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
};

/**
 * Reads notes from the wallet-history CSV format. Older BlueWallet exports did
 * not escape commas in memos, so extra columns are joined back into the memo.
 */
export const parseWalletHistoryNotes = (contents: string, hasStatusColumn: boolean): WalletHistoryNote[] => {
  const rows = parseCsv(contents.replace(/^\uFEFF/, ''));
  if (rows.length === 0 || rows[0].length < 4) throw new Error('Invalid wallet history CSV');

  return rows.slice(1).flatMap(row => {
    if (row.length < 4) return [];

    const transactionId = row[1].trim();
    const memoColumns = hasStatusColumn && row.length > 4 ? row.slice(3, -1) : row.slice(3);
    const memo = memoColumns.join(',').trim();

    return transactionId && memo ? [{ transactionId, memo }] : [];
  });
};

export const planWalletHistoryNoteImport = (
  importedNotes: WalletHistoryNote[],
  transactionMetadataKeys: ReadonlyMap<string, string>,
  metadata: WalletHistoryMetadata,
): WalletHistoryNoteImportPlan => {
  const updates = new Map<string, string>();

  for (const importedNote of importedNotes) {
    const metadataKey = transactionMetadataKeys.get(importedNote.transactionId.toLowerCase());
    if (metadataKey && metadata[metadataKey]?.memo !== importedNote.memo) {
      updates.set(metadataKey, importedNote.memo);
    }
  }

  const overwriteCount = [...updates.keys()].filter(metadataKey => Boolean(metadata[metadataKey]?.memo?.trim())).length;
  return { updates, overwriteCount };
};

export const applyWalletHistoryNoteUpdates = async (
  metadata: WalletHistoryMetadata,
  updates: ReadonlyMap<string, string>,
  persist: () => Promise<void>,
): Promise<void> => {
  const previousMetadata = new Map([...updates.keys()].map(metadataKey => [metadataKey, metadata[metadataKey]]));
  for (const [metadataKey, memo] of updates) metadata[metadataKey] = { memo };

  try {
    await persist();
  } catch (error) {
    for (const [metadataKey, previousValue] of previousMetadata) {
      if (previousValue) metadata[metadataKey] = previousValue;
      else delete metadata[metadataKey];
    }
    throw error;
  }
};
