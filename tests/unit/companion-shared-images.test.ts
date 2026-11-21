import { act, renderHook } from '@testing-library/react-native';
import { Linking } from 'react-native';
import RNFS from 'react-native-fs';
import { readQRCodeFromImageFile } from '../../blue_modules/fs';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import presentAlert from '../../components/Alert';
import useCompanionListeners from '../../hooks/useCompanionListeners';
import type { OpenURLEvent } from '../../helpers/sharedImage';

let mockSharedImageHandler: (event: OpenURLEvent) => Promise<void>;
const mockStorage = {
  wallets: [],
  walletsInitialized: true,
  isStorageEncrypted: async () => false,
};

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => mockStorage,
}));
jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ isClipboardGetContentEnabled: false }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../NavigationService', () => ({
  navigationRef: { navigate: jest.fn() },
}));
jest.mock('../../blue_modules/arkade-background', () => ({}));
jest.mock('../../blue_modules/currency', () => ({}));
jest.mock('../../blue_modules/fs', () => ({
  readQRCodeFromImageFile: jest.fn(),
}));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: {
    NotificationSuccess: 'success',
    NotificationError: 'error',
  },
}));
jest.mock('../../blue_modules/notifications', () => ({
  initializeNotifications: jest.fn(),
}));
jest.mock('../../class/wallets/lightning-ark-wallet', () => ({}));
jest.mock('../../class/deeplink-schema-match', () => ({
  __esModule: true,
  default: { hasSchema: jest.fn(() => false), navigationRouteFor: jest.fn() },
}));
jest.mock('../../components/Alert', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../components/Context/recentMenuItems', () => ({
  setAvailableRecentWalletIDs: jest.fn(),
  setHiddenRecentWalletIDs: jest.fn(),
  setRecentMenuItemsEnabled: jest.fn(async () => {}),
}));
jest.mock('../../hooks/useWidgetCommunication', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../hooks/useHandoffListener', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../hooks/useClipboardDetection', () => ({
  __esModule: true,
  default: () => ({}),
}));
jest.mock('../../hooks/useMenuActions', () => ({
  __esModule: true,
  default: jest.fn(),
  setNativeMenuWalletsInitialized: jest.fn(),
  setNativeOpenFileHandler: jest.fn(),
}));
jest.mock('../../hooks/usePendingSharedImage', () => ({
  __esModule: true,
  default: (_enabled: boolean, handler: typeof mockSharedImageHandler) => {
    mockSharedImageHandler = handler;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  jest.mocked(RNFS.unlink).mockResolvedValue(undefined);
  jest.mocked(readQRCodeFromImageFile).mockResolvedValue('bitcoin:address');
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

it('decodes and routes shared images, then deletes the App Group copy', async () => {
  renderHook(() => useCompanionListeners());
  await act(async () => {
    await mockSharedImageHandler({
      url: 'file:///AppGroup/shared-images/qr%20code.png',
      sharedImage: true,
    });
  });

  expect(readQRCodeFromImageFile).toHaveBeenCalledWith('file:///AppGroup/shared-images/qr code.png');
  expect(DeeplinkSchemaMatch.navigationRouteFor).toHaveBeenCalledWith({ url: 'bitcoin:address' }, expect.any(Function), expect.any(Object));
  expect(RNFS.unlink).toHaveBeenCalledWith('/AppGroup/shared-images/qr code.png');
});

it.each(['decode', 'route'])('deletes a shared copy when %s fails', async stage => {
  const failure = new Error('Image processing failed');
  if (stage === 'decode') jest.mocked(readQRCodeFromImageFile).mockRejectedValueOnce(failure);
  else {
    jest.mocked(DeeplinkSchemaMatch.navigationRouteFor).mockImplementationOnce(() => {
      throw failure;
    });
  }
  renderHook(() => useCompanionListeners());

  await act(async () => {
    await mockSharedImageHandler({
      url: 'file:///AppGroup/shared-images/failure.png',
      sharedImage: true,
    });
  });

  expect(RNFS.unlink).toHaveBeenCalledWith('/AppGroup/shared-images/failure.png');
  expect(presentAlert).toHaveBeenCalled();
});

it.each([false, true])('preserves ordinary Open With images when decode failure is %s', async fails => {
  const url = 'file:///Users/alice/shared-images/original.png';
  if (fails) jest.mocked(readQRCodeFromImageFile).mockRejectedValueOnce(new Error('No QR code'));
  jest.mocked(Linking.getInitialURL).mockResolvedValue(url);

  renderHook(() => useCompanionListeners());
  await act(async () => {});

  expect(readQRCodeFromImageFile).toHaveBeenCalledWith(url);
  expect(RNFS.unlink).not.toHaveBeenCalled();
});
