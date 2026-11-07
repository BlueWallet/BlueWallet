import { Transaction } from '../../class/wallets/types';
import { buildMenu, lookupId } from '../../components/TooltipMenu.helpers';
import { Chain } from '../../models/bitcoinUnits';
import {
  ACCOUNTING_HISTORY_HEADERS,
  createAccountingHistoryCsv,
  createHistoryExportFileNames,
  createHistoryExportMenuActions,
  getTransactionFee,
  IMPORT_NOTES_ACTION_ID,
  SAVE_ACCOUNTING_ACTION_ID,
  SAVE_BACKUP_ACTION_ID,
  SHARE_ACCOUNTING_ACTION_ID,
  SHARE_BACKUP_ACTION_ID,
  sanitizeAccountingCsvCell,
} from '../../blue_modules/wallet-history-export';
import { parseWalletHistoryNotes } from '../../blue_modules/fs';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  txid: 'a'.repeat(64),
  hash: 'a'.repeat(64),
  version: 2,
  size: 200,
  vsize: 140,
  weight: 560,
  locktime: 0,
  inputs: [],
  outputs: [],
  timestamp: 0,
  ...overrides,
});

describe('wallet history exports', () => {
  it('creates an accounting CSV with UTC dates, signed BTC values, calculated fees, escaping, and CRLF rows', () => {
    const timestamp = Date.UTC(2025, 0, 23, 11, 40, 35) / 1000;
    const tx = transaction({
      inputs: [
        {
          txid: 'b'.repeat(64),
          vout: 0,
          scriptSig: { asm: '', hex: '' },
          txinwitness: [],
          sequence: 0xffffffff,
          address: 'bc1qinput',
          value: 1,
        },
      ],
      outputs: [
        {
          value: 0.999,
          n: 0,
          scriptPubKey: {
            asm: '',
            hex: '',
            reqSigs: 1,
            type: 'witness_v0_keyhash',
            addresses: ['bc1qexample'],
          },
        },
      ],
      value: -50_000_000,
      fee: 0.0001,
      confirmations: 7,
      blockhash: 'c'.repeat(64),
      blocktime: timestamp,
    });

    const csv = createAccountingHistoryCsv([tx], Chain.ONCHAIN, {
      [tx.txid]: { memo: 'Coffee, "shop"' },
    });
    const rows = csv.split('\r\n');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(
      'Date,Transaction ID,Type,Amount (BTC),Amount (sats),Fee (BTC),Fee (sats),Memo,Status,Confirmations,Block Hash,Version,Size (bytes),Virtual Size (vB),Weight (WU),Locktime,Input Count,Output Count,Input Addresses,Output Addresses,Counterparty,Payment Hash,Payment Request,Description,Category,Record Type,Expires At',
    );
    expect(rows[1]).toContain(`2025-01-23T11:40:35.000Z,${tx.txid},Send,-0.50000000,-50000000,0.00100000,100000`);
    expect(rows[1]).toContain('"Coffee, ""shop""",Confirmed,7');
    expect(rows[1]).toContain(`${tx.blockhash},2,200,140,560,0,1,1,bc1qinput,bc1qexample`);
    expect(csv.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('exports Lightning payment hashes and deterministic pending, expired, failed, and complete states', () => {
    const now = Date.UTC(2025, 0, 23, 12);
    const base = transaction({ timestamp: now / 1000, value: 1_000, fee: 2 });
    const lightningTransactions = [
      { ...base, payment_hash: { data: [1, 2] }, expire_time: now / 1000 - 1 },
      {
        ...base,
        txid: 'b'.repeat(64),
        hash: 'b'.repeat(64),
        payment_hash: 'pending',
        expire_time: now / 1000 + 1,
      },
      {
        ...base,
        txid: 'c'.repeat(64),
        hash: 'c'.repeat(64),
        payment_hash: 'failed',
        failed: true,
      },
      {
        ...base,
        txid: 'd'.repeat(64),
        hash: 'd'.repeat(64),
        payment_hash: 'complete',
        ispaid: true,
      },
    ];

    const csv = createAccountingHistoryCsv(lightningTransactions, Chain.OFFCHAIN, {}, now);

    expect(csv).toContain(',0102,Receive,0.00001000,1000,0.00000002,2,,Expired,');
    expect(csv).toContain(',pending,Receive,0.00001000,1000,0.00000002,2,,Pending,');
    expect(csv).toContain(',failed,Receive,0.00001000,1000,0.00000002,2,,Failed,');
    expect(csv).toContain(',complete,Receive,0.00001000,1000,0.00000002,2,,Complete,');
  });

  it('uses format-specific, whitespace-normalized filenames', () => {
    expect(createHistoryExportFileNames('  Main   Wallet  ')).toEqual({
      accounting: 'Main-Wallet-accounting.csv',
      backup: 'Main-Wallet-bip329-backup.jsonl',
    });
  });

  it('builds Share and Save submenus with Accounting and BIP-329 Backup leaves', () => {
    const actions = createHistoryExportMenuActions(Chain.ONCHAIN, 2, 'Export History', 'Import Notes...', true);
    const { ids } = buildMenu(actions, 'ios');
    const serializedActions = JSON.stringify(actions);

    expect(lookupId(ids, [0, 0, 0, 0])).toBe(SHARE_ACCOUNTING_ACTION_ID);
    expect(lookupId(ids, [0, 0, 1, 0])).toBe(SHARE_BACKUP_ACTION_ID);
    expect(lookupId(ids, [0, 1, 0, 0])).toBe(SAVE_ACCOUNTING_ACTION_ID);
    expect(lookupId(ids, [0, 1, 1, 0])).toBe(SAVE_BACKUP_ACTION_ID);
    expect(lookupId(ids, [1])).toBe(IMPORT_NOTES_ACTION_ID);
    expect(actions[0].subactions?.[0].text).toBe('Share');
    expect(actions[0].subactions?.[1].text).toBe('Save');
    expect(actions[1].text).toBe('Import Notes');
    expect(actions[0].subactions?.[0].subactions?.[0].subactions?.[0].subtitle).toBeUndefined();
    expect(serializedActions).toContain('Transaction records for bookkeeping');
    expect(serializedActions).toContain('Export Bitcoin labels and coin metadata');
    expect(serializedActions).toContain('Bitcoin Wallet Labels Export Format (.jsonl)');
    expect(actions[1].subtitle).toBeUndefined();
  });

  it('shows export categories directly on non-desktop devices', () => {
    const actions = createHistoryExportMenuActions(Chain.ONCHAIN, 2, 'Export History', 'Import Notes...', false);
    const { ids } = buildMenu(actions, 'ios');

    expect(actions[0].subactions?.map(action => action.text)).toEqual(['Accounting', 'Wallet Labels']);
    expect(lookupId(ids, [0, 0, 0])).toBe(SHARE_ACCOUNTING_ACTION_ID);
    expect(lookupId(ids, [0, 1, 0])).toBe(SHARE_BACKUP_ACTION_ID);
    expect(JSON.stringify(actions)).not.toContain(SAVE_ACCOUNTING_ACTION_ID);
    expect(JSON.stringify(actions)).not.toContain(SAVE_BACKUP_ACTION_ID);

    const android = buildMenu(actions, 'android');
    expect(android.items.map(item => item.title)).toEqual(['Accounting', 'Wallet Labels', 'Import Notes']);
    expect(android.items[0].actions?.map(item => item.title)).toEqual(['CSV']);
    expect(android.items[1].actions?.map(item => item.title)).toEqual(['BIP-329 JSONL']);
    expect(lookupId(android.ids, [0, 0])).toBe(SHARE_ACCOUNTING_ACTION_ID);
    expect(lookupId(android.ids, [1, 0])).toBe(SHARE_BACKUP_ACTION_ID);
  });

  it('keeps Android sharing and direct document saving within one submenu level', () => {
    const { items, ids } = buildMenu(
      createHistoryExportMenuActions(Chain.ONCHAIN, 1, 'Export History', 'Import Notes', false, false, 'android'),
      'android',
    );
    expect(items[0].actions?.map(item => item.title)).toEqual(['CSV', 'Save CSV']);
    expect(items[1].actions?.map(item => item.title)).toEqual(['BIP-329 JSONL', 'Save BIP-329 JSONL']);
    expect(lookupId(ids, [0, 0])).toBe(SHARE_ACCOUNTING_ACTION_ID);
    expect(lookupId(ids, [0, 1])).toBe(SAVE_ACCOUNTING_ACTION_ID);
    expect(lookupId(ids, [1, 0])).toBe(SHARE_BACKUP_ACTION_ID);
    expect(lookupId(ids, [1, 1])).toBe(SAVE_BACKUP_ACTION_ID);
  });

  it('allows owned labels to be exported without any transaction history', () => {
    const actions = createHistoryExportMenuActions(Chain.ONCHAIN, 0, 'Export History', 'Import Notes', false, true, 'android');
    const { items, ids } = buildMenu(actions, 'android');
    expect(items.map(item => item.title)).toEqual(['Wallet Labels']);
    expect(lookupId(ids, [0, 0])).toBe(SHARE_BACKUP_ACTION_ID);
    expect(lookupId(ids, [0, 1])).toBe(SAVE_BACKUP_ACTION_ID);
  });

  it.each([
    [0.0001, 10_000],
    [123, 123],
    [0, 0],
    [-1, undefined],
    [NaN, undefined],
    [undefined, undefined],
  ])('normalizes a reported fee %s when input values are unavailable', (fee, expected) => {
    expect(getTransactionFee(transaction({ fee }))).toBe(expected);
  });

  it('omits BIP-329 Backup and Import Notes for Lightning, and hides all actions without history', () => {
    const lightning = buildMenu(createHistoryExportMenuActions(Chain.OFFCHAIN, 1, 'Export History', 'Import Notes', true), 'ios');
    expect(lookupId(lightning.ids, [0, 0, 0, 0])).toBe(SHARE_ACCOUNTING_ACTION_ID);
    expect(lookupId(lightning.ids, [0, 0, 1])).toBeUndefined();
    expect(lookupId(lightning.ids, [0, 1, 0, 0])).toBe(SAVE_ACCOUNTING_ACTION_ID);
    expect(lightning.items).toHaveLength(1);

    const empty = buildMenu(createHistoryExportMenuActions(Chain.ONCHAIN, 0, 'Export History', 'Import Notes'), 'ios');
    expect(empty.items).toEqual([]);
    expect(empty.ids).toEqual([]);
  });

  it('uses stable English accounting headers', () => {
    expect(ACCOUNTING_HISTORY_HEADERS[0]).toBe('Date');
    expect(ACCOUNTING_HISTORY_HEADERS[1]).toBe('Transaction ID');
    expect(ACCOUNTING_HISTORY_HEADERS[22]).toBe('Payment Request');
  });

  it('neutralizes spreadsheet formulas in CSV text while preserving negative accounting values', () => {
    expect(sanitizeAccountingCsvCell('=WEBSERVICE("https://example.com")')).toBe('\'=WEBSERVICE("https://example.com")');
    expect(sanitizeAccountingCsvCell('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
    expect(sanitizeAccountingCsvCell('-cmd|payload')).toBe("'-cmd|payload");
    expect(sanitizeAccountingCsvCell('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
    expect(sanitizeAccountingCsvCell('\t=1+1')).toBe("'\t=1+1");
    expect(sanitizeAccountingCsvCell('\r=1+1')).toBe("'\r=1+1");
    expect(sanitizeAccountingCsvCell('-0.50000000')).toBe('-0.50000000');
    expect(sanitizeAccountingCsvCell(-50_000_000)).toBe(-50_000_000);
  });

  it('neutralizes attacker-controlled fields in accounting CSV exports', () => {
    const tx = {
      ...transaction({ value: -50_000_000, counterparty: '@SUM(A1:A2)' }),
      description: '+SUM(A1:A2)',
      payment_request: '\t=1+1',
    };
    const csv = createAccountingHistoryCsv([tx], Chain.ONCHAIN, { [tx.txid]: { memo: '=1+1' } });

    expect(csv).toContain(',-0.50000000,-50000000,');
    expect(csv).toContain("'@SUM(A1:A2)");
    expect(csv).toContain("'+SUM(A1:A2)");
    expect(csv).toContain("'\t=1+1");
    expect(csv).toContain("'=1+1");
    expect(parseWalletHistoryNotes(csv)).toEqual([{ transactionId: tx.txid, memo: '=1+1' }]);
  });
});
