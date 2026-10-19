import { renderHook } from '@testing-library/react-native';
import useScreenMenuActions from '../../hooks/useScreenMenuActions';
import useMenuElements from '../../hooks/useMenuElements';
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
jest.mock('../../hooks/useMenuElements', () => ({
  __esModule: true,
  default: jest.fn(),
}));

it('keeps committed handlers fresh, removes unavailable commands, and registers again on refocus', () => {
  const unregister = jest.fn();
  const register = jest.fn((_handlers: MenuActionHandlers, _routeKey: string) => unregister);
  jest.mocked(useMenuElements).mockReturnValue({ registerMenuActions: register, isMenuElementsSupported: true });
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
