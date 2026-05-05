import { buildMenu, lookupId, normalizeMenuState } from '../../components/TooltipMenu.helpers';
import type { Action } from '../../components/types';

describe('TooltipMenu.helpers', () => {
  describe('normalizeMenuState', () => {
    it('returns undefined when state is undefined', () => {
      expect(normalizeMenuState(undefined)).toBeUndefined();
    });

    it('coerces "mixed" to true', () => {
      expect(normalizeMenuState('mixed')).toBe(true);
    });

    it('passes booleans through', () => {
      expect(normalizeMenuState(true)).toBe(true);
      expect(normalizeMenuState(false)).toBe(false);
    });
  });

  describe('buildMenu', () => {
    const copyAddress: Action = { id: 'copy-address', text: 'Copy' };
    const share: Action = { id: 'share', text: 'Share' };
    const remove: Action = { id: 'delete', text: 'Delete', destructive: true };

    it('preserves grouping on iOS with synthetic inline parents', () => {
      const { items, ids } = buildMenu([[share, remove], [copyAddress]], 'ios');

      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({ title: '', inlineChildren: true });
      expect(items[0].actions).toHaveLength(2);
      expect(items[1]).toMatchObject({ title: '', inlineChildren: true });
      expect(items[1].actions).toHaveLength(1);

      // id-tree mirrors the items tree exactly.
      expect(ids).toHaveLength(2);
      expect(ids[0].id).toBeUndefined(); // synthetic group has no id
      expect(ids[0].children).toHaveLength(2);
      expect(ids[0].children?.[0].id).toBe('share');
      expect(ids[0].children?.[1].id).toBe('delete');
      expect(ids[1].children?.[0].id).toBe('copy-address');
    });

    it('flattens groups on Android', () => {
      const { items, ids } = buildMenu([[share, remove], [copyAddress]], 'android');

      expect(items).toHaveLength(3);
      expect(items.map(i => i.title)).toEqual(['Share', 'Delete', 'Copy']);
      expect(ids.map(n => n.id)).toEqual(['share', 'delete', 'copy-address']);
    });

    it('skips hidden actions and actions without an id', () => {
      const hidden: Action = { id: 'hidden', text: 'Hidden', hidden: true };
      const noId = { text: 'Bad' } as unknown as Action;

      const { items, ids } = buildMenu([share, hidden, noId, remove], 'android');

      expect(items.map(i => i.title)).toEqual(['Share', 'Delete']);
      expect(ids.map(n => n.id)).toEqual(['share', 'delete']);
    });

    it('maps subactions recursively and reflects them in the id-tree', () => {
      const parent: Action = {
        id: 'export',
        text: 'Export',
        subactions: [
          { id: 'export-share', text: 'Share' },
          { id: 'export-save', text: 'Save' },
        ],
      };
      const { items, ids } = buildMenu([parent], 'ios');

      expect(items[0].actions).toHaveLength(2);
      expect(ids[0].id).toBe('export');
      expect(ids[0].children?.map(n => n.id)).toEqual(['export-share', 'export-save']);
    });

    it('assigns icons to the platform-appropriate field', () => {
      const withIcon: Action = { id: 'x', text: 'X', icon: { iconValue: 'star' } };
      expect(buildMenu([withIcon], 'ios').items[0]).toMatchObject({ systemIcon: 'star', icon: undefined });
      expect(buildMenu([withIcon], 'android').items[0]).toMatchObject({ icon: 'star', systemIcon: undefined });
    });
  });

  describe('lookupId', () => {
    // Two actions with identical visible text would have collided in the
    // old title-based map. The id-tree resolves them by position instead.
    const collisionFixture = (() => {
      const copyA: Action = { id: 'copy-a', text: 'Copy' };
      const copyB: Action = { id: 'copy-b', text: 'Copy' };
      return buildMenu([copyA, copyB], 'android').ids;
    })();

    it('returns the correct id for each twin even when visible text matches', () => {
      expect(lookupId(collisionFixture, [0])).toBe('copy-a');
      expect(lookupId(collisionFixture, [1])).toBe('copy-b');
    });

    it('walks into nested submenus on iOS', () => {
      const parent: Action = {
        id: 'export',
        text: 'Export',
        subactions: [
          { id: 'export-share', text: 'Share' },
          { id: 'export-save', text: 'Save' },
        ],
      };
      const { ids } = buildMenu([parent], 'ios');

      expect(lookupId(ids, [0])).toBe('export');
      expect(lookupId(ids, [0, 0])).toBe('export-share');
      expect(lookupId(ids, [0, 1])).toBe('export-save');
    });

    it('walks through synthetic iOS inline groups', () => {
      const a: Action = { id: 'a', text: 'A' };
      const b: Action = { id: 'b', text: 'B' };
      const { ids } = buildMenu([[a, b]], 'ios');

      // path[0] selects the synthetic inline group; path[1] picks the leaf.
      expect(lookupId(ids, [0, 0])).toBe('a');
      expect(lookupId(ids, [0, 1])).toBe('b');
      // The synthetic group itself has no id and cannot be pressed.
      expect(lookupId(ids, [0])).toBeUndefined();
    });

    it('returns undefined for empty path or out-of-range indices', () => {
      const { ids } = buildMenu([{ id: 'only', text: 'Only' }], 'android');
      expect(lookupId(ids, [])).toBeUndefined();
      expect(lookupId(ids, [5])).toBeUndefined();
      expect(lookupId(ids, [-1])).toBeUndefined();
    });
  });
});
