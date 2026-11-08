import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import WalletDetails from '../../screen/wallets/WalletDetails';
import { LegacyWallet } from '../../class/wallets/legacy-wallet';
import { TTXMetadata } from '../../class/blue-app';
import { showFilePickerAndReadFile, writeFileAndExport } from '../../blue_modules/fs';
import { IMPORT_NOTES_ACTION_ID, SHARE_ACCOUNTING_ACTION_ID } from '../../blue_modules/wallet-history-export';
import prompt from '../../helpers/prompt';
import loc from '../../loc';

const wallet = new LegacyWallet();
const txid = 'a'.repeat(64);
const metadata: TTXMetadata = {};
const saveToDisk = jest.fn().mockResolvedValue(undefined);
const storage = { wallets: [wallet], txMetadata: metadata, addressMetadata: {}, saveToDisk };

jest.mock('../../blue_modules/fs', () => ({
  ...jest.requireActual('../../blue_modules/fs'),
  showFilePickerAndReadFile: jest.fn(),
  writeFileAndExport: jest.fn(),
}));
jest.mock('../../helpers/prompt', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  ...jest.requireActual('../../blue_modules/hapticFeedback'),
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: () => storage }));
jest.mock('../../hooks/context/useSettings', () => ({ useSettings: () => ({ language: 'en' }) }));
jest.mock('../../hooks/useBiometrics', () => ({ useBiometrics: () => ({ isBiometricUseCapableAndEnabled: false }) }));
jest.mock('../../hooks/useScreenMenuActions', () => ({ __esModule: true, default: () => {} }));
jest.mock('../../NavigationService', () => ({ navigationRef: { isReady: () => true } }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({}),
  useRoute: () => ({ params: { walletID: wallet.getID() } }),
  useFocusEffect: () => {},
  usePreventRemove: () => {},
  useLocale: () => ({ direction: 'ltr' }),
}));
jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../components/TooltipMenu', () => 'TooltipMenu');

describe('Wallet Details note import', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(wallet, 'getTransactions').mockReturnValue([
      {
        txid,
        hash: txid,
        inputs: [],
        outputs: [],
        timestamp: 0,
        value: 1_000,
        version: 2,
        size: 100,
        vsize: 100,
        weight: 400,
        locktime: 0,
      },
    ]);
    saveToDisk.mockClear();
    delete metadata[txid];
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([
    JSON.stringify({ type: 'addr', ref: 'bc1qother', label: 'Address label' }),
    JSON.stringify({ type: 'tx', ref: 'b'.repeat(64), label: 'Other wallet note' }),
    JSON.stringify({ type: 'tx', ref: txid, label: 'Unchanged note' }),
  ])('keeps no-change results in the iOS alert body and leaves storage untouched: %s', async contents => {
    metadata[txid] = { memo: 'Unchanged note' };
    jest.mocked(showFilePickerAndReadFile).mockResolvedValue({ data: contents, uri: 'sample.jsonl' });
    const screen = render(<WalletDetails />);
    await act(async () => fireEvent(screen.getByTestId('TransactionHistoryMenuButton'), 'pressMenuItem', IMPORT_NOTES_ACTION_ID));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Import Notes',
      `${loc.wallets.details_import_notes_no_changes}\n\n${loc.wallets.details_import_notes_scope}`,
      expect.any(Array),
      expect.any(Object),
    );
    expect(metadata).toEqual({ [txid]: { memo: 'Unchanged note' } });
    expect(saveToDisk).not.toHaveBeenCalled();
  });

  it('shows the Numbers conversion explanation with the same short Import Notes title', async () => {
    jest.replaceProperty(loc.wallets, 'details_import_notes', 'Import Notes… ');
    jest.mocked(showFilePickerAndReadFile).mockResolvedValue({ data: false, uri: 'sample.numbers', unsupportedFileType: 'numbers' });
    const screen = render(<WalletDetails />);
    await act(async () => fireEvent(screen.getByTestId('TransactionHistoryMenuButton'), 'pressMenuItem', IMPORT_NOTES_ACTION_ID));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Import Notes',
      loc.wallets.details_import_numbers_unsupported,
      expect.any(Array),
      expect.any(Object),
    );
    expect(saveToDisk).not.toHaveBeenCalled();
  });

  it.each([false, true])('only applies a selected-wallet note when the user confirms: %s', async confirmed => {
    const contents = [
      { type: 'tx', ref: txid, label: 'Relevant note' },
      { type: 'tx', ref: 'b'.repeat(64), label: 'Other wallet note' },
    ]
      .map(record => JSON.stringify(record))
      .join('\n');
    jest.mocked(showFilePickerAndReadFile).mockResolvedValue({ data: contents, uri: 'sample.jsonl' });
    const screen = render(<WalletDetails />);
    let importing!: Promise<void>;
    act(() => {
      importing = screen.getByTestId('TransactionHistoryMenuButton').props.onPressMenuItem(IMPORT_NOTES_ACTION_ID);
    });
    await act(async () => {});
    expect(metadata).toEqual({});
    expect(saveToDisk).not.toHaveBeenCalled();
    const buttons = jest.mocked(Alert.alert).mock.calls[0][2];
    await act(async () => {
      await buttons?.find(button => button.text === (confirmed ? loc._.ok : loc._.cancel))?.onPress?.();
      await importing;
    });
    expect(metadata).toEqual(confirmed ? { [txid]: { memo: 'Relevant note' } } : {});
    expect(saveToDisk).toHaveBeenCalledTimes(confirmed ? 1 : 0);
  });

  it('updates the export filename after renaming the wallet', async () => {
    jest.mocked(prompt).mockResolvedValue('Renamed Wallet');
    const screen = render(<WalletDetails />);
    await act(async () => fireEvent.press(screen.getByTestId('WalletNameEditButton')));
    await act(async () => fireEvent(screen.getByTestId('TransactionHistoryMenuButton'), 'pressMenuItem', SHARE_ACCOUNTING_ACTION_ID));
    expect(writeFileAndExport).toHaveBeenCalledWith('Renamed-Wallet-accounting.csv', expect.stringContaining('Transaction ID'), true);
  });
});
