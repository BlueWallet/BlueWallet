import { walletTransactionsMenu } from '../../blue_modules/walletTransactionsMenu';
import { buildHeaderMenu, groupHeaderMenu } from '../../blue_modules/headerMenuActions';
import { BitcoinUnit } from '../../models/bitcoinUnits';

const options = () => ({
  unit: BitcoinUnit.BTC as BitcoinUnit,
  hidden: false,
  switching: false,
  onchain: true,
  explorerAvailable: true,
  changeUnit: jest.fn(),
  cycleUnit: jest.fn(),
  toggleBalance: jest.fn(),
  copyBalance: jest.fn(),
  openExplorer: jest.fn(),
  exportWallet: jest.fn(),
});

it.each([BitcoinUnit.BTC, BitcoinUnit.SATS, BitcoinUnit.LOCAL_CURRENCY])(
  'checks only the selected balance unit %s and dispatches each choice',
  unit => {
    const handlers = options();
    const result = buildHeaderMenu(walletTransactionsMenu({ ...handlers, unit }), 'wallet');
    const unitMenu = result.items.find(item => item.id.endsWith(':balance_units'))!;
    expect(unitMenu.singleSelection).toBe(true);
    expect(unitMenu.preferredElementSize).toBe('automatic');
    expect(unitMenu.maximumNumberOfTitleLines).toBe(2);
    const units = unitMenu.children!;
    expect(units.every(item => item.keepsMenuPresented && item.repeatBehavior === 'nonRepeatable')).toBe(true);
    expect(units.filter(item => item.state)).toHaveLength(1);
    expect(units.find(item => item.state)!.id).toBe(
      `header:wallet:${unit === BitcoinUnit.BTC ? 'viewInBitcoin' : unit === BitcoinUnit.SATS ? 'viewInSats' : 'viewInFiat'}`,
    );
    for (const [id, expected] of [
      ['viewInBitcoin', BitcoinUnit.BTC],
      ['viewInSats', BitcoinUnit.SATS],
      ['viewInFiat', BitcoinUnit.LOCAL_CURRENCY],
    ]) {
      result.handlers[`header:wallet:${id}`]();
      expect(handlers.changeUnit).toHaveBeenLastCalledWith(expected);
    }
  },
);

it('groups export, copying, and display commands under File, Edit, and View', () => {
  const result = buildHeaderMenu(walletTransactionsMenu(options()), 'wallet');
  const groups = groupHeaderMenu(result.items, 'WalletTransactions');
  expect(groups.map(group => group.id)).toEqual(['category:file', 'category:edit', 'category:view']);
  expect(JSON.stringify(groups[0])).toContain('ExportWallet');
  expect(JSON.stringify(groups[1])).toContain('copyBalance');
  expect(JSON.stringify(groups[2])).toContain('balance_units');
  expect(JSON.stringify(groups[2])).toContain('open_block_explorer');
});

it('blocks hidden balance copying/unit choices and unavailable explorer while preserving reveal/export', () => {
  const result = buildHeaderMenu(walletTransactionsMenu({ ...options(), hidden: true, onchain: false }), 'wallet');
  for (const id of ['copyBalance', 'changeBalanceUnit', 'viewInBitcoin', 'viewInSats', 'viewInFiat', 'open_block_explorer']) {
    expect(result.handlers[`header:wallet:${id}`]).toBeUndefined();
  }
  expect(result.handlers['header:wallet:hideBalance']).toBeDefined();
  expect(result.handlers['header:wallet:ExportWallet']).toBeDefined();
});

it('disables unit choices while saving and explorer when no URL is configured', () => {
  const result = buildHeaderMenu(walletTransactionsMenu({ ...options(), switching: true, explorerAvailable: false }), 'wallet');
  expect(result.handlers['header:wallet:viewInBitcoin']).toBeUndefined();
  expect(result.handlers['header:wallet:open_block_explorer']).toBeUndefined();
});
