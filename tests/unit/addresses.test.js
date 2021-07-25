import { getAddress, sortByAddressIndex, totalBalance, filterByAddressType } from '../../screen/wallets/addresses';
import { TABS } from '../../components/addresses/AddressTypeTabs';

const mockAddressesList = [
  { index: 2, isInternal: false, key: 'third_external_address' },
  { index: 0, isInternal: true, key: 'first_internal_address' },
  { index: 1, isInternal: false, key: 'second_external_address' },
  { index: 1, isInternal: true, key: 'second_internal_address' },
  { index: 0, isInternal: false, key: 'first_external_address' },
];

describe('Addresses', () => {
  it('Sort by index', () => {
    const sortedList = mockAddressesList.sort(sortByAddressIndex);

    expect(sortedList[0].index).toBe(0);
    expect(sortedList[2].index).toBe(1);
    expect(sortedList[4].index).toBe(2);
  });

  it('Have tabs defined', () => {
    const tabsEnum = {
      EXTERNAL: 'receive',
      INTERNAL: 'change',
    };

    expect(TABS).toEqual(tabsEnum);
  });

  it('Filter by type', () => {
    let currentTab = TABS.EXTERNAL;

    const externalAddresses = mockAddressesList.filter(address => filterByAddressType(TABS.INTERNAL, address.isInternal, currentTab));

    currentTab = TABS.INTERNAL;

    const internalAddresses = mockAddressesList.filter(address => filterByAddressType(TABS.INTERNAL, address.isInternal, currentTab));

    externalAddresses.forEach(address => {
      expect(address.isInternal).toBe(false);
    });

    internalAddresses.forEach(address => {
      expect(address.isInternal).toBe(true);
    });
  });

  it('Sum confirmed/unconfirmed balance', () => {
    const wallet1Balance = { c: 0, u: 0 };
    const wallet2Balance = { c: 7, u: 3 };
    const wallet3Balance = { c: 3, u: 7 };

    expect(totalBalance(wallet1Balance)).toBe(0);
    expect(totalBalance(wallet2Balance)).toBe(10);
    expect(totalBalance(wallet3Balance)).toBe(10);
  });

  it('Returns AddressItem object', () => {
    const fakeWallet = {
      _getExternalAddressByIndex: index => `external_address_${index}`,
      _getInternalAddressByIndex: index => `internal_address_${index}`,
      _balances_by_external_index: [{ c: 0, u: 0 }],
      _balances_by_internal_index: [{ c: 0, u: 0 }],
      _txs_by_external_index: { 0: [{}] },
      _txs_by_internal_index: { 0: [{}, {}] },
    };

    const firstExternalAddress = getAddress(fakeWallet, 0, false);
    const firstInternalAddress = getAddress(fakeWallet, 0, true);

    expect(firstExternalAddress).toEqual({
      address: 'external_address_0',
      balance: 0,
      index: 0,
      isInternal: false,
      key: 'external_address_0',
      transactions: 1,
    });

    expect(firstInternalAddress).toEqual({
      address: 'internal_address_0',
      balance: 0,
      index: 0,
      isInternal: true,
      key: 'internal_address_0',
      transactions: 2,
    });
  });
});
