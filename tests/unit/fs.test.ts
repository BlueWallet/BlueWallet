import { applyWalletHistoryNoteUpdates, encodeCsvRow, parseWalletHistoryNotes, planWalletHistoryNoteImport } from '../../blue_modules/fs';

describe('fs wallet history notes', () => {
  const bip329Txid = 'f91d0a8a78462bc59398f2c5d7a84fcff491c26ba54c4833478b202796c8aafd';
  const otherBip329Txid = 'f546156d9044844e02b181026a1a407abfca62e7ea1159f87bbeaa77b4286c74';

  it('round-trips notes containing commas, quotes, and line breaks', () => {
    const memo = 'Coffee, "breakfast"\nwith Alice';
    const csv = [encodeCsvRow(['Date', 'Transaction ID', 'Amount', 'Memo']), encodeCsvRow(['today', 'abc123', 1, memo])].join('\n');

    expect(parseWalletHistoryNotes(csv)).toEqual([{ transactionId: 'abc123', memo }]);
  });

  it('accepts commas in notes from legacy on-chain exports', () => {
    const csv = ['Date,Transaction ID,Amount,Memo', 'today,abc123,1,coffee, breakfast'].join('\n');

    expect(parseWalletHistoryNotes(csv)).toEqual([{ transactionId: 'abc123', memo: 'coffee, breakfast' }]);
  });

  it('ignores empty notes and rejects malformed files', () => {
    expect(parseWalletHistoryNotes('Date,Transaction ID,Amount,Memo\ntoday,abc123,1,')).toEqual([]);
    expect(() => parseWalletHistoryNotes('not,a,history')).toThrow();
  });

  it('parses BIP-329 transaction labels and ignores other record types and omitted labels', () => {
    const labels = [
      JSON.stringify({ type: 'tx', ref: bip329Txid, label: 'Transaction', origin: "wpkh([d34db33f/84'/0'/0'])" }),
      JSON.stringify({ type: 'addr', ref: 'bc1qexample', label: 'Address' }),
      JSON.stringify({ type: 'tx', ref: otherBip329Txid }),
      JSON.stringify({ type: 'future-type', ref: 'extension', label: 'Ignored extension' }),
    ].join('\n');

    expect(parseWalletHistoryNotes(labels)).toEqual([{ transactionId: bip329Txid, memo: 'Transaction' }]);
  });

  it('preserves an explicit empty BIP-329 label so an existing note can be cleared', () => {
    const labels = JSON.stringify({ type: 'tx', ref: bip329Txid, label: '' });

    const notes = parseWalletHistoryNotes(labels);
    const plan = planWalletHistoryNoteImport(notes, new Map([[bip329Txid, bip329Txid]]), {
      [bip329Txid]: { memo: 'Existing note' },
    });

    expect(notes).toEqual([{ transactionId: bip329Txid, memo: '' }]);
    expect([...plan.updates]).toEqual([[bip329Txid, '']]);
    expect(plan.overwriteCount).toBe(1);
  });

  it('rejects malformed BIP-329 records and transaction labels', () => {
    expect(() => parseWalletHistoryNotes('{not json}')).toThrow();
    expect(() => parseWalletHistoryNotes(JSON.stringify({ type: 'tx', ref: 'not-a-txid', label: 'Note' }))).toThrow();
    expect(() => parseWalletHistoryNotes(JSON.stringify({ type: 'tx', ref: bip329Txid, label: 42 }))).toThrow();
  });

  it('imports and persists a matching BIP-329 transaction label', async () => {
    const notes = parseWalletHistoryNotes(JSON.stringify({ type: 'tx', ref: bip329Txid.toUpperCase(), label: 'Imported label' }));
    const metadata: Record<string, { memo?: string }> = {};
    const plan = planWalletHistoryNoteImport(notes, new Map([[bip329Txid, bip329Txid]]), metadata);
    const persist = jest.fn().mockResolvedValue(undefined);

    await applyWalletHistoryNoteUpdates(metadata, plan.updates, persist);

    expect(metadata).toEqual({ [bip329Txid]: { memo: 'Imported label' } });
    expect(persist).toHaveBeenCalledTimes(1);
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
