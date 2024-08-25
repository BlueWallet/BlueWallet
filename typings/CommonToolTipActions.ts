import loc from '../loc';

const keys = {
  CopyTXID: 'copyTX_ID',
  CopyBlockExplorerLink: 'copy_blockExplorer',
  ExpandNote: 'expandNote',
  OpenInBlockExplorer: 'open_in_blockExplorer',
  CopyAmount: 'copyAmount',
  CopyNote: 'copyNote',
  ManageWallets: 'manageWallets',
  ImportWallet: 'importWallet',
  HideBalance: 'hideBalance',
  ViewInBitcoin: 'viewInBitcoin',
  ViewInSats: 'viewInSats',
  ViewInFiat: 'viewInFiat',
};

const icons = {
  Eye: {
    iconValue: 'eye',
  },
  EyeSlash: {
    iconValue: 'eye.slash',
  },
  Clipboard: {
    iconValue: 'doc.on.doc',
  },
  Link: {
    iconValue: 'link',
  },
  Note: {
    iconValue: 'note.text',
  },
  ManageWallets: {
    iconValue: 'slider.horizontal.3',
  },
  ImportWallet: {
    iconValue: 'square.and.arrow.down.on.square',
  },
  ViewInBitcoin: {
    iconValue: 'bitcoinsign.circle',
  },
  ViewInFiat: {
    iconValue: 'coloncurrencysign.circle',
  },
};

export const CommonToolTipActions = {
  CopyTXID: {
    id: keys.CopyTXID,
    text: loc.transactions.details_copy_txid,
    icon: icons.Clipboard,
  },
  CopyBlockExplorerLink: {
    id: keys.CopyBlockExplorerLink,
    text: loc.transactions.details_copy_block_explorer_link,
    icon: icons.Clipboard,
  },
  OpenInBlockExplorer: {
    id: keys.OpenInBlockExplorer,
    text: loc.transactions.details_show_in_block_explorer,
    icon: icons.Link,
  },
  ExpandNote: {
    id: keys.ExpandNote,
    text: loc.transactions.expand_note,
    icon: icons.Note,
  },
  CopyAmount: {
    id: keys.CopyAmount,
    text: loc.transactions.details_copy_amount,
    icon: icons.Clipboard,
  },
  CopyNote: {
    id: keys.CopyNote,
    text: loc.transactions.details_copy_note,
    icon: icons.Clipboard,
  },
  ManageWallet: {
    id: keys.ManageWallets,
    text: loc.wallets.manage_title,
    icon: icons.ManageWallets,
  },
  ImportWallet: {
    id: keys.ImportWallet,
    text: loc.wallets.add_import_wallet,
    icon: icons.ImportWallet,
  },
  HideBalance: {
    id: keys.HideBalance,
    text: loc.transactions.details_balance_hide,
    icon: icons.EyeSlash,
  },
  ViewInFiat: {
    id: keys.ViewInFiat,
    text: loc.total_balance_view.view_in_fiat,
    icon: icons.ViewInFiat,
  },

  ViewInSats: {
    id: keys.ViewInSats,
    text: loc.total_balance_view.view_in_sats,
    icon: icons.ViewInBitcoin,
  },
  ViewInBitcoin: {
    id: keys.ViewInBitcoin,
    text: loc.total_balance_view.view_in_bitcoin,
    icon: icons.ViewInBitcoin,
  },
};
