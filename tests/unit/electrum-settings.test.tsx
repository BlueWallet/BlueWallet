import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Platform, TextInput, View } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import NativeLocalNetworkPermission from '../../codegen/NativeLocalNetworkPermission';
import AddElectrumServer, { addElectrumServerReducer, initialAddElectrumServerState } from '../../screen/settings/AddElectrumServer';
import ElectrumSettings, { electrumSettingsReducer, initialElectrumSettingsState } from '../../screen/settings/ElectrumSettings';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';

const navigation = { setParams: jest.fn(), navigate: jest.fn(), goBack: jest.fn(), dispatch: jest.fn(), setOptions: jest.fn() };
let routeParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => navigation,
  useRoute: () => ({ params: routeParams }),
  usePreventRemove: jest.fn(),
  useFocusEffect: (effect: () => (() => void) | undefined) => require('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }) }));
jest.mock('../../hooks/useScreenMenuActions', () => jest.fn());
jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ isElectrumDisabled: false, isHandOffUseEnabled: false, setIsElectrumDisabled: jest.fn() }),
}));
jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('../../blue_modules/currency', () => ({ GROUP_IO_BLUEWALLET: 'electrum-settings-tests' }));
jest.mock('../../blue_modules/BlueElectrum', () => ({
  ELECTRUM_HOST: 'host',
  ELECTRUM_TCP_PORT: 'tcp',
  ELECTRUM_SSL_PORT: 'ssl',
  ELECTRUM_SERVER_HISTORY: 'history',
  suggestedServers: [{ host: 'suggested.example', ssl: 50002 }],
  suppressNetworkErrorAlerts: jest.fn(() => jest.fn()),
  getPreferredServer: jest.fn(async () => undefined),
  getConfig: jest.fn(async () => ({ connected: 0 })),
  subscribeConnectionState: jest.fn(() => jest.fn()),
  getServerBanner: jest.fn(async () => ''),
  validateConnection: jest.fn(async () => ({ success: true })),
  isDisabled: jest.fn(async () => false),
  forceDisconnect: jest.fn(),
  ensureConnected: jest.fn(async () => true),
  presentResetToDefaultsAlert: jest.fn(),
  connectToRandomSuggestedServer: jest.fn(async () => true),
}));
jest.mock('../../codegen/NativeLocalNetworkPermission', () => ({
  __esModule: true,
  default: { requestLocalNetworkAccess: jest.fn(async () => true) },
}));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: {},
  triggerSelectionHapticFeedback: jest.fn(),
}));
jest.mock('../../components/AddressInput', () => ({
  __esModule: true,
  default: (props: any) => <TextInput {...props} value={props.address} ref={props.inputRef} />,
}));
jest.mock('../../components/SegmentedControl', () => 'SegmentedControl');
jest.mock('../../components/DismissKeyboardInputAccessory', () => ({
  DismissKeyboardInputAccessory: () => null,
  DismissKeyboardInputAccessoryViewID: 'accessory',
}));
jest.mock('../../components/HandOffComponent', () => 'HandOffComponent');
jest.mock('../../components/TooltipMenu', () => ({ __esModule: true, default: ({ children }: any) => <View>{children}</View> }));
jest.mock('react-native-gesture-handler', () => ({ Swipeable: ({ children }: any) => <View>{children}</View> }));
jest.mock('../../components/headerMenuOptions', () => ({ createEllipsisHeaderMenuOptions: () => ({}) }));
jest.mock('../../screen/ActionSheet', () => ({ __esModule: true, default: { showActionSheetWithOptions: jest.fn() } }));
jest.mock('../../components/SettingsSection', () => ({
  SettingsSection: ({ children }: any) => <View>{children}</View>,
  SettingsFootnote: 'Text',
  SettingsListItem: (props: any) => <View {...props} testID={props.switch?.testID ?? props.testID} />,
}));

describe('Electrum settings state transitions', () => {
  it('keeps SSL selected when clearing and replacing the port', () => {
    let state = addElectrumServerReducer(initialAddElectrumServerState, { type: 'portChanged', text: '50002' });
    state = addElectrumServerReducer(state, { type: 'portChanged', text: '' });
    state = addElectrumServerReducer(state, { type: 'portChanged', text: '50001' });
    expect(state).toMatchObject({ portText: '50001', useSsl: true });
  });

  it('preserves invalid port text for correction instead of silently coercing it', () => {
    const state = addElectrumServerReducer(initialAddElectrumServerState, { type: 'portChanged', text: '5e3' });
    expect(state.portText).toBe('5e3');
  });

  it('protects the endpoint being validated from edits and keeps the form dirty until saved', () => {
    let state = addElectrumServerReducer(initialAddElectrumServerState, {
      type: 'applyServer',
      server: { host: 'test.example', ssl: 50002 },
    });
    state = addElectrumServerReducer(state, { type: 'validationStarted' });
    expect(addElectrumServerReducer(state, { type: 'hostChanged', text: 'different.example' })).toBe(state);
    expect(addElectrumServerReducer(state, { type: 'protocolChanged', useSsl: false })).toBe(state);
    expect(state.didSave).toBe(false);
    expect(addElectrumServerReducer(state, { type: 'saved' })).toMatchObject({ didSave: true, isValidating: false });
  });

  it('expands suggestions and clears both favorite transports atomically when removing a favorite', () => {
    const state = electrumSettingsReducer(
      { ...initialElectrumSettingsState, host: 'test.example', sslPort: 50002, isSuggestedExpanded: false, showSuggestedServers: false },
      { type: 'favoriteRemoved', history: [] },
    );
    expect(state).toMatchObject({ host: '', port: undefined, sslPort: undefined, isSuggestedExpanded: true, showSuggestedServers: true });
  });

  it('never collapses suggestions after reloading without a favorite', () => {
    const state = electrumSettingsReducer(
      { ...initialElectrumSettingsState, isSuggestedExpanded: false },
      { type: 'loaded', history: [], config: {}, showSuggested: true },
    );
    expect(state.isSuggestedExpanded).toBe(true);
  });
});

describe('Add Electrum Server behavior', () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(async () => {
    jest.clearAllMocks();
    routeParams = {};
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.clear(BlueElectrum.ELECTRUM_SERVER_HISTORY);
    jest.mocked(BlueElectrum.validateConnection).mockResolvedValue({ success: true });
    jest.mocked(BlueElectrum.getPreferredServer).mockResolvedValue(undefined);
    jest.mocked(BlueElectrum.isDisabled).mockResolvedValue(false);
  });

  async function openForm(server?: { host: string; ssl?: number; tcp?: number }) {
    routeParams = server ? { server } : {};
    const screen = render(<AddElectrumServer />);
    await waitFor(() => expect(screen.getByTestId('HostInput').props.editable).toBe(true));
    return screen;
  }

  function confirm() {
    const params = navigation.setParams.mock.calls.at(-1)?.[0];
    expect(navigation.setOptions).not.toHaveBeenCalled();
    expect(params.unstable_headerRightItems()[0].disabled).toBe(false);
    act(() => {
      params.unstable_headerRightItems()[0].onPress();
    });
  }

  it('does not allow setting a favorite without a complete valid endpoint', async () => {
    const screen = await openForm();
    expect(screen.getByTestId('SetServerAsFavoriteSwitch').props.switch.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('HostInput'), 'example.com');
    fireEvent.changeText(screen.getByTestId('PortInput'), '50001');
    expect(screen.getByTestId('SetServerAsFavoriteSwitch').props.switch.disabled).toBe(false);
    fireEvent.changeText(screen.getByTestId('PortInput'), '70000');
    expect(screen.getByTestId('SetServerAsFavoriteSwitch').props.switch.disabled).toBe(true);
  });

  it('normalizes duplicate history and prevents saving a server that already exists', async () => {
    await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify([{ host: 'EXAMPLE.COM', tcp: 50001 }, null]));
    await openForm({ host: 'example.com', tcp: 50001 });
    const params = navigation.setParams.mock.calls.at(-1)?.[0];
    expect(params.unstable_headerRightItems()[0].disabled).toBe(true);
    expect(BlueElectrum.validateConnection).not.toHaveBeenCalled();
  });

  it('dismisses after saving even while the main connection is still reconnecting', async () => {
    jest.mocked(BlueElectrum.ensureConnected).mockReturnValueOnce(new Promise(() => {}));
    await openForm({ host: 'example.com', tcp: 50001 });
    confirm();
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(await DefaultPreference.get(BlueElectrum.ELECTRUM_HOST)).toBe('example.com');
    expect(JSON.parse(String(await DefaultPreference.get(BlueElectrum.ELECTRUM_SERVER_HISTORY)))).toEqual([
      { host: 'example.com', tcp: 50001 },
    ]);
  });

  it('requests local network permission before contacting a local server', async () => {
    await openForm({ host: 'umbrel.local', tcp: 50001 });
    confirm();
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(jest.mocked(NativeLocalNetworkPermission!.requestLocalNetworkAccess).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(BlueElectrum.validateConnection).mock.invocationCallOrder[0],
    );
  });

  it('does not contact a local server when Apple local network access is denied', async () => {
    jest.mocked(NativeLocalNetworkPermission!.requestLocalNetworkAccess).mockResolvedValueOnce(false);
    const screen = await openForm({ host: 'umbrel.local', tcp: 50001 });
    confirm();
    await waitFor(() => expect(screen.getByTestId('HostInput').props.editable).toBe(true));
    expect(BlueElectrum.validateConnection).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open Settings' })).toBeTruthy();
  });

  it('does not use Apple local network permission when saving on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await openForm({ host: 'umbrel.local', tcp: 50001 });
    confirm();
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(NativeLocalNetworkPermission!.requestLocalNetworkAccess).not.toHaveBeenCalled();
    expect(BlueElectrum.validateConnection).toHaveBeenCalledWith('umbrel.local', 50001, undefined);
  });

  it('preserves offline mode when setting a favorite', async () => {
    jest.mocked(BlueElectrum.isDisabled).mockResolvedValueOnce(true);
    await openForm({ host: 'example.com', tcp: 50001 });
    confirm();
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(BlueElectrum.ensureConnected).not.toHaveBeenCalled();
    expect(BlueElectrum.forceDisconnect).not.toHaveBeenCalled();
  });

  it('shows the actual validation error and unlocks the form after failure', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions');
    jest.mocked(BlueElectrum.validateConnection).mockResolvedValueOnce({ success: false, error: 'Connection refused on port 50001' });
    const screen = await openForm({ host: 'example.com', tcp: 50001 });
    confirm();
    await waitFor(() => expect(screen.getByText('Connection refused on port 50001')).toBeTruthy());
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(screen.getByTestId('HostInput').props.editable).toBe(true);
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('Connection refused on port 50001'), { queue: true });
  });

  it('keeps the address input single-line when validation makes it read-only', async () => {
    let finishValidation!: (value: { success: boolean; error?: string }) => void;
    jest.mocked(BlueElectrum.validateConnection).mockReturnValueOnce(
      new Promise(resolve => {
        finishValidation = resolve;
      }),
    );
    routeParams = { server: { host: 'example.com', tcp: 50001 } };
    const screen = render(<AddElectrumServer />);
    expect(screen.getByTestId('HostInput').props.multiline).toBe(false);
    await waitFor(() => expect(screen.getByTestId('HostInput').props.editable).toBe(true));
    confirm();
    await waitFor(() => expect(screen.getByTestId('HostInput').props.editable).toBe(false));
    expect(screen.getByTestId('HostInput').props.multiline).toBe(false);
    await act(async () => {
      finishValidation({ success: false, error: 'Connection refused' });
    });
    expect(screen.getByTestId('HostInput').props.editable).toBe(true);
    expect(screen.getByTestId('HostInput').props.multiline).toBe(false);
  });

  it('uses separate keyboard accessories for each input and each form instance', async () => {
    const first = await openForm();
    const hostAccessory = first.getByTestId('HostInput').props.inputAccessoryViewID;
    expect(hostAccessory).not.toBe(first.getByTestId('PortInput').props.inputAccessoryViewID);
    first.unmount();
    const reopened = await openForm();
    expect(reopened.getByTestId('HostInput').props.inputAccessoryViewID).not.toBe(hostAccessory);
  });

  it('rechecks persisted history after validation so stale form state cannot add duplicates', async () => {
    jest.mocked(BlueElectrum.validateConnection).mockImplementationOnce(async () => {
      await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, JSON.stringify([{ host: 'example.com', tcp: 50001 }]));
      return { success: true };
    });
    await openForm({ host: 'example.com', tcp: 50001 });
    confirm();
    await waitFor(() => expect(BlueElectrum.validateConnection).toHaveBeenCalled());
    await act(async () => {});
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(BlueElectrum.forceDisconnect).not.toHaveBeenCalled();
  });
});

describe('Electrum settings lifecycle', () => {
  it('loads corrupt history, refreshes on connection events, and unsubscribes when unmounted', async () => {
    jest.useFakeTimers();
    const unsubscribe = jest.fn();
    jest.mocked(BlueElectrum.subscribeConnectionState).mockReturnValueOnce(unsubscribe);
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set(BlueElectrum.ELECTRUM_SERVER_HISTORY, '{broken');
    const screen = render(<ElectrumSettings />);
    await act(async () => {});
    const countBeforeEvent = jest.mocked(BlueElectrum.getConfig).mock.calls.length;
    const listener = jest.mocked(BlueElectrum.subscribeConnectionState).mock.calls.at(-1)![0];
    await act(async () => {
      listener('connected');
    });
    expect(BlueElectrum.getConfig).toHaveBeenCalledTimes(countBeforeEvent + 1);
    screen.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    const count = jest.mocked(BlueElectrum.getConfig).mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(BlueElectrum.getConfig).toHaveBeenCalledTimes(count);
    jest.useRealTimers();
  });
});
