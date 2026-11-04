import { readFileSync } from 'fs';
import path from 'path';
import {
  createDeveloperAccountingExcelSample,
  createDeveloperAccountingSample,
  createDeveloperBip329Sample,
} from '../../components/DevMenu';
import { accountingHistoryXlsxToCsv } from '../../blue_modules/wallet-history-xlsx';

describe('developer history export menu', () => {
  it('provides a populated accounting CSV sample', () => {
    const csv = createDeveloperAccountingSample();
    const rows = csv.split('\r\n');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('Date,Transaction ID,Type,Amount (BTC),Amount (sats),Fee (BTC),Fee (sats)');
    expect(rows[0]).toContain('Input Addresses,Output Addresses,Counterparty');
    expect(rows[1]).toContain('Developer sample, ""coffee""');
    expect(rows[1]).toContain('Confirmed,12');
    expect(rows[1]).toContain('Developer sample merchant');
  });

  it('provides valid BIP-329 JSONL covering transaction, address, input, and frozen output records', () => {
    const records = createDeveloperBip329Sample()
      .split('\n')
      .map(line => JSON.parse(line));

    expect(records.map(record => record.type)).toEqual(['tx', 'addr', 'input', 'output']);
    expect(records.every(record => typeof record.ref === 'string' && record.ref.length > 0)).toBe(true);
    expect(records[0]).toMatchObject({ fee: 10_000, value: -100_000 });
    expect(records[1]).toMatchObject({
      keypath: '/0/7',
      label: 'Developer sample address',
    });
    expect(records[3]).toMatchObject({
      spendable: false,
      value: 100_000,
      label: 'Developer frozen output',
    });
  });

  it('provides a populated Excel accounting sample', () => {
    const csv = accountingHistoryXlsxToCsv(createDeveloperAccountingExcelSample());

    expect(csv).toContain('Date,Transaction ID,Type,Amount (BTC),Amount (sats)');
    expect(csv).toContain('Developer sample, ""coffee""');
  });

  it('registers the two-step Share/Save then Accounting/Backup developer flow', () => {
    const source = readFileSync(path.join(__dirname, '../../components/DevMenu.tsx'), 'utf8');

    expect(source).toContain("DevSettings.addMenuItem('Test History Export Menu'");
    expect(source).toContain("text: 'Share'");
    expect(source).toContain("text: 'Save'");
    expect(source).toContain("text: 'Accounting'");
    expect(source).toContain("text: 'Backup'");
    expect(source).toContain("text: 'CSV'");
    expect(source).toContain("text: 'Excel / Apple Numbers (.xlsx)'");
    expect(source).toContain("text: 'BIP-329 JSONL'");
  });
});
