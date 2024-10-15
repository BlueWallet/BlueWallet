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
  Entropy: 'entropy',
  SearchAccount: 'searchAccount',
  Passphrase: 'passphrase',
  MoreInfo: 'moreInfo',
  SaveChanges: 'saveChanges',
  PaymentsCode: 'paymentsCode',
  RemoveAllRecipients: 'RemoveAllRecipients',
  AddRecipient: 'AddRecipient',
  RemoveRecipient: 'RemoveRecipient',
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
  Entropy: {
    iconValue: 'dice',
  },
  SearchAccount: {
    iconValue: 'magnifyingglass',
  },
  Passphrase: {
    iconValue: 'rectangle.and.pencil.and.ellipsis',
  },
  MoreInfo: {
    iconValue: 'info.circle',
  },
  SaveChanges: {
    iconValue: 'checkmark',
  },
  PaymentsCode: {
    iconValue: 'qrcode',
  },
  RemoveAllRecipients: { iconValue: 'person.2.slash' },
  AddRecipient: { iconValue: 'person.badge.plus' },
  RemoveRecipient: { iconValue: 'person.badge.minus' },
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
  AddRecipient: {
    id: keys.AddRecipient,
    text: loc.send.details_add_rec_add,
    icon: icons.AddRecipient,
  },
  RemoveRecipient: {
    id: keys.RemoveRecipient,
    text: loc.send.details_add_rec_rem,
    icon: icons.RemoveRecipient,
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
  Entropy: {
    id: keys.Entropy,
    text: loc.wallets.add_entropy_provide,
    icon: icons.Entropy,
  },
  RemoveAllRecipients: {
    id: keys.RemoveAllRecipients,
    text: loc.send.details_add_rec_rem_all,
    icon: icons.RemoveAllRecipients,
  },
  SearchAccount: {
    id: keys.SearchAccount,
    text: loc.wallets.import_search_accounts,
    icon: icons.SearchAccount,
    menuState: false,
  },
  Passphrase: {
    id: keys.Passphrase,
    text: loc.wallets.import_passphrase,
    icon: icons.Passphrase,
    menuState: false,
  },
  MoreInfo: {
    id: keys.MoreInfo,
    text: loc.wallets.more_info,
    icon: icons.MoreInfo,
    hidden: false,
  },
  SaveChanges: {
    id: keys.SaveChanges,
    text: loc._.save,
    icon: icons.SaveChanges,
  },
  PaymentCode: {
    id: keys.PaymentsCode,
    text: loc.bip47.purpose,
    icon: icons.PaymentsCode,
    menuState: false,
  },
};
