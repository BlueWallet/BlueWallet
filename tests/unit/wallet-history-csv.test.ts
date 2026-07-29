import {
  applyWalletHistoryNoteUpdates,
  canImportWalletHistoryNotes,
  encodeCsvRow,
  parseWalletHistoryNotes,
  planWalletHistoryNoteImport,
} from '../../blue_modules/fs';
import { Chain } from '../../models/bitcoinUnits';

describe('wallet history CSV', () => {
  it('only allows note imports for on-chain wallets', () => {
    expect(canImportWalletHistoryNotes(Chain.ONCHAIN)).toBe(true);
    expect(canImportWalletHistoryNotes(Chain.OFFCHAIN)).toBe(false);
  });

  it('round-trips notes containing commas, quotes, and line breaks', () => {
    const memo = 'Coffee, "breakfast"\nwith Alice';
    const csv = [encodeCsvRow(['Date', 'Transaction ID', 'Amount', 'Memo']), encodeCsvRow(['today', 'abc123', 1, memo])].join('\n');

    expect(parseWalletHistoryNotes(csv, false)).toEqual([{ transactionId: 'abc123', memo }]);
  });

  it('accepts commas in notes from legacy on-chain exports', () => {
    const csv = ['Date,Transaction ID,Amount,Memo', 'today,abc123,1,coffee, breakfast'].join('\n');

    expect(parseWalletHistoryNotes(csv, false)).toEqual([{ transactionId: 'abc123', memo: 'coffee, breakfast' }]);
  });

  it('does not include the status column in legacy off-chain notes', () => {
    const csv = ['Date,Transaction ID,Amount,Memo,Payment', 'today,abc123,1,coffee, breakfast,Success'].join('\n');

    expect(parseWalletHistoryNotes(csv, true)).toEqual([{ transactionId: 'abc123', memo: 'coffee, breakfast' }]);
  });

  it('ignores empty notes and rejects malformed files', () => {
    expect(parseWalletHistoryNotes('Date,Transaction ID,Amount,Memo\ntoday,abc123,1,', false)).toEqual([]);
    expect(() => parseWalletHistoryNotes('not,a,history', false)).toThrow();
  });

  it('matches transaction IDs case-insensitively and identifies overwrites', () => {
    const notes = [
      { transactionId: 'ABC123', memo: 'replacement' },
      { transactionId: 'def456', memo: 'new note' },
      { transactionId: 'same789', memo: 'unchanged' },
      { transactionId: 'not-in-wallet', memo: 'ignored' },
    ];
    const transactionMetadataKeys = new Map([
      ['abc123', 'abc123'],
      ['def456', 'metadata-for-def456'],
      ['same789', 'same789'],
    ]);
    const metadata = {
      abc123: { memo: 'existing note' },
      same789: { memo: 'unchanged' },
    };

    const plan = planWalletHistoryNoteImport(notes, transactionMetadataKeys, metadata);

    expect([...plan.updates]).toEqual([
      ['abc123', 'replacement'],
      ['metadata-for-def456', 'new note'],
    ]);
    expect(plan.overwriteCount).toBe(1);
  });

  it('uses the final imported note when a transaction appears more than once', () => {
    const plan = planWalletHistoryNoteImport(
      [
        { transactionId: 'abc123', memo: 'first' },
        { transactionId: 'abc123', memo: 'last' },
      ],
      new Map([['abc123', 'abc123']]),
      { abc123: { memo: 'existing' } },
    );

    expect([...plan.updates]).toEqual([['abc123', 'last']]);
    expect(plan.overwriteCount).toBe(1);
  });

  it('applies planned note updates before persisting', async () => {
    const metadata = { abc123: { memo: 'existing' } };
    const persist = jest.fn(async () => {
      expect(metadata).toEqual({
        abc123: { memo: 'replacement' },
        def456: { memo: 'new note' },
      });
    });

    await applyWalletHistoryNoteUpdates(
      metadata,
      new Map([
        ['abc123', 'replacement'],
        ['def456', 'new note'],
      ]),
      persist,
    );

    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('restores existing metadata and removes new entries when persistence fails', async () => {
    const existingEntry = { memo: 'existing' };
    const metadata: Record<string, { memo?: string }> = { abc123: existingEntry };
    const error = new Error('save failed');

    await expect(
      applyWalletHistoryNoteUpdates(
        metadata,
        new Map([
          ['abc123', 'replacement'],
          ['def456', 'new note'],
        ]),
        async () => {
          throw error;
        },
      ),
    ).rejects.toBe(error);

    expect(metadata).toEqual({ abc123: { memo: 'existing' } });
    expect(metadata.abc123).toBe(existingEntry);
  });
});
