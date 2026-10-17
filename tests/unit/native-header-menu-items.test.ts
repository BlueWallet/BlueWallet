import { mapActionsToNativeHeaderMenuItems, mapActionGroupsToNativeHeaderMenuItems } from '../../components/nativeHeaderMenuItems';

describe('nativeHeaderMenuItems', () => {
  it('adds identifiers to action items', () => {
    const items = mapActionsToNativeHeaderMenuItems(
      [{ id: 'sign_psbt', text: 'Sign a transaction', subtitle: 'Choose a PSBT file', disabled: true }],
      jest.fn(),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: 'action',
      label: 'Sign a transaction',
      identifier: 'sign_psbt',
      description: 'Choose a PSBT file',
      discoverabilityLabel: 'Choose a PSBT file',
      disabled: true,
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

  it('preserves action groups as inline native menu sections', () => {
    const items = mapActionGroupsToNativeHeaderMenuItems(
      [
        [{ id: 'add', text: 'Add Server' }],
        [
          { id: 'import', text: 'Import History' },
          { id: 'export', text: 'Export History', disabled: true },
        ],
      ],
      jest.fn(),
      true,
    );

    expect(items).toHaveLength(2);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'submenu', inline: true, items: [expect.objectContaining({ identifier: 'add' })] }),
        expect.objectContaining({
          type: 'submenu',
          inline: true,
          items: [expect.objectContaining({ identifier: 'import' }), expect.objectContaining({ identifier: 'export', disabled: true })],
        }),
      ]),
    );
  });
});
