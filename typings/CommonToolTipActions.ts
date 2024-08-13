import loc from '../loc';

const keys = {
  CopyTXID: 'copyTX_ID',
  CopyBlockExplorerLink: 'copy_blockExplorer',
  ExpandNote: 'expandNote',
  OpenInBlockExplorer: 'open_in_blockExplorer',
  CopyAmount: 'copyAmount',
  CopyNote: 'copyNote',
  CopyToClipboard: 'copyToClipboard',
  WalletBalanceDisplay: 'WalletBalanceDisplay',
  WalletBalanceHide: 'WalletBalanceHide',
  Refill: 'refill',
  RefillWithExternalWallet: 'refillWithExternalWallet',
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
  Refill: {
    iconValue: 'goforward.plus',
  },
  RefillWithExternalWallet: {
    iconValue: 'qrcode',
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
  CopyToClipboard: {
    id: keys.CopyToClipboard,
    text: loc.send.psbt_clipboard,
    icon: icons.Clipboard,
  },
  WalletBalanceDisplay: {
    id: keys.WalletBalanceDisplay,
    text: loc.transactions.details_balance_show,
    icon: icons.Eye,
  },
  WalletBalanceHide: {
    id: keys.WalletBalanceHide,
    text: loc.transactions.details_balance_hide,
    icon: icons.EyeSlash,
  },
  Refill: {
    id: keys.Refill,
    text: loc.lnd.refill,
    icon: icons.Refill,
  },
  RefillWithExternalWallet: {
    id: keys.RefillWithExternalWallet,
    text: loc.lnd.refill_external,
    icon: icons.RefillWithExternalWallet,
  },
};
