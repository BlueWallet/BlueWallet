import {
  applyWalletHistoryNoteUpdates,
  cleanupTemporaryExportFiles,
  encodeBip329Record,
  encodeBip329TransactionLabel,
  encodeCsvRow,
  isAppleNumbersFile,
  parseWalletHistoryNotes,
  planWalletHistoryNoteImport,
  selectWalletHistoryNoteUpdates,
  writeFileAndExport,
} from '../../blue_modules/fs';

const RNFS = require('react-native-fs');

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

  it('reads only the transaction ID and memo columns from the expanded accounting CSV', () => {
    const csv = [
      encodeCsvRow([
        'Date',
        'Transaction ID',
        'Type',
        'Amount (BTC)',
        'Amount (sats)',
        'Fee (BTC)',
        'Fee (sats)',
        'Memo',
        'Status',
        'Confirmations',
      ]),
      encodeCsvRow(['2025-01-23T11:40:35.000Z', 'abc123', 'Receive', '0.1', 10_000_000, '', '', 'Accounting note', 'Confirmed', 7]),
    ].join('\r\n');

    expect(parseWalletHistoryNotes(csv)).toEqual([{ transactionId: 'abc123', memo: 'Accounting note' }]);
  });

  it('ignores empty notes and rejects malformed files', () => {
    expect(parseWalletHistoryNotes('Date,Transaction ID,Amount,Memo\ntoday,abc123,1,')).toEqual([]);
    expect(() => parseWalletHistoryNotes('not,a,history')).toThrow();
  });

  it('parses BIP-329 transaction labels and ignores other record types and omitted labels', () => {
    const labels = [
      JSON.stringify({
        type: 'tx',
        ref: bip329Txid,
        label: 'Transaction',
        origin: "wpkh([d34db33f/84'/0'/0'])",
      }),
      JSON.stringify({ type: 'addr', ref: 'bc1qexample', label: 'Address' }),
      JSON.stringify({ type: 'tx', ref: otherBip329Txid }),
      JSON.stringify({
        type: 'future-type',
        ref: 'extension',
        label: 'Ignored extension',
      }),
    ].join('\n');

    expect(parseWalletHistoryNotes(labels)).toEqual([{ transactionId: bip329Txid, memo: 'Transaction' }]);
  });

  it('imports only BIP-329 notes for the selected wallet origin while accepting legacy records without an origin', () => {
    const selectedOrigin = "wpkh([d34db33f/84'/0'/0'])";
    const labels = [
      JSON.stringify({
        type: 'tx',
        ref: bip329Txid,
        label: 'Selected account',
        origin: 'WPKH([D34DB33F/84H/0H/0H])',
      }),
      JSON.stringify({
        type: 'tx',
        ref: bip329Txid,
        label: 'Different account',
        origin: "wpkh([d34db33f/84'/0'/1'])",
      }),
      JSON.stringify({
        type: 'tx',
        ref: otherBip329Txid,
        label: 'Legacy record',
      }),
    ].join('\n');

    expect(parseWalletHistoryNotes(labels, selectedOrigin)).toEqual([
      { transactionId: bip329Txid, memo: 'Selected account' },
      { transactionId: otherBip329Txid, memo: 'Legacy record' },
    ]);
  });

  it('rejects a malformed BIP-329 origin instead of importing an ambiguous note', () => {
    expect(() =>
      parseWalletHistoryNotes(
        JSON.stringify({
          type: 'tx',
          ref: bip329Txid,
          label: 'Note',
          origin: 42,
        }),
      ),
    ).toThrow(/Invalid BIP-329 origin/);
  });

  it('round-trips an exported BIP-329 transaction label', () => {
    const memo = 'Coffee, "breakfast"\nwith Alice';
    const exportedLabel = encodeBip329TransactionLabel(bip329Txid, memo);

    expect(JSON.parse(exportedLabel)).toEqual({
      type: 'tx',
      ref: bip329Txid,
      label: memo,
    });
    expect(parseWalletHistoryNotes(exportedLabel)).toEqual([{ transactionId: bip329Txid, memo }]);
  });

  it('exports BIP-329 additional transaction and output fields with their JSON types intact', () => {
    const transaction = encodeBip329TransactionLabel(bip329Txid, 'Coffee', {
      origin: "wpkh([d34db33f/84'/0'/0'])",
      time: '2025-01-23T11:40:35.000Z',
      fee: 141,
      value: -25_000,
    });
    const output = encodeBip329Record({
      type: 'output',
      ref: `${bip329Txid}:1`,
      label: 'Cold storage',
      spendable: false,
      value: 100_000,
      keypath: '/1/7',
    });

    expect(JSON.parse(transaction)).toEqual({
      type: 'tx',
      ref: bip329Txid,
      label: 'Coffee',
      origin: "wpkh([d34db33f/84'/0'/0'])",
      time: '2025-01-23T11:40:35.000Z',
      fee: 141,
      value: -25_000,
    });
    expect(JSON.parse(output)).toEqual({
      type: 'output',
      ref: `${bip329Txid}:1`,
      label: 'Cold storage',
      spendable: false,
      value: 100_000,
      keypath: '/1/7',
    });
  });

  it('rejects BIP-329 fields that violate the standard JSON types or record scope', () => {
    expect(() => encodeBip329Record({ type: 'tx', ref: bip329Txid, spendable: false })).toThrow(/only valid for output/);
    expect(() => encodeBip329Record({ type: 'tx', ref: bip329Txid, value: 1.5 })).toThrow(/must be an integer/);
    expect(() => encodeBip329Record({ type: 'tx', ref: bip329Txid, time: 'not-a-date' })).toThrow(/ISO-8601/);
    expect(() => encodeBip329Record({ type: 'tx', ref: '' })).toThrow(/Invalid BIP-329/);
  });

  it('omits the BIP-329 label when an exported transaction has no note', () => {
    const exportedTransaction = encodeBip329TransactionLabel(bip329Txid);

    expect(JSON.parse(exportedTransaction)).toEqual({
      type: 'tx',
      ref: bip329Txid,
    });
    expect(parseWalletHistoryNotes(exportedTransaction)).toEqual([]);
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
    const notes = parseWalletHistoryNotes(
      JSON.stringify({
        type: 'tx',
        ref: bip329Txid.toUpperCase(),
        label: 'Imported label',
      }),
    );
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

  it('keeps new notes and only the selected overwrites', () => {
    const updates = new Map([
      ['existing-selected', 'replacement'],
      ['existing-unselected', 'skipped replacement'],
      ['without-note', 'new note'],
    ]);
    const metadata = {
      'existing-selected': { memo: 'old note' },
      'existing-unselected': { memo: 'another old note' },
    };

    expect([...selectWalletHistoryNoteUpdates(updates, metadata, new Set(['existing-selected']))]).toEqual([
      ['existing-selected', 'replacement'],
      ['without-note', 'new note'],
    ]);
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
    const metadata: Record<string, { memo?: string }> = {
      abc123: existingEntry,
    };
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

describe('temporary export cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RNFS.__mockFsHelpers.reset();
    RNFS.readDir.mockResolvedValue([]);
    RNFS.exists.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('removes only stale BlueWallet export files from the cache', async () => {
    const now = Date.UTC(2026, 10, 2, 12);
    const stalePath = '/mock/Caches/bluewallet-export-1-old.csv';
    const freshPath = '/mock/Caches/bluewallet-export-2-fresh.jsonl';
    const unrelatedPath = '/mock/Caches/other-app-file.csv';
    for (const filePath of [stalePath, freshPath, unrelatedPath]) RNFS.__mockFsHelpers.setExists(filePath);
    RNFS.readDir.mockResolvedValue([
      {
        name: 'bluewallet-export-1-old.csv',
        path: stalePath,
        mtime: new Date(now - 25 * 60 * 60 * 1000),
      },
      {
        name: 'bluewallet-export-2-fresh.jsonl',
        path: freshPath,
        mtime: new Date(now - 60 * 60 * 1000),
      },
      {
        name: 'other-app-file.csv',
        path: unrelatedPath,
        mtime: new Date(now - 48 * 60 * 60 * 1000),
      },
    ]);

    await cleanupTemporaryExportFiles(now);

    expect(RNFS.unlink).toHaveBeenCalledTimes(1);
    expect(RNFS.unlink).toHaveBeenCalledWith(stalePath);
  });

  it('removes a partially written temporary file when export writing fails', async () => {
    const now = 1_793_619_200_000;
    const temporaryPath = `/mock/Caches/bluewallet-export-${now}-sample-accounting.csv`;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    RNFS.__mockFsHelpers.setExists(temporaryPath);
    RNFS.writeFile.mockRejectedValueOnce(new Error('write failed'));

    await writeFileAndExport('sample-accounting.csv', 'contents', true);

    expect(RNFS.unlink).toHaveBeenCalledWith(temporaryPath);
  });

  it('detects Apple Numbers documents before attempting to read their package data', () => {
    expect(isAppleNumbersFile('/tmp/Wallet.NUMBERS', 'Wallet.NUMBERS')).toBe(true);
    expect(isAppleNumbersFile('/tmp/provider-item', 'Wallet.numbers')).toBe(true);
    expect(isAppleNumbersFile('/tmp/Wallet.csv', 'Wallet.csv')).toBe(false);
  });
});
