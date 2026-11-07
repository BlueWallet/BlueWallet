import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import ToolTipMenu from '../../components/TooltipMenu';
import { createHistoryExportMenuActions, SAVE_ACCOUNTING_ACTION_ID, SAVE_BACKUP_ACTION_ID } from '../../blue_modules/wallet-history-export';
import { Chain } from '../../models/bitcoinUnits';

jest.mock('../../hooks/context/useSettings', () => ({ useSettings: () => ({ language: 'en' }) }));
jest.mock('react-native-context-menu-view', () => {
  const { View } = require('react-native');
  return ({ children, ...props }: any) => (
    <View testID="NativeHistoryMenu" {...props}>
      {children}
    </View>
  );
});

describe('history menu interaction', () => {
  it.each([
    [[0, 1], SAVE_ACCOUNTING_ACTION_ID],
    [[1, 1], SAVE_BACKUP_ACTION_ID],
  ])('dispatches the Android native selection %s to its export handler', (indexPath, expectedId) => {
    const { Platform } = require('react-native');
    const originalPlatform = Platform.OS;
    Platform.OS = 'android';
    try {
      const onPressMenuItem = jest.fn();
      const screen = render(
        <ToolTipMenu
          actions={createHistoryExportMenuActions(Chain.ONCHAIN, 1, 'Export History', 'Import Notes', false, false, 'android')}
          onPressMenuItem={onPressMenuItem}
          isButton
        >
          <Text>Export History</Text>
        </ToolTipMenu>,
      );
      const menu = screen.getByTestId('NativeHistoryMenu');
      expect(menu.props.actions.map((action: { title: string }) => action.title)).toEqual(['Accounting', 'Wallet Labels', 'Import Notes']);
      act(() => menu.props.onPress({ nativeEvent: { indexPath } }));
      expect(onPressMenuItem).toHaveBeenCalledWith(expectedId);
      screen.unmount();
    } finally {
      Platform.OS = originalPlatform;
    }
  });
});
