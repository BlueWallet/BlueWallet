import { BitcoinUnit } from '../models/bitcoinUnits';
import loc from '../loc';
import type { HeaderMenuEntry } from './headerMenuActions';

type WalletMenuOptions = {
  unit: BitcoinUnit;
  hidden: boolean;
  switching: boolean;
  onchain: boolean;
  explorerAvailable: boolean;
  changeUnit: (unit: BitcoinUnit) => void;
  cycleUnit: () => void;
  toggleBalance: () => void;
  copyBalance: () => void;
  openExplorer: () => void;
  exportWallet: () => void;
};

export function walletTransactionsMenu(options: WalletMenuOptions): HeaderMenuEntry[] {
  const disabled = options.hidden || options.switching;
  return [
    { id: 'changeBalanceUnit', text: loc.wallets.change_balance_unit, disabled, onPress: options.cycleUnit },
    {
      id: 'balance_units',
      text: loc.wallets.balance_unit,
      disabled,
      subactions: [
        {
          id: 'viewInBitcoin',
          text: loc.units.BTC,
          menuState: options.unit === BitcoinUnit.BTC,
          onPress: () => options.changeUnit(BitcoinUnit.BTC),
        },
        {
          id: 'viewInSats',
          text: loc.units.sats,
          menuState: options.unit === BitcoinUnit.SATS,
          onPress: () => options.changeUnit(BitcoinUnit.SATS),
        },
        {
          id: 'viewInFiat',
          text: loc.wallets.local_currency,
          menuState: options.unit === BitcoinUnit.LOCAL_CURRENCY,
          onPress: () => options.changeUnit(BitcoinUnit.LOCAL_CURRENCY),
        },
      ],
    },
    { id: 'hideBalance', text: loc.transactions.details_balance_hide, menuState: options.hidden, onPress: options.toggleBalance },
    { id: 'copyBalance', text: loc.wallets.copy_balance, disabled: options.hidden, onPress: options.copyBalance },
    {
      id: 'open_block_explorer',
      text: loc.wallets.open_block_explorer,
      disabled: !options.onchain || !options.explorerAvailable,
      onPress: options.openExplorer,
    },
    { id: 'ExportWallet', text: loc.wallets.details_export_backup, onPress: options.exportWallet },
  ];
}
