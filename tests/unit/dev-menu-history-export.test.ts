import { createDeveloperAccountingSample, createDeveloperBip329Sample } from '../../components/DevMenu';

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
});
