import React from 'react';
import { Alert, DevSettings } from 'react-native';
import { act, render } from '@testing-library/react-native';
import DevMenu, { createDeveloperAccountingSample, createDeveloperBip329Sample } from '../../components/DevMenu';
import loc from '../../loc';

jest.mock('react-native/Libraries/Utilities/DevSettings', () => ({
  __esModule: true,
  default: { addMenuItem: jest.fn(), reload: jest.fn() },
}));
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: () => ({ wallets: [] }) }));

describe('developer history export menu', () => {
  afterEach(() => jest.restoreAllMocks());

  it('uses the shipping localized accounting labels through the developer menu flow', () => {
    jest.spyOn(DevSettings, 'addMenuItem').mockImplementation(() => {});
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.replaceProperty(loc.wallets, 'details_export_accounting', 'Localized Accounting');
    jest.replaceProperty(loc.wallets, 'details_export_accounting_description', 'Localized accounting description');
    jest.replaceProperty(loc.wallets, 'details_export_csv', 'Localized CSV');
    render(React.createElement(DevMenu));
    const openMenu = jest.mocked(DevSettings.addMenuItem).mock.calls.find(([title]) => title === 'Test History Export Menu')![1];
    act(() => openMenu());
    act(() => jest.mocked(Alert.alert).mock.lastCall![2]![0].onPress?.());
    const accounting = jest.mocked(Alert.alert).mock.lastCall![2]![0];
    expect(accounting.text).toBe('Localized Accounting');
    act(() => accounting.onPress?.());
    expect(Alert.alert).toHaveBeenLastCalledWith('Localized Accounting', 'Localized accounting description', [
      expect.objectContaining({ text: 'Localized CSV' }),
      expect.objectContaining({ text: loc._.cancel }),
    ]);
  });

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
