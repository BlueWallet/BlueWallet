import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import ClipboardDetected from '../../screen/ClipboardDetected';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { navigationRef } from '../../NavigationService';

const goBack = jest.fn();
const mockLinkTo = jest.fn();
const mockRouteParams = { payload: 'bitcoin:test-address', contentHash: 'test-hash' };
jest.mock('../../blue_modules/hapticFeedback', () => ({
  ...jest.requireActual('../../blue_modules/hapticFeedback'),
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack }),
  useLinkTo: () => mockLinkTo,
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: () => {},
}));
jest.mock('../../NavigationService', () => ({ navigationRef: { navigate: jest.fn() } }));
jest.mock('../../class/deeplink-schema-match', () => ({
  __esModule: true,
  default: { navigationRouteFor: jest.fn((_input, callback) => callback(['SendDetailsRoot', { address: 'test-address' }])) },
}));
jest.mock('../../blue_modules/clipboard', () => ({
  setLastSeenClipboardHash: jest.fn(async () => {}),
  setClipboardSheetFocused: jest.fn(),
}));
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: () => ({ wallets: [] }) }));
jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('../../components/Button', () => 'Button');
jest.mock('../../components/ClipboardDetectedItem', () => 'ClipboardDetectedItem');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams.payload = 'bitcoin:test-address';
});

it('routes the clipboard payment after the sheet has been popped and unmounted', () => {
  const frames: Parameters<typeof requestAnimationFrame>[0][] = [];
  const frameSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => frames.push(callback));
  const screen = render(<ClipboardDetected />);
  goBack.mockImplementationOnce(() => screen.unmount());

  act(() => fireEvent.press(screen.getByTestId('ClipboardDetectedUse')));
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(DeeplinkSchemaMatch.navigationRouteFor).not.toHaveBeenCalled();

  act(() => frames.shift()!(0));
  expect(DeeplinkSchemaMatch.navigationRouteFor).not.toHaveBeenCalled();
  act(() => frames.shift()!(16));
  expect(navigationRef.navigate).toHaveBeenCalledWith('SendDetailsRoot', { address: 'test-address' });
  frameSpy.mockRestore();
});

it('routes an Electrum clipboard link through the navigation linking configuration after dismissal', () => {
  mockRouteParams.payload = 'bluewallet:setelectrumserver?server=node.example%3A50002%3As';
  const frames: Parameters<typeof requestAnimationFrame>[0][] = [];
  const frameSpy = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => frames.push(callback));
  try {
    const screen = render(<ClipboardDetected />);
    goBack.mockImplementationOnce(() => screen.unmount());
    act(() => fireEvent.press(screen.getByTestId('ClipboardDetectedUse')));
    act(() => frames.shift()!(0));
    expect(mockLinkTo).not.toHaveBeenCalled();
    act(() => frames.shift()!(16));
    expect(mockLinkTo).toHaveBeenCalledWith('/electrum-settings?server=node.example%3A50002%3As');
    expect(DeeplinkSchemaMatch.navigationRouteFor).not.toHaveBeenCalled();
    expect(navigationRef.navigate).not.toHaveBeenCalled();
  } finally {
    frameSpy.mockRestore();
  }
});
