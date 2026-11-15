import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import WalletsAdd from '../../screen/wallets/Add';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { Chain } from '../../models/bitcoinUnits';
import presentAlert from '../../components/Alert';
import loc from '../../loc';
import { SafeAreaProvider } from 'react-native-safe-area-context';

let routeParams: Record<string, unknown> = {};
const navigateMock = jest.fn();
const goBackMock = jest.fn();
const setParamsMock = jest.fn();
const addWalletMock = jest.fn();
const saveToDiskMock = jest.fn(() => Promise.resolve());
const mockAskNewPassphrase = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: navigateMock, goBack: goBackMock, setParams: setParamsMock }),
    useRoute: () => ({ params: routeParams }),
  };
});

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ addWallet: addWalletMock, saveToDisk: saveToDiskMock, wallets: [] }),
}));

jest.mock('../../helpers/askNewPassphrase', () => ({
  askNewPassphrase: () => mockAskNewPassphrase(),
}));

const mockRunAfterAlertDismissed = jest.fn();

jest.mock('../../components/Alert', () => ({
  __esModule: true,
  default: jest.fn(),
  runAfterAlertDismissed: (callback: () => void) => mockRunAfterAlertDismissed(callback),
}));

jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: { NotificationSuccess: 'notificationSuccess' },
}));

jest.mock('../../helpers/lndHub', () => ({ getLNDHub: () => Promise.resolve('') }));
jest.mock('../../helpers/scan-qr.ts', () => ({ resetScanWasBBQR: jest.fn() }));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: { foregroundColor: '#000', elevated: '#fff', background: '#fff', brandingColor: '#000', inputBorderColor: '#ccc' },
  }),
}));

const renderAndPressCreate = async () => {
  const screen = render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <WalletsAdd />
    </SafeAreaProvider>,
  );
  // the Create button only renders once the initial loading state has cleared
  await waitFor(() => expect(screen.getByTestId('Create')).toBeTruthy());
  fireEvent.press(screen.getByTestId('Create'));
  return screen;
};

describe('WalletsAdd Create with passphrase enabled', () => {
  let generateSpy: jest.SpyInstance;
  let generateFromEntropySpy: jest.SpyInstance;
  let setPassphraseSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (presentAlert as unknown as jest.Mock).mockReset();
    routeParams = { askPassphraseMenuState: true, selectedWalletType: Chain.ONCHAIN };
    generateSpy = jest.spyOn(HDSegwitBech32Wallet.prototype, 'generate').mockResolvedValue(undefined as never);
    generateFromEntropySpy = jest.spyOn(HDSegwitBech32Wallet.prototype, 'generateFromEntropy').mockResolvedValue(undefined as never);
    setPassphraseSpy = jest.spyOn(HDSegwitBech32Wallet.prototype, 'setPassphrase');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sets the passphrase on the wallet before generating it', async () => {
    mockAskNewPassphrase.mockResolvedValue('my passphrase');

    await renderAndPressCreate();

    await waitFor(() => expect(addWalletMock).toHaveBeenCalledTimes(1));
    expect(setPassphraseSpy).toHaveBeenCalledWith('my passphrase');
    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(setPassphraseSpy.mock.invocationCallOrder[0]).toBeLessThan(generateSpy.mock.invocationCallOrder[0]);
  });

  it('sets the passphrase before generating from entropy when entropy was provided', async () => {
    routeParams = { ...routeParams, entropy: 'ab'.repeat(16), providedEntropyBytes: 16 };
    mockAskNewPassphrase.mockResolvedValue('my passphrase');

    await renderAndPressCreate();

    await waitFor(() => expect(addWalletMock).toHaveBeenCalledTimes(1));
    expect(setPassphraseSpy.mock.invocationCallOrder[0]).toBeLessThan(generateFromEntropySpy.mock.invocationCallOrder[0]);
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('cancelling the passphrase prompt does not create a wallet and re-enables Create', async () => {
    mockAskNewPassphrase.mockResolvedValue(undefined);

    const screen = await renderAndPressCreate();

    await waitFor(() => expect(mockAskNewPassphrase).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('Create')).toBeTruthy());
    expect(addWalletMock).not.toHaveBeenCalled();
    expect(generateSpy).not.toHaveBeenCalled();
    expect(setPassphraseSpy).not.toHaveBeenCalled();
  });

  it('resets the loading state and shows an alert when generateFromEntropy fails', async () => {
    routeParams = { ...routeParams, entropy: 'ab'.repeat(16), providedEntropyBytes: 16 };
    mockAskNewPassphrase.mockResolvedValue('my passphrase');
    generateFromEntropySpy.mockRejectedValue(new Error('bad entropy'));

    const screen = await renderAndPressCreate();

    await waitFor(() => expect(presentAlert).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('Create')).toBeTruthy());
    expect(addWalletMock).not.toHaveBeenCalled();
  });

  it('navigates to PleaseBackup only after the usage alert is dismissed following OK', async () => {
    let onOkPress: (() => void) | undefined;
    let onDismissed: (() => void) | undefined;
    (presentAlert as unknown as jest.Mock).mockImplementation(({ buttons }: { buttons: { onPress: () => void }[] }) => {
      onOkPress = buttons[0].onPress;
    });
    mockRunAfterAlertDismissed.mockImplementation((callback: () => void) => {
      onDismissed = callback;
      return true;
    });
    mockAskNewPassphrase.mockResolvedValue('my passphrase');

    await renderAndPressCreate();

    await waitFor(() =>
      expect(presentAlert).toHaveBeenCalledWith(
        expect.objectContaining({ title: loc.wallets.add_passphrase_usage_title, message: loc.wallets.add_passphrase_usage_message }),
      ),
    );
    expect(addWalletMock).toHaveBeenCalledTimes(1);

    onOkPress!();
    expect(mockRunAfterAlertDismissed).toHaveBeenCalledTimes(1);
    expect(navigateMock).not.toHaveBeenCalled();

    onDismissed!();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('PleaseBackup', { walletID: expect.any(String) }));
  });

  it('navigates immediately after OK when the alert is no longer visible', async () => {
    let onOkPress: (() => void) | undefined;
    (presentAlert as unknown as jest.Mock).mockImplementation(({ buttons }: { buttons: { onPress: () => void }[] }) => {
      onOkPress = buttons[0].onPress;
    });
    mockRunAfterAlertDismissed.mockReturnValue(false);
    mockAskNewPassphrase.mockResolvedValue('my passphrase');

    await renderAndPressCreate();

    await waitFor(() => expect(presentAlert).toHaveBeenCalledTimes(1));
    expect(navigateMock).not.toHaveBeenCalled();

    onOkPress!();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('PleaseBackup', { walletID: expect.any(String) }));
  });

  it('falls back to navigating when the dismissal signal never arrives after OK', async () => {
    jest.useFakeTimers();
    try {
      let onOkPress: (() => void) | undefined;
      (presentAlert as unknown as jest.Mock).mockImplementation(({ buttons }: { buttons: { onPress: () => void }[] }) => {
        onOkPress = buttons[0].onPress;
      });
      mockRunAfterAlertDismissed.mockReturnValue(true);
      mockAskNewPassphrase.mockResolvedValue('my passphrase');

      const screen = render(
        <SafeAreaProvider
          initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
        >
          <WalletsAdd />
        </SafeAreaProvider>,
      );
      await waitFor(() => expect(screen.getByTestId('Create')).toBeTruthy());
      fireEvent.press(screen.getByTestId('Create'));
      await waitFor(() => expect(presentAlert).toHaveBeenCalledTimes(1));
      expect(onOkPress).toBeDefined();

      onOkPress!();
      expect(navigateMock).not.toHaveBeenCalled();

      // longer than the fallback delay used by the screen
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(navigateMock).toHaveBeenCalledWith('PleaseBackup', { walletID: expect.any(String) });
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not show the usage alert when no passphrase was entered', async () => {
    routeParams = { selectedWalletType: Chain.ONCHAIN };

    await renderAndPressCreate();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('PleaseBackup', { walletID: expect.any(String) }));
    expect(mockAskNewPassphrase).not.toHaveBeenCalled();
    expect(presentAlert).not.toHaveBeenCalledWith(expect.objectContaining({ title: loc.wallets.add_passphrase_usage_title }));
  });
});
