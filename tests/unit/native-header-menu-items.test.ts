import { mapActionsToNativeHeaderMenuItems, mapActionGroupsToNativeHeaderMenuItems } from '../../components/nativeHeaderMenuItems';

describe('nativeHeaderMenuItems', () => {
  it('adds identifiers to action items', () => {
    const items = mapActionsToNativeHeaderMenuItems([{ id: 'sign_psbt', text: 'Sign a transaction' }], jest.fn());

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: 'action',
      label: 'Sign a transaction',
      identifier: 'sign_psbt',
    });
  });

  it('adds identifiers recursively to submenu items', () => {
    const items = mapActionGroupsToNativeHeaderMenuItems(
      [[{ id: 'parent', text: 'Parent', subactions: [{ id: 'child', text: 'Child' }] }]],
      jest.fn(),
      true,
    );

    expect(items[0]).toMatchObject({
      type: 'submenu',
      items: [
        {
          type: 'submenu',
          label: 'Parent',
          identifier: 'parent',
          items: [{ type: 'action', label: 'Child', identifier: 'child' }],
        },
      ],
    });
  });
});
