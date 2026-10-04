import loc from '../loc';
import { headerMenuShortcuts, type HeaderMenuShortcut } from './headerMenuShortcuts';
import type { Action } from '../components/types';

export type HeaderMenuEntry = Action & { onPress?: () => void };
export type HeaderMenuOptions = {
  headerMenuCloseAction?: HeaderMenuEntry;
  headerMenuActions?: HeaderMenuEntry[] | HeaderMenuEntry[][];
};
export type NativeHeaderMenuEntry = {
  id: string;
  title: string;
  disabled: boolean;
  destructive: boolean;
  shortcut?: HeaderMenuShortcut;
  subtitle?: string;
  icon?: string;
  state?: 'mixed' | boolean;
  inline?: boolean;
  children?: NativeHeaderMenuEntry[];
};

// Ellipses indicate additional input, not merely opening a details view or Help.
function normalizeHeaderMenuTitle(id: string, title: string, isParent: boolean): string {
  const plain = title
    .trim()
    .replace(/(?:\.\.\.|…)$/, '')
    .trimEnd();
  const needsInput = [
    'insert_contact',
    'import_transaction',
    'import_transaction_multisig',
    'import_transaction_qr',
    'ExportTransaction',
    'share',
    'saveFile',
    'scan_qr',
    'choose_photo',
    'import_file',
  ].includes(id);
  return needsInput && !isParent ? `${plain}…` : plain;
}

function separateRelatedCommands(items: NativeHeaderMenuEntry[], group: string): NativeHeaderMenuEntry[] {
  const sections = new Map<string, NativeHeaderMenuEntry[]>();
  for (const item of items) {
    const id = item.id.split(':').at(-1)!;
    const section = item.destructive
      ? 'destructive'
      : group === 'sort' && ['sortASC', 'sortDESC'].includes(id)
        ? 'direction'
        : group === 'transaction' && id.startsWith('import_transaction')
          ? 'import'
          : id === 'NavigationCloseButton'
            ? 'close'
            : 'main';
    const entries = sections.get(section) ?? [];
    entries.push(item);
    sections.set(section, entries);
  }
  if (sections.size <= 1) return items;
  return [...sections]
    .sort(([a], [b]) => Number(a === 'destructive') - Number(b === 'destructive'))
    .map(([section, children]) => ({
      id: `section:${group}:${section}`,
      title: '',
      inline: true,
      disabled: false,
      destructive: false,
      children,
    }));
}

export function buildHeaderMenu(
  actions: HeaderMenuEntry[] | HeaderMenuEntry[][],
  screenKey: string,
): { items: NativeHeaderMenuEntry[]; handlers: Record<string, () => void> } {
  const handlers: Record<string, () => void> = {};
  const map = (entries: HeaderMenuEntry[], parentDisabled = false): NativeHeaderMenuEntry[] =>
    entries
      .filter(entry => !entry.hidden)
      .map(entry => {
        const id = `header:${screenKey}:${entry.id}`;
        const disabled = parentDisabled || Boolean(entry.disabled);
        const children = entry.subactions ? map(entry.subactions, disabled) : undefined;
        if (!disabled && !children?.length && entry.onPress) handlers[id] = entry.onPress;
        return {
          id,
          title: normalizeHeaderMenuTitle(String(entry.id), entry.text, Boolean(children?.length)),
          subtitle: entry.subtitle,
          shortcut: children?.length ? undefined : headerMenuShortcuts[String(entry.id)],
          disabled,
          destructive: Boolean(entry.destructive),
          icon: entry.icon?.iconValue ?? entry.image,
          state: entry.menuState,
          inline: entry.displayInline,
          children,
        };
      });
  const items = Array.isArray(actions[0])
    ? (actions as HeaderMenuEntry[][])
        .map((group, index) => ({
          id: `group:${index}`,
          title: '',
          disabled: false,
          destructive: false,
          inline: true,
          children: map(group),
        }))
        .filter(group => group.children.length > 0)
    : map(actions as HeaderMenuEntry[]);
  return { items, handlers };
}

export function attachHeaderMenuHandlers(
  actions: Action[] | Action[][],
  onPress: (id: string) => void,
  disabled = false,
): HeaderMenuEntry[] | HeaderMenuEntry[][] {
  const map = (entries: Action[]): HeaderMenuEntry[] =>
    entries.map(entry => ({
      ...entry,
      disabled: disabled || entry.disabled,
      onPress: () => onPress(String(entry.id)),
      subactions: entry.subactions ? map(entry.subactions) : undefined,
    }));
  return Array.isArray(actions[0]) ? (actions as Action[][]).map(map) : map(actions as Action[]);
}

/** Group screen commands by the object they operate on, across native platforms. */
export function groupHeaderMenu(items: NativeHeaderMenuEntry[], screenName: string): NativeHeaderMenuEntry[] {
  const groups = new Map<string, NativeHeaderMenuEntry[]>();
  const titles: Record<string, string> = {
    file: loc._.menu_file,
    edit: loc._.menu_edit,
    view: loc._.menu_view,
    recipients: loc._.menu_recipients,
    transaction: loc._.menu_transaction,
    wallet: loc._.menu_wallet,
    sort: loc._.menu_sort,
    help: loc._.menu_help,
    server: loc._.menu_server,
    settings: loc._.menu_settings,
  };
  const defaultGroup =
    screenName === 'ElectrumSettings'
      ? 'server'
      : /Send|Confirm|CreateTransaction|CoinControl/.test(screenName)
        ? 'transaction'
        : /Settings/.test(screenName)
          ? 'settings'
          : 'wallet';
  const preserveNamedParents = (item: NativeHeaderMenuEntry): NativeHeaderMenuEntry => ({
    ...item,
    inline: item.title && item.children?.length ? false : item.inline,
    children: item.children?.map(preserveNamedParents),
  });
  const add = (item: NativeHeaderMenuEntry) => {
    // Anonymous inline sections are separators, not meaningful parent menus.
    if (item.inline && !item.title && item.children) {
      item.children.forEach(add);
      return;
    }
    const id = item.id.split(':').at(-1)!;
    const group = ['AddRecipient', 'RemoveRecipient', 'RemoveAllRecipients', 'insert_contact'].includes(id)
      ? 'recipients'
      : /^(sort|Sort)/.test(id)
        ? 'sort'
        : ['MultisigHelp', 'moreInfo'].includes(id)
          ? 'help'
          : [
                'copyTX_ID',
                'copy_blockExplorer',
                'copyAmount',
                'copyNote',
                'copyToClipboard',
                'pasteFromClipboard',
                'clearClipboard',
              ].includes(id)
            ? 'edit'
            : ['share', 'saveFile', 'ExportTransaction', 'NavigationCloseButton', 'open_recent'].includes(id)
              ? 'file'
              : ['hideBalance', 'hide', 'viewInBitcoin', 'viewInSats', 'viewInFiat'].includes(id)
                ? 'view'
                : defaultGroup;
    const parent = group === 'wallet' ? 'file' : group;
    const entries = groups.get(parent) ?? [];
    entries.push(preserveNamedParents(item));
    groups.set(parent, entries);
  };
  items.forEach(add);
  const order = ['file', 'edit', 'view', 'wallet', 'transaction', 'recipients', 'sort', 'server', 'settings', 'help'];
  return [...groups]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([group, children]) => ({
      id: `category:${group}`,
      title: titles[group],
      disabled: false,
      destructive: false,
      children: separateRelatedCommands(children, group),
    }));
}
