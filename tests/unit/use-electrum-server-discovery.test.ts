import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Alert, DeviceEventEmitter } from 'react-native';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import NativeWidgetHelper from '../../blue_modules/NativeWidgetHelper';
import useElectrumServerDiscovery, { parseDiscoveredElectrumServers } from '../../hooks/useElectrumServerDiscovery';

jest.mock('../../blue_modules/NativeWidgetHelper', () => ({
  __esModule: true,
  default: {
    requestLocalNetworkPermission: jest.fn(),
    discoverElectrumServers: jest.fn(),
  },
}));
jest.mock('@bugsnag/react-native', () => ({
  __esModule: true,
  default: { leaveBreadcrumb: jest.fn(), notify: jest.fn() },
}));
jest.mock('../../blue_modules/NativeEventEmitter', () => ({
  __esModule: true,
  default: { addListener: jest.fn(), removeListeners: jest.fn() },
}));
jest.mock('../../blue_modules/BlueElectrum', () => ({
  validateConnection: jest.fn(),
}));
jest.mock('react-native-permissions', () => ({
  openSettings: jest.fn(async () => {}),
}));

const nativeDiscover = jest.mocked(NativeWidgetHelper.discoverElectrumServers);
const requestLocalNetworkPermission = jest.mocked(NativeWidgetHelper.requestLocalNetworkPermission);
const validateConnection = jest.mocked(BlueElectrum.validateConnection);

beforeEach(() => {
  jest.clearAllMocks();
  requestLocalNetworkPermission.mockResolvedValue('granted');
  validateConnection.mockResolvedValue({ success: false });
  jest.spyOn(Alert, 'alert');
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

it('records the opt-in before beginning discovery', async () => {
  nativeDiscover.mockResolvedValue('[]');
  const onDiscoveryEnabled = jest.fn(async () => {});
  const hook = renderHook(() => useElectrumServerDiscovery(onDiscoveryEnabled));

  act(() => hook.result.current.discoverServers());
  const continueDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  await act(async () => {
    await continueDiscovery?.();
  });

  expect(onDiscoveryEnabled).toHaveBeenCalledTimes(1);
  expect(nativeDiscover).toHaveBeenCalledTimes(1);
});

it('publishes validated event results before the native scan completes', async () => {
  let resolveDiscovery: ((value: string) => void) | undefined;
  nativeDiscover.mockImplementation(
    () =>
      new Promise(resolve => {
        resolveDiscovery = resolve;
      }),
  );
  validateConnection.mockResolvedValue({ success: true });
  const hook = renderHook(useElectrumServerDiscovery);

  act(() => hook.result.current.discoverServers());
  const startDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  act(() => {
    startDiscovery?.();
  });
  await waitFor(() => expect(nativeDiscover).toHaveBeenCalledTimes(1));
  await act(async () => {
    DeviceEventEmitter.emit('onElectrumServerDiscovered', { host: '192.168.1.25', port: 50001, ssl: false });
    await Promise.resolve();
  });

  expect(hook.result.current.isDiscoveringServers).toBe(true);
  expect(hook.result.current.discoveredServers).toEqual([{ host: '192.168.1.25', tcp: 50001 }]);
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalled();

  await act(async () => resolveDiscovery?.('[]'));
});

it('only includes LAN candidates that complete an Electrum handshake', async () => {
  nativeDiscover.mockResolvedValue(
    JSON.stringify([
      { host: '192.168.1.20', port: 50001, ssl: false },
      { host: '192.168.1.30', port: 50002, ssl: true },
      { host: '192.168.1.40', port: 443, ssl: true },
    ]),
  );
  validateConnection.mockImplementation(async host => ({ success: host === '192.168.1.20' }));
  const hook = renderHook(useElectrumServerDiscovery);

  act(() => hook.result.current.discoverServers());
  const startDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  await act(async () => {
    await startDiscovery?.();
  });

  expect(validateConnection).toHaveBeenCalledTimes(3);
  expect(validateConnection).toHaveBeenCalledWith('192.168.1.20', 50001, undefined, { requirePing: false });
  expect(validateConnection).toHaveBeenCalledWith('192.168.1.30', undefined, 50002, { requirePing: false });
  expect(validateConnection).toHaveBeenCalledWith('192.168.1.40', undefined, 443, { requirePing: false });
  expect(hook.result.current.discoveredServers).toEqual([{ host: '192.168.1.20', tcp: 50001 }]);
});

it('rejects malformed native payloads and skips unsafe records', () => {
  expect(() => parseDiscoveredElectrumServers('{}')).toThrow('Invalid discovery response.');
  expect(() => parseDiscoveredElectrumServers('not json')).toThrow();
  expect(() =>
    parseDiscoveredElectrumServers(
      JSON.stringify(
        new Array(1_001).fill({
          host: 'node.example.com',
          port: 50002,
          ssl: true,
        }),
      ),
    ),
  ).not.toThrow();
  expect(
    parseDiscoveredElectrumServers(
      JSON.stringify([
        null,
        'server',
        { host: 'node.example.com', port: 0, ssl: true },
        { host: 'node.example.com', port: 50002, ssl: 'yes' },
        { host: 'valid.example.com', port: 50002, ssl: true },
      ]),
    ),
  ).toEqual([{ host: 'valid.example.com', ssl: 50002 }]);
});

it('asks before discovery and returns unique normalized servers', async () => {
  nativeDiscover.mockResolvedValue(
    JSON.stringify([
      { host: 'NODE.example.com', port: 50002, ssl: true },
      { host: 'node.example.com', port: 50002, ssl: true },
      { host: 'node.example.com', port: 50001, ssl: false },
    ]),
  );
  validateConnection.mockResolvedValue({ success: true });
  const hook = renderHook(useElectrumServerDiscovery);

  act(() => hook.result.current.discoverServers());
  expect(nativeDiscover).not.toHaveBeenCalled();

  const buttons = jest.mocked(Alert.alert).mock.calls[0][2];
  await act(async () => {
    await buttons?.[1].onPress?.();
  });

  expect(nativeDiscover).toHaveBeenCalledTimes(1);
  expect(hook.result.current.discoveredServers).toEqual([
    { host: 'node.example.com', ssl: 50002 },
    { host: 'node.example.com', tcp: 50001 },
  ]);
  expect(hook.result.current.isDiscoveringServers).toBe(false);
});

it('prevents concurrent native discovery requests', async () => {
  let resolveDiscovery: ((value: string) => void) | undefined;
  nativeDiscover.mockImplementation(
    () =>
      new Promise(resolve => {
        resolveDiscovery = resolve;
      }),
  );
  const hook = renderHook(useElectrumServerDiscovery);

  act(() => hook.result.current.discoverServers());
  const startDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  act(() => {
    startDiscovery?.();
    startDiscovery?.();
  });

  await act(async () => {
    await Promise.resolve();
  });

  expect(nativeDiscover).toHaveBeenCalledTimes(1);
  expect(hook.result.current.isDiscoveringServers).toBe(true);

  await act(async () => resolveDiscovery?.('[]'));
  await waitFor(() => expect(hook.result.current.isDiscoveringServers).toBe(false));
});

it('keeps an empty discovered section when native discovery fails after permission is granted', async () => {
  nativeDiscover.mockRejectedValue(new Error('Discovery failed'));
  const hook = renderHook(useElectrumServerDiscovery);

  act(() => hook.result.current.discoverServers());
  const startDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  await act(async () => {
    await startDiscovery?.();
  });

  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(hook.result.current.hasStartedDiscovery).toBe(true);
  expect(hook.result.current.discoveredServers).toEqual([]);
  expect(hook.result.current.isDiscoveringServers).toBe(false);
});

it('does not start discovery when Apple local-network access is blocked', async () => {
  requestLocalNetworkPermission.mockResolvedValue('blocked');
  const hook = renderHook(useElectrumServerDiscovery);

  act(() => hook.result.current.discoverServers());
  const startDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  await act(async () => {
    await startDiscovery?.();
  });

  expect(requestLocalNetworkPermission).toHaveBeenCalledTimes(1);
  expect(nativeDiscover).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  expect(hook.result.current.hasStartedDiscovery).toBe(false);
  expect(hook.result.current.isDiscoveringServers).toBe(false);
});

it('continues discovery when the Apple permission probe is indeterminate', async () => {
  requestLocalNetworkPermission.mockResolvedValue(
    JSON.stringify({ status: 'unavailable', reason: 'permission_probe_timed_out', errorDomain: 'dns', errorCode: -65563 }),
  );
  nativeDiscover.mockResolvedValue('[]');
  const hook = renderHook(useElectrumServerDiscovery);

  act(() => hook.result.current.discoverServers());
  const startDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  await act(async () => {
    await startDiscovery?.();
  });

  expect(nativeDiscover).toHaveBeenCalledTimes(1);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(hook.result.current.hasStartedDiscovery).toBe(true);
});

it('keeps an empty discovered section when native discovery returns malformed JSON', async () => {
  nativeDiscover.mockResolvedValue('{');
  const hook = renderHook(useElectrumServerDiscovery);

  act(() => hook.result.current.discoverServers());
  const startDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  await act(async () => {
    await startDiscovery?.();
  });

  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(hook.result.current.hasStartedDiscovery).toBe(true);
  expect(hook.result.current.discoveredServers).toEqual([]);
  expect(hook.result.current.isDiscoveringServers).toBe(false);
});

it('recovers when the native discovery promise never settles', async () => {
  jest.useFakeTimers();
  try {
    nativeDiscover.mockImplementation(() => new Promise(() => {}));
    const hook = renderHook(useElectrumServerDiscovery);

    act(() => hook.result.current.discoverServers());
    const startDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
    act(() => {
      startDiscovery?.();
    });
    await act(async () => jest.advanceTimersByTimeAsync(15_001));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(hook.result.current.hasStartedDiscovery).toBe(true);
    expect(hook.result.current.isDiscoveringServers).toBe(false);
  } finally {
    jest.useRealTimers();
  }
});

it('does not update state or present an alert after unmounting', async () => {
  let resolveDiscovery: ((value: string) => void) | undefined;
  nativeDiscover.mockImplementation(
    () =>
      new Promise(resolve => {
        resolveDiscovery = resolve;
      }),
  );
  const hook = renderHook(useElectrumServerDiscovery);

  act(() => hook.result.current.discoverServers());
  const startDiscovery = jest.mocked(Alert.alert).mock.calls[0][2]?.[1].onPress;
  act(() => {
    startDiscovery?.();
  });
  hook.unmount();
  jest.mocked(Alert.alert).mockClear();

  await act(async () => resolveDiscovery?.('[]'));

  expect(Alert.alert).not.toHaveBeenCalled();
});
