import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

import { getClipboardContent } from '../../blue_modules/clipboard';
import useClipboardDetection from '../../hooks/useClipboardDetection';
import { navigationRef } from '../../NavigationService';

jest.mock('@react-navigation/native', () => ({
  CommonActions: { navigate: (name: string, params: unknown) => ({ type: 'NAVIGATE', name, params }) },
}));
jest.mock('../../blue_modules/clipboard', () => ({
  getClipboardContent: jest.fn(),
  getLastSeenClipboardHash: jest.fn(async () => undefined),
  setLastSeenClipboardHash: jest.fn(async () => {}),
  isClipboardSheetFocused: jest.fn(() => false),
}));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: { ImpactLight: 'impactLight' },
}));
const environmentState = { isDesktop: false };
jest.mock('../../blue_modules/environment', () => ({
  get isDesktop() {
    return environmentState.isDesktop;
  },
}));
const storageState: { wallets: unknown[] } = { wallets: [] };
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => storageState,
}));
jest.mock('../../NavigationService', () => ({
  navigationRef: { isReady: jest.fn(() => true), getCurrentRoute: jest.fn(() => ({ name: 'WalletsList' })), dispatch: jest.fn() },
}));

const P2WPKH = 'bc1qykcp2x3djgdtdwelxn9z4j2y956npte0a4sref';
const WALLET = { chain: 'ONCHAIN', isAddressValid: () => true, weOwnAddress: () => false };

type Hook = ReturnType<typeof renderHook<ReturnType<typeof useClipboardDetection>, boolean>>;

let appState: AppStateStatus = 'active';
const settle = () => act(async () => {});

/** Mirrors useCompanionListeners.handleAppStateChange. */
const goTo = async (hook: Hook, next: AppStateStatus, skipRead = false) => {
  const previous = appState;
  appState = next;
  (AppState as { currentState: AppStateStatus }).currentState = next;
  if (next !== 'active') {
    act(() => hook.result.current.onLeaveForeground(next));
  } else if (/inactive|background/.test(previous)) {
    act(() => hook.result.current.onEnterForeground(previous, { skipRead }));
  }
  await settle();
};

const resume = async (hook: Hook, skipRead = false) => {
  await goTo(hook, 'inactive');
  await goTo(hook, 'background');
  await goTo(hook, 'inactive');
  await goTo(hook, 'active', skipRead);
};

/** The iOS paste prompt (or Control Center) flips the app inactive and back without a background. */
const pastePromptFlip = async (hook: Hook) => {
  await goTo(hook, 'inactive');
  await goTo(hook, 'active');
};

const launch = async (enabled = true) => {
  const hook = renderHook(useClipboardDetection, { initialProps: enabled });
  await settle();
  return hook;
};

const sheetPushed = () => expect(navigationRef.dispatch).toHaveBeenCalledWith(expect.objectContaining({ name: 'ClipboardDetected' }));

beforeEach(() => {
  jest.clearAllMocks();
  environmentState.isDesktop = false;
  storageState.wallets = [WALLET];
  appState = 'active';
  (AppState as { currentState: AppStateStatus }).currentState = 'active';
  jest.mocked(getClipboardContent).mockResolvedValue(P2WPKH);
  jest.mocked(navigationRef.isReady).mockReturnValue(true);
  jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: 'WalletsList', key: 'WalletsList' });
});

it('reads once at launch and presents the Detected sheet when the paste is allowed', async () => {
  await launch();
  expect(getClipboardContent).toHaveBeenCalledTimes(1);
  sheetPushed();
});

it('does not re-read after the user denies the iOS paste prompt', async () => {
  jest.mocked(getClipboardContent).mockResolvedValue(undefined);
  const hook = await launch();
  await pastePromptFlip(hook);
  await pastePromptFlip(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(1);
  expect(navigationRef.dispatch).not.toHaveBeenCalled();
});

it('reads again on a real background resume after a denied paste', async () => {
  jest.mocked(getClipboardContent).mockResolvedValueOnce(undefined);
  const hook = await launch();
  await pastePromptFlip(hook);
  await resume(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(2);
  sheetPushed();
});

it('reads on every real resume', async () => {
  const hook = await launch();
  jest.mocked(navigationRef.dispatch).mockClear();
  await resume(hook);
  await resume(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(3);
  sheetPushed();
});

it('defers the launch read until the app becomes active', async () => {
  appState = 'inactive';
  (AppState as { currentState: AppStateStatus }).currentState = 'inactive';
  const hook = await launch();
  expect(getClipboardContent).not.toHaveBeenCalled();

  await goTo(hook, 'active');
  expect(getClipboardContent).toHaveBeenCalledTimes(1);
  sheetPushed();

  await pastePromptFlip(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(1);
});

it('treats a Catalyst window refocus as a resume, even after an empty clipboard', async () => {
  environmentState.isDesktop = true;
  jest.mocked(getClipboardContent).mockResolvedValueOnce(undefined);
  const hook = await launch();
  await pastePromptFlip(hook);
  await pastePromptFlip(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(3);
  sheetPushed();
});

it('skips the read on a resume that opened a push notification, until the next real resume', async () => {
  const hook = await launch();
  jest.mocked(navigationRef.dispatch).mockClear();

  await resume(hook, true);
  await pastePromptFlip(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(1);
  expect(navigationRef.dispatch).not.toHaveBeenCalled();

  await resume(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(2);
  sheetPushed();
});

it('keeps a resume read that arrives while a read is still waiting on the paste prompt', async () => {
  let answerPrompt: (value: string | undefined) => void = () => {};
  jest.mocked(getClipboardContent).mockImplementationOnce(() => new Promise(resolve => (answerPrompt = resolve)));
  const hook = await launch();

  await resume(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(1);

  await act(async () => answerPrompt(undefined));
  await pastePromptFlip(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(2);
  sheetPushed();

  await pastePromptFlip(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(2);
});

it('does not push the sheet again when it is already on screen', async () => {
  const hook = await launch();
  jest.mocked(navigationRef.dispatch).mockClear();
  jest.mocked(navigationRef.getCurrentRoute).mockReturnValue({ name: 'ClipboardDetected', key: 'ClipboardDetected' });
  await resume(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(2);
  expect(navigationRef.dispatch).not.toHaveBeenCalled();
});

it('does not read when detection is disabled, and reads once it is enabled', async () => {
  const hook = await launch(false);
  await resume(hook);
  expect(getClipboardContent).not.toHaveBeenCalled();

  hook.rerender(true);
  await settle();
  expect(getClipboardContent).toHaveBeenCalledTimes(1);

  hook.rerender(false);
  await settle();
  await resume(hook);
  expect(getClipboardContent).toHaveBeenCalledTimes(1);
});

it('does not read without wallets', async () => {
  storageState.wallets = [];
  const hook = await launch();
  await resume(hook);
  expect(getClipboardContent).not.toHaveBeenCalled();
});
