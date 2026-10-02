import { renderHook } from '@testing-library/react-native';
import useScreenMenuActions from '../../hooks/useScreenMenuActions';
import useMenuActions from '../../hooks/useMenuActions';
import type { MenuActionHandlers } from '../../blue_modules/menuActions';

let mockFocused = true;
const mockRoute = { key: 'wallet-1', name: 'WalletTransactions' };
jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRoute,
  useFocusEffect: (callback: () => (() => void) | void) => {
    const React = require('react');
    const focused = mockFocused;
    React.useEffect(() => (focused ? callback() : undefined), [callback, focused]);
  },
}));
jest.mock('../../hooks/useMenuActions', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../components/Context/recentMenuItems', () => ({ recordRecentMenuItem: jest.fn() }));

it('keeps committed handlers fresh, removes unavailable commands, and registers again on refocus', () => {
  const unregister = jest.fn();
  const register = jest.fn((_handlers: MenuActionHandlers, _routeKey: string) => unregister);
  jest.mocked(useMenuActions).mockReturnValue({ registerMenuActions: register, isMenuActionsSupported: true });
  const oldSend = jest.fn();
  const newSend = jest.fn();
  const hook = renderHook(({ send }: { send: (() => void) | undefined }) => useScreenMenuActions({ send }), {
    initialProps: { send: oldSend as (() => void) | undefined },
  });
  const commands = register.mock.calls[0][0];
  hook.rerender({ send: newSend });
  expect(register).toHaveBeenCalledTimes(1);
  commands.send!();
  expect(newSend).toHaveBeenCalledTimes(1);
  expect(oldSend).not.toHaveBeenCalled();
  hook.rerender({ send: undefined });
  expect(unregister).toHaveBeenCalledTimes(1);
  commands.send!();
  expect(newSend).toHaveBeenCalledTimes(1);
  expect(register.mock.lastCall![0]).toEqual({});
  mockFocused = false;
  hook.rerender({ send: newSend });
  expect(unregister).toHaveBeenCalledTimes(2);
  mockFocused = true;
  hook.rerender({ send: newSend });
  expect(register.mock.lastCall![0]).toHaveProperty('send');
  hook.unmount();
  expect(unregister).toHaveBeenCalledTimes(3);
});

it('registers header menu enabled and checked state', () => {
  const register = jest.fn(() => jest.fn());
  jest.mocked(useMenuActions).mockReturnValue({ registerMenuActions: register, isMenuActionsSupported: true });
  const send = jest.fn();
  renderHook(() => useScreenMenuActions({ send }, undefined, { send: { disabled: true, checked: false } }));
  expect(register).toHaveBeenCalledWith({ send: expect.any(Function) }, 'wallet-1', { send: { disabled: true, checked: false } });
});
