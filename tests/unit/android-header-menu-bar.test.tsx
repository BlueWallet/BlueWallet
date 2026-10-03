import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AndroidHeaderMenuBar from '../../components/AndroidHeaderMenuBar';

let mockRoute: { key: string; name: string } = { key: 'leaf', name: 'SendDetails' };
let mockReady = true;
const mockOpen = jest.fn();
jest.mock('../../NavigationService', () => ({
  navigationRef: {
    isReady: () => mockReady,
    getCurrentRoute: () => mockRoute,
    addListener: () => jest.fn(),
  },
}));
jest.mock('../../blue_modules/NativeMenuElementsEmitter', () => ({ __esModule: true, default: { openMenu: () => mockOpen() } }));
jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));

it('shows one accessible menu button on the leaf screen and opens the native menu', () => {
  const parent = render(<AndroidHeaderMenuBar routeKey="parent" />);
  expect(parent.queryByTestId('AndroidAppMenuButton')).toBeNull();
  parent.unmount();
  const leaf = render(<AndroidHeaderMenuBar routeKey="leaf" />);
  const button = leaf.getByRole('button', { name: 'Open app menu' });
  expect(button.props.accessibilityHint).toBe('Opens commands for the current screen and app');
  fireEvent.press(button);
  expect(mockOpen).toHaveBeenCalledTimes(1);
  leaf.unmount();
});

it('does not expose app menus before navigation is ready or while locked', () => {
  mockReady = false;
  const view = render(<AndroidHeaderMenuBar routeKey="leaf" />);
  expect(view.queryByRole('button')).toBeNull();
  mockReady = true;
  mockRoute = { key: 'leaf', name: 'UnlockWithScreen' };
  view.rerender(<AndroidHeaderMenuBar routeKey="leaf" />);
  expect(view.queryByRole('button')).toBeNull();
  view.unmount();
});
