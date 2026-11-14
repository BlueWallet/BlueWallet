import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import WalletsAdd from '../../screen/wallets/Add';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { Chain } from '../../models/bitcoinUnits';
import presentAlert from '../../components/Alert';
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

jest.mock('../../components/Alert', () => jest.fn());

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
});
