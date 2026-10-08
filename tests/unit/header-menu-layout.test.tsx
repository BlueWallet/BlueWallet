import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import HeaderMenu from '../../components/HeaderMenu';

let mockFocused = true;
const mockUnregister = jest.fn();
const mockRegister = jest.fn(() => mockUnregister);
jest.mock('../../components/AndroidHeaderMenuBar', () => () => null);
jest.mock('../../blue_modules/environment', () => ({ isTablet: true, isDesktop: false }));
jest.mock('../../hooks/useMenuElements', () => ({
  __esModule: true,
  default: () => ({ registerHeaderMenu: mockRegister }),
}));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ key: 'layout' }),
  useFocusEffect: (callback: () => (() => void) | void) => {
    const focused = mockFocused;
    React.useEffect(() => (focused ? callback() : undefined), [callback, focused]);
  },
}));

it('registers the committed options, updates them and cleans up when focus moves', () => {
  const first = [{ id: 'done', text: 'Done', onPress: jest.fn() }];
  const second = [{ id: 'done', text: 'Done', disabled: true, onPress: jest.fn() }];
  const screen = (actions: typeof first | typeof second) => (
    <HeaderMenu options={{ headerMenuActions: actions }} routeKey="modal">
      <Text>Screen content</Text>
    </HeaderMenu>
  );
  const view = render(screen(first));
  expect(view.getByText('Screen content')).toBeTruthy();
  expect(mockRegister).toHaveBeenLastCalledWith(first, 'modal');
  view.rerender(screen(second));
  expect(mockUnregister).toHaveBeenCalledTimes(1);
  expect(mockRegister).toHaveBeenLastCalledWith(second, 'modal');
  mockFocused = false;
  view.rerender(screen(second));
  expect(mockUnregister).toHaveBeenCalledTimes(2);
  mockFocused = true;
  view.rerender(screen(second));
  expect(mockRegister).toHaveBeenCalledTimes(3);
  view.unmount();
  expect(mockUnregister).toHaveBeenCalledTimes(3);
});

it('retains Close keyboard registration when a screen updates its own actions', () => {
  const close = { id: 'NavigationCloseButton', text: 'Close', onPress: jest.fn() };
  const details = { id: 'TransactionDetailsButton', text: 'Details', onPress: jest.fn() };
  const screen = (headerMenuActions: (typeof details)[]) => (
    <HeaderMenu options={{ headerMenuActions, headerMenuCloseAction: close }} routeKey="sheet">
      <Text>Sheet content</Text>
    </HeaderMenu>
  );
  const view = render(screen([]));
  expect(mockRegister).toHaveBeenLastCalledWith([close], 'sheet');
  view.rerender(screen([details]));
  expect(mockRegister).toHaveBeenLastCalledWith([details, close], 'sheet');
  view.unmount();
});
