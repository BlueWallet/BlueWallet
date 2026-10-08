import React from 'react';
import { render } from '@testing-library/react-native';
import AndroidHeaderMenuBar from '../../components/AndroidHeaderMenuBar';

let mockRoute: { key: string; name: string } = { key: 'leaf', name: 'SendDetails' };
let mockReady = true;
jest.mock('../../NavigationService', () => ({
  navigationRef: {
    isReady: () => mockReady,
    getCurrentRoute: () => mockRoute,
    addListener: () => jest.fn(),
  },
}));
jest.mock('../../blue_modules/NativeMenuElementsEmitter', () => ({ __esModule: true, default: {} }));
jest.mock('../../codegen/AppMenuButtonNativeComponent', () => require('react-native').View);
jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));

it('mounts one native menu button on the leaf screen', () => {
  const parent = render(<AndroidHeaderMenuBar routeKey="parent" />);
  expect(parent.queryByTestId('AndroidAppMenuButton')).toBeNull();
  parent.unmount();
  const leaf = render(<AndroidHeaderMenuBar routeKey="leaf" />);
  expect(leaf.getByTestId('AndroidAppMenuButton').props.nativeID).toBe('AndroidAppMenuAnchor');
  leaf.unmount();
});

it('does not expose app menus before navigation is ready or while locked', () => {
  mockReady = false;
  const view = render(<AndroidHeaderMenuBar routeKey="leaf" />);
  expect(view.queryByTestId('AndroidAppMenuButton')).toBeNull();
  mockReady = true;
  mockRoute = { key: 'leaf', name: 'UnlockWithScreen' };
  view.rerender(<AndroidHeaderMenuBar routeKey="leaf" />);
  expect(view.queryByTestId('AndroidAppMenuButton')).toBeNull();
  view.unmount();
});
