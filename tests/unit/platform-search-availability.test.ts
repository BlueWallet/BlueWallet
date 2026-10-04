import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import NativePlatformSearch from '../../codegen/NativePlatformSearch';
import { usePlatformSearchAvailability } from '../../blue_modules/NativePlatformSearch';

jest.mock('../../codegen/NativePlatformSearch', () => ({
  __esModule: true,
  default: { isIndexingAvailable: jest.fn() },
}));

const check = jest.mocked(NativePlatformSearch!.isIndexingAvailable);
let onChange: (state: AppStateStatus) => void;
const remove = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  check.mockResolvedValue(true);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    onChange = callback;
    return { remove };
  });
});
afterEach(() => jest.restoreAllMocks());

it('disables while checking and rechecks on returning from device settings', async () => {
  check.mockResolvedValueOnce(false);
  const hook = renderHook(usePlatformSearchAvailability);
  expect(hook.result.current).toBeNull();
  await act(async () => {});
  expect(hook.result.current).toBe(false);
  await act(async () => onChange('active'));
  expect(hook.result.current).toBe(true);
  hook.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

it('disables if the native availability check fails', async () => {
  check.mockRejectedValueOnce(new Error('service unavailable'));
  const hook = renderHook(usePlatformSearchAvailability);
  await act(async () => {});
  expect(hook.result.current).toBe(false);
  hook.unmount();
});

it('ignores a stale check that completes after a newer foreground check', async () => {
  let complete!: (value: boolean) => void;
  check.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        complete = resolve;
      }),
  );
  const hook = renderHook(usePlatformSearchAvailability);
  await act(async () => onChange('active'));
  expect(hook.result.current).toBe(true);
  await act(async () => complete(false));
  expect(hook.result.current).toBe(true);
  hook.unmount();
});
