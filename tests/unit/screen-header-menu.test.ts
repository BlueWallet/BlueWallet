import { renderHook } from '@testing-library/react-native';
import useScreenHeaderMenu from '../../hooks/useScreenHeaderMenu';
import useMenuElements from '../../hooks/useMenuElements';

let mockFocused = true;
let mockUsesHeaderMenu = true;
jest.mock('../../components/HeaderMenu', () => ({
  get usesHeaderMenu() {
    return mockUsesHeaderMenu;
  },
}));
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ key: 'details' }),
  useFocusEffect: (callback: () => (() => void) | void) => {
    const React = require('react');
    const focused = mockFocused;
    React.useEffect(() => (focused ? callback() : undefined), [callback, focused]);
  },
}));
jest.mock('../../hooks/useMenuElements', () => ({ __esModule: true, default: jest.fn() }));

it('updates commands, unregisters on blur, and leaves phones unchanged', () => {
  const unregister = jest.fn();
  const registerHeaderMenu = jest.fn(() => unregister);
  jest
    .mocked(useMenuElements)
    .mockReturnValue({ registerHeaderMenu, registerMenuActions: jest.fn(() => jest.fn()), isMenuElementsSupported: true });
  const actions = [{ id: 'share', text: 'Share', onPress: jest.fn() }];
  const hook = renderHook(({ items }) => useScreenHeaderMenu(items), { initialProps: { items: actions } });
  expect(registerHeaderMenu).toHaveBeenLastCalledWith(actions, 'details');
  mockFocused = false;
  hook.rerender({ items: actions });
  expect(unregister).toHaveBeenCalledTimes(1);
  mockFocused = true;
  mockUsesHeaderMenu = false;
  hook.rerender({ items: actions });
  expect(registerHeaderMenu).toHaveBeenCalledTimes(1);
  hook.unmount();
});
