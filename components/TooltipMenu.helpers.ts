import { ContextMenuAction } from 'react-native-context-menu-view';
import { Action } from './types';

export type Platform = 'ios' | 'android';

// Mirrors the structure of the items we hand to the native ContextMenu, with
// the original Action.id at every node. We walk this in lockstep with the
// indexPath the native side returns on press, so two actions sharing the same
// visible text (think localized "Copy") cannot collide.
export type IdNode = {
  id?: string;
  children?: IdNode[];
};

export const normalizeMenuState = (menuState?: Action['menuState']): boolean | undefined => {
  if (menuState === undefined) return undefined;
  return menuState === 'mixed' ? true : Boolean(menuState);
};

const mapLeaf = (action: Action, platform: Platform): { item: ContextMenuAction; idNode: IdNode } | null => {
  if (!action?.id || action.hidden) return null;

  const subResults = (action.subactions ?? [])
    .map(sub => mapLeaf(sub, platform))
    .filter((r): r is { item: ContextMenuAction; idNode: IdNode } => r !== null);

  const item: ContextMenuAction = {
    title: action.text,
    subtitle: action.subtitle,
    systemIcon: platform === 'ios' ? (action.icon?.iconValue ?? action.image) : undefined,
    icon: platform === 'android' ? (action.icon?.iconValue ?? action.image) : undefined,
    iconColor: typeof action.imageColor === 'string' ? action.imageColor : undefined,
    destructive: Boolean(action.destructive),
    disabled: Boolean(action.disabled),
    inlineChildren: platform === 'ios' ? action.displayInline : undefined,
  };

  const selected = normalizeMenuState(action.menuState);
  if (selected !== undefined) item.selected = selected;
  if (subResults.length > 0) item.actions = subResults.map(r => r.item);

  const idNode: IdNode = { id: String(action.id) };
  if (subResults.length > 0) idNode.children = subResults.map(r => r.idNode);

  return { item, idNode };
};

/**
 * Build the items array passed to the native ContextMenu and a parallel
 * id-tree of the exact same shape. Returning both in a single pass guarantees
 * they cannot drift apart.
 *
 * iOS preserves grouping (with synthetic inline parents); Android flattens
 * because its native menu doesn't render inline groups.
 */
export const buildMenu = (actions: Action[] | Action[][], platform: Platform): { items: ContextMenuAction[]; ids: IdNode[] } => {
  const items: ContextMenuAction[] = [];
  const ids: IdNode[] = [];

  if (platform === 'ios') {
    for (const group of actions) {
      if (Array.isArray(group)) {
        const inline = group.map(a => mapLeaf(a, platform)).filter((r): r is { item: ContextMenuAction; idNode: IdNode } => r !== null);
        if (inline.length === 0) continue;
        items.push({
          title: '',
          actions: inline.map(r => r.item),
          inlineChildren: true,
        } as ContextMenuAction);
        // Synthetic inline group: no id of its own, only carries children.
        ids.push({ children: inline.map(r => r.idNode) });
      } else {
        const r = mapLeaf(group, platform);
        if (r) {
          items.push(r.item);
          ids.push(r.idNode);
        }
      }
    }
    return { items, ids };
  }

  for (const action of actions.flat()) {
    const r = mapLeaf(action, platform);
    if (r) {
      items.push(r.item);
      ids.push(r.idNode);
    }
  }
  return { items, ids };
};

/**
 * Resolve the original Action.id for a press event by walking the id-tree
 * with the path delivered by the native side.
 *
 * Path semantics:
 * - iOS: indexPath is always populated, full path from root.
 * - Android top-level: only `index` is set; we synthesize `[index]`.
 * - Android submenu: indexPath is `[parentIndex, childIndex]`.
 */
export const lookupId = (ids: IdNode[], path: readonly number[]): string | undefined => {
  if (path.length === 0) return undefined;

  let nodes: IdNode[] | undefined = ids;
  let node: IdNode | undefined;

  for (const i of path) {
    if (!nodes || i < 0 || i >= nodes.length) return undefined;
    node = nodes[i];
    nodes = node.children;
  }

  return node?.id;
};
