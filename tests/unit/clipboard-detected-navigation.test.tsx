import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import ClipboardDetected from '../../screen/ClipboardDetected';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { navigationRef } from '../../NavigationService';

const goBack = jest.fn();
jest.mock('../../blue_modules/hapticFeedback', () => ({
  ...jest.requireActual('../../blue_modules/hapticFeedback'),
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack }),
  useRoute: () => ({ params: { payload: 'bitcoin:test-address', contentHash: 'test-hash' } }),
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
