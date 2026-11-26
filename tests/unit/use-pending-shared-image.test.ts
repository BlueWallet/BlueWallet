import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus, NativeEventEmitter } from 'react-native';
import EventEmitterModule from '../../blue_modules/NativeEventEmitter';
import usePendingSharedImage from '../../hooks/usePendingSharedImage.ios';

const mockNativeListeners = new Map<string, (event?: unknown) => void>();
const mockRemoveNativeListener = jest.fn();
const mockAddNativeListener = jest.fn((event: string, listener: (event?: unknown) => void) => {
  mockNativeListeners.set(event, listener);
  return { remove: mockRemoveNativeListener };
});

jest.mock('../../blue_modules/NativeEventEmitter', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getMostRecentUserActivity: jest.fn(),
    consumePendingSharedImage: jest.fn(),
  },
}));

const appStateListeners: Array<(state: AppStateStatus) => void> = [];
const flushPromises = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockNativeListeners.clear();
  appStateListeners.length = 0;
  jest.spyOn(NativeEventEmitter.prototype, 'addListener').mockImplementation(mockAddNativeListener as never);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListeners.push(listener as (state: AppStateStatus) => void);
    return { remove: jest.fn() } as never;
  });
  jest.mocked(EventEmitterModule.consumePendingSharedImage).mockResolvedValue(null);
});

it('keeps the marker untouched while locked and drains it after unlock', async () => {
  const handleOpenURL = jest.fn(async () => {});
  const hook = renderHook(({ enabled }) => usePendingSharedImage(enabled, handleOpenURL), {
    initialProps: { enabled: false },
  });

  expect(EventEmitterModule.consumePendingSharedImage).not.toHaveBeenCalled();

  jest
    .mocked(EventEmitterModule.consumePendingSharedImage)
    .mockResolvedValueOnce('file:///shared-images/unlock.png')
    .mockResolvedValue(null);
  hook.rerender({ enabled: true });
  await flushPromises();

  expect(handleOpenURL).toHaveBeenCalledWith({ url: 'file:///shared-images/unlock.png', sharedImage: true });
});

it('drains a pending image when the app returns to the foreground', async () => {
  const handleOpenURL = jest.fn(async () => {});
  renderHook(() => usePendingSharedImage(true, handleOpenURL));
  await flushPromises();
  jest.mocked(EventEmitterModule.consumePendingSharedImage).mockClear();

  jest
    .mocked(EventEmitterModule.consumePendingSharedImage)
    .mockResolvedValueOnce('file:///shared-images/resume.png')
    .mockResolvedValue(null);
  await act(async () => {
    appStateListeners.forEach(listener => listener('active'));
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(handleOpenURL).toHaveBeenCalledWith({ url: 'file:///shared-images/resume.png', sharedImage: true });
});

it('drains a live share notification while listeners are active', async () => {
  const handleOpenURL = jest.fn(async () => {});
  renderHook(() => usePendingSharedImage(true, handleOpenURL));
  await flushPromises();
  jest.mocked(EventEmitterModule.consumePendingSharedImage).mockClear();

  jest.mocked(EventEmitterModule.consumePendingSharedImage).mockResolvedValueOnce('file:///shared-images/live.png').mockResolvedValue(null);
  await act(async () => {
    mockNativeListeners.get('onSharedImagePending')?.();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(handleOpenURL).toHaveBeenCalledWith({ url: 'file:///shared-images/live.png', sharedImage: true });
});

it('retries when a notification arrives during an in-flight empty drain', async () => {
  const handleOpenURL = jest.fn(async () => {});
  renderHook(() => usePendingSharedImage(true, handleOpenURL));
  await flushPromises();
  jest.mocked(EventEmitterModule.consumePendingSharedImage).mockClear();

  let resolveFirstConsume!: (url: string | null) => void;
  jest
    .mocked(EventEmitterModule.consumePendingSharedImage)
    .mockImplementationOnce(() => new Promise(resolve => (resolveFirstConsume = resolve)))
    .mockResolvedValueOnce('file:///shared-images/raced.png')
    .mockResolvedValue(null);

  mockNativeListeners.get('onSharedImagePending')?.();
  expect(EventEmitterModule.consumePendingSharedImage).toHaveBeenCalledTimes(1);
  mockNativeListeners.get('onSharedImagePending')?.();

  await act(async () => {
    resolveFirstConsume(null);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(EventEmitterModule.consumePendingSharedImage).toHaveBeenCalledTimes(3);
  expect(handleOpenURL).toHaveBeenCalledWith({ url: 'file:///shared-images/raced.png', sharedImage: true });
});
