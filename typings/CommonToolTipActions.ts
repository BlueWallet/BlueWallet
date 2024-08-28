import { Action } from '../components/types';
import loc from '../loc';

// Define the type for the keys object
interface Keys {
  CopyTXID: string;
  CopyBlockExplorerLink: string;
  ExpandNote: string;
  OpenInBlockExplorer: string;
  CopyAmount: string;
  CopyNote: string;
  HideBalance: string;
  ViewInBitcoin: string;
  ViewInSats: string;
  ViewInFiat: string;
  Sent: string;
  Received: string;
  Pending: string;
  MustHaveMemo: string;
}

const keys: Keys = {
  CopyTXID: 'copyTX_ID',
  CopyBlockExplorerLink: 'copy_blockExplorer',
  ExpandNote: 'expandNote',
  OpenInBlockExplorer: 'open_in_blockExplorer',
  CopyAmount: 'copyAmount',
  CopyNote: 'copyNote',
  HideBalance: 'hideBalance',
  ViewInBitcoin: 'viewInBitcoin',
  ViewInSats: 'viewInSats',
  ViewInFiat: 'viewInFiat',
  Sent: 'sent',
  Received: 'received',
  Pending: 'pending',
  MustHaveMemo: 'containsMemo',
};

// Define the type for icon objects
interface Icon {
  iconValue: string;
}

const icons: Record<string, Icon> = {
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
  ContainsNote: {
    iconValue: 'note.text',
  },
  ViewInBitcoin: {
    iconValue: 'bitcoinsign.circle',
  },
  ViewInFiat: {
    iconValue: 'coloncurrencysign.circle',
  },
};

// Define the type for the CommonToolTipActions object
type CommonToolTipActionsType = Record<string, Action>;

export const CommonToolTipActions: CommonToolTipActionsType = {
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
  Sent: {
    id: keys.Sent,
    text: loc.send.sent,
    menuState: false,
  },
  Received: {
    id: keys.Received,
    text: loc.transactions.details_received,
    menuState: false,
  },
  Pending: {
    id: keys.Pending,
    text: loc.transactions.pending,
    menuState: false,
  },
  MustHaveMemo: {
    id: keys.MustHaveMemo,
    text: loc.transactions.must_have_memo,
    menuState: false,
  },
};