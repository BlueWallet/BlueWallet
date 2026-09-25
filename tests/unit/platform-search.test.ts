import { act, renderHook } from '@testing-library/react-native';
import usePlatformSearch from '../../hooks/usePlatformSearch';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import NativeSpotlight from '../../blue_modules/NativeSpotlight';

jest.mock('../../hooks/context/useSettings', () => ({ useSettings: jest.fn() }));
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: jest.fn() }));
jest.mock('../../blue_modules/NativeSpotlight', () => ({
  __esModule: true,
  default: { deleteIndex: jest.fn().mockResolvedValue(undefined), replaceIndex: jest.fn().mockResolvedValue(0) },
  beginSpotlightWalletIndexing: jest.fn(() => jest.fn()),
}));

const isStorageEncrypted = jest.fn().mockResolvedValue(false);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSettings).mockReturnValue({ isSpotlightEnabled: false } as ReturnType<typeof useSettings>);
  jest.mocked(useStorage).mockReturnValue({
    wallets: [],
    walletsInitialized: false,
    isStorageEncrypted,
  } as unknown as ReturnType<typeof useStorage>);
});

it('clears disabled search without reading or initializing wallet storage', async () => {
  const hook = renderHook(usePlatformSearch);
  await act(async () => {});

  expect(isStorageEncrypted).not.toHaveBeenCalled();
  expect(NativeSpotlight!.deleteIndex).toHaveBeenCalledTimes(1);
  hook.unmount();
});

it('waits for wallet initialization before checking encryption for enabled search', async () => {
  jest.mocked(useSettings).mockReturnValue({ isSpotlightEnabled: true } as ReturnType<typeof useSettings>);
  const hook = renderHook(usePlatformSearch);
  await act(async () => {});
  expect(isStorageEncrypted).not.toHaveBeenCalled();
  expect(NativeSpotlight!.replaceIndex).not.toHaveBeenCalled();

  isStorageEncrypted.mockResolvedValueOnce(true);
  jest.mocked(useStorage).mockReturnValue({
    ...useStorage(),
    walletsInitialized: true,
  });
  hook.rerender(undefined);
  await act(async () => {});

  expect(isStorageEncrypted).toHaveBeenCalledTimes(1);
  expect(NativeSpotlight!.deleteIndex).toHaveBeenCalledTimes(1);
  expect(NativeSpotlight!.replaceIndex).not.toHaveBeenCalled();
  hook.unmount();
});
