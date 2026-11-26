import { act, renderHook } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';

import { CLIPBOARD_IDLE_DELAY_MS } from '../../blue_modules/clipboardPayment';
import { readClipboardForDetection } from '../../blue_modules/clipboard';
import useClipboardDetection from '../../hooks/useClipboardDetection';
import { navigationRef } from '../../NavigationService';

jest.mock('@react-navigation/native', () => ({
  CommonActions: { navigate: (name: string, params: unknown) => ({ type: 'NAVIGATE', name, params }) },
}));
jest.mock('../../blue_modules/clipboard', () => ({
  readClipboardForDetection: jest.fn(),
  getLastSeenClipboardHash: jest.fn(async () => undefined),
  setLastSeenClipboardHash: jest.fn(async () => {}),
}));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: { ImpactLight: 'impactLight' },
}));
jest.mock('../../blue_modules/environment', () => ({ isDesktop: false }));
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ wallets: [{ chain: 'ONCHAIN', isAddressValid: () => true, weOwnAddress: () => false }] }),
}));
jest.mock('../../NavigationService', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    getCurrentRoute: jest.fn(() => ({ name: 'WalletsList' })),
    dispatch: jest.fn(),
    addListener: jest.fn(),
  },
}));

const P2WPKH = 'bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref';

let clipboardListener: (() => void) | undefined;
const removeListener = jest.fn();
const navigationListeners: Record<string, () => void> = {};
const flush = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  clipboardListener = undefined;
  jest.mocked(navigationRef.addListener).mockImplementation(((event: string, listener: () => void) => {
    navigationListeners[event] = listener;
    return jest.fn();
  }) as never);
  jest.spyOn(Clipboard, 'addListener').mockImplementation(listener => {
    clipboardListener = listener;
    return { remove: removeListener } as never;
  });
  jest.mocked(readClipboardForDetection).mockResolvedValue({ content: P2WPKH, pasteBlocked: false });
  jest.mocked(navigationRef.isReady).mockReturnValue(true);
  jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: 'WalletsList', key: 'WalletsList' });
});

afterEach(() => {
  jest.useRealTimers();
});

it('checks the clipboard when enabled and when it changes', async () => {
  const hook = renderHook(useClipboardDetection, { initialProps: true });
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);
  expect(readClipboardForDetection).toHaveBeenCalledTimes(1);
  expect(navigationRef.dispatch).toHaveBeenCalledWith(expect.objectContaining({ name: 'ClipboardDetected' }));

  act(() => clipboardListener?.());
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);
  expect(readClipboardForDetection).toHaveBeenCalledTimes(2);
  hook.unmount();
  expect(removeListener).toHaveBeenCalledTimes(1);
});

it('does not subscribe or read when disabled', async () => {
  renderHook(useClipboardDetection, { initialProps: false });
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);
  expect(Clipboard.addListener).not.toHaveBeenCalled();
  expect(readClipboardForDetection).not.toHaveBeenCalled();
});

it('debounces clipboard changes and cancels pending reads on unmount', async () => {
  const hook = renderHook(useClipboardDetection, { initialProps: true });
  act(() => {
    clipboardListener?.();
    clipboardListener?.();
  });
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);
  expect(readClipboardForDetection).toHaveBeenCalledTimes(1);
  act(() => clipboardListener?.());
  hook.unmount();
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);
  expect(readClipboardForDetection).toHaveBeenCalledTimes(1);
});

it('reads the latest clipboard content when it changes during a pending read', async () => {
  let finishRead!: (value: { content: string; pasteBlocked: boolean }) => void;
  jest
    .mocked(readClipboardForDetection)
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishRead = resolve;
        }),
    )
    .mockResolvedValueOnce({ content: P2WPKH, pasteBlocked: false });
  renderHook(useClipboardDetection, { initialProps: true });
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);

  act(() => clipboardListener?.());
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);
  await act(async () => {
    finishRead({ content: 'old content', pasteBlocked: false });
  });
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);

  expect(readClipboardForDetection).toHaveBeenCalledTimes(2);
  expect(navigationRef.dispatch).toHaveBeenCalledWith(expect.objectContaining({ name: 'ClipboardDetected' }));
});

it('presents a pending offer when navigation becomes ready', async () => {
  jest.mocked(navigationRef.isReady).mockReturnValue(false);
  renderHook(useClipboardDetection, { initialProps: true });
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);
  expect(navigationRef.dispatch).not.toHaveBeenCalled();
  jest.mocked(navigationRef.isReady).mockReturnValue(true);
  act(() => navigationListeners.ready());
  expect(navigationRef.dispatch).toHaveBeenCalledWith(expect.objectContaining({ name: 'ClipboardDetected' }));
});

it('waits until the current clipboard sheet closes before presenting a new offer', async () => {
  jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: 'ClipboardDetected', key: 'clipboard' });
  renderHook(useClipboardDetection, { initialProps: true });
  await flush(CLIPBOARD_IDLE_DELAY_MS + 1);
  expect(navigationRef.dispatch).not.toHaveBeenCalled();
  jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: 'WalletsList', key: 'wallets' });
  act(() => navigationListeners.state());
  expect(navigationRef.dispatch).toHaveBeenCalledWith(expect.objectContaining({ name: 'ClipboardDetected' }));
});
