import assert from 'assert';
import { getAddress, sortByIndexAndType, totalBalance } from '../../screen/wallets/addresses';

describe('Addresses', () => {
  it('Sort by index ASC and externals first', () => {
    const originalList = [
      { index: 0, isInternal: true, key: 'first_internal_address' },
      { index: 1, isInternal: false, key: 'second_external_address' },
      { index: 1, isInternal: true, key: 'second_internal_address' },
      { index: 0, isInternal: false, key: 'first_external_address' },
    ];

    const sortedList = originalList.sort(sortByIndexAndType);

    assert.strictEqual(sortedList[0].key, 'first_external_address');
    assert.strictEqual(sortedList[1].key, 'second_external_address');
    assert.strictEqual(sortedList[2].key, 'first_internal_address');
    assert.strictEqual(sortedList[3].key, 'second_internal_address');
  });

  it('Sum confirmed/unconfirmed balance', () => {
    const wallet1Balance = { c: 0, u: 0 };
    const wallet2Balance = { c: 7, u: 3 };
    const wallet3Balance = { c: 3, u: 7 };

    assert.strictEqual(totalBalance(wallet1Balance), 0);
    assert.strictEqual(totalBalance(wallet2Balance), 10);
    assert.strictEqual(totalBalance(wallet3Balance), 10);
  });

  it('Returns AddressItem object', () => {
    const fakeWallet = {
      _getExternalAddressByIndex: index => `external_address_${index}`,
      _getInternalAddressByIndex: index => `internal_address_${index}`,
      _balances_by_external_index: [{ c: 0, u: 0 }],
      _balances_by_internal_index: [{ c: 0, u: 0 }],
    };

    const firstExternalAddress = getAddress(fakeWallet, 0, false);
    const firstInternalAddress = getAddress(fakeWallet, 0, true);

    assert.deepStrictEqual(firstExternalAddress, {
      address: 'external_address_0',
      balance: 0,
      index: 0,
      isInternal: false,
      key: 'external_address_0',
      transactions: 0,
    });

    assert.deepStrictEqual(firstInternalAddress, {
      address: 'internal_address_0',
      balance: 0,
      index: 0,
      isInternal: true,
      key: 'internal_address_0',
      transactions: 0,
    });
  });
});
