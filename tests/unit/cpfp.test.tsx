import React from 'react';
import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@react-navigation/native';

import { StorageContext } from '../../components/Context/StorageProvider';
import { SettingsContext } from '../../components/Context/SettingsProvider';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';
import { TWallet } from '../../class/wallets/types';
import { BlueDefaultTheme } from '../../components/themes';
import presentAlert from '../../components/Alert';
import { majorTomToGroundControl } from '../../blue_modules/notifications';
import loc from '../../loc';
import Cpfp from '../../screen/transactions/CPFP';
import RbfBumpFee from '../../screen/transactions/RBFBumpFee';
import RbfCancel from '../../screen/transactions/RBFCancel';

const mockCreated = { tx: { toHex: () => 'deadbeef', getId: () => 'newtxid' }, psbt: 'psbt' };
const mockTx = {
  isToUsTransaction: jest.fn(),
  isOurTransaction: jest.fn(),
  isSequenceReplaceable: jest.fn(),
  canCancelTx: jest.fn(),
  getRemoteConfirmationsNum: jest.fn(),
  getInfo: jest.fn(),
  createCPFPbumpFee: jest.fn(),
  createRBFbumpFee: jest.fn(),
  createRBFcancelTx: jest.fn(),
};
jest.mock('../../class/hd-segwit-bech32-transaction', () => ({
  HDSegwitBech32Transaction: jest.fn().mockImplementation(() => mockTx),
}));

let mockIsWatchOnly = false;
jest.mock('../../util/isWatchOnlySegwitBech32', () => ({
  isWatchOnlySegwitBech32: () => mockIsWatchOnly,
}));

jest.mock('../../blue_modules/BlueElectrum', () => ({
  ensureConnected: () => Promise.resolve(true),
}));
jest.mock('../../blue_modules/hapticFeedback', () => ({ __esModule: true, default: jest.fn(), HapticFeedbackTypes: {} }));
jest.mock('../../blue_modules/notifications', () => ({ majorTomToGroundControl: jest.fn() }));
jest.mock('../../components/Alert', () => ({ __esModule: true, default: jest.fn(), AlertType: { Toast: 'toast' } }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../components/ReplaceFeeSuggestions', () => {
  const { useEffect } = require('react');
  return ({ onFeeSelected }: { onFeeSelected: (fee: number) => void }) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => onFeeSelected(10), []);
    return null;
  };
});

let mockRouteParams: { txid: string; wallet: TWallet };
const mockNavigate = jest.fn();
const mockRootNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  getParent: () => ({ getParent: () => ({ navigate: mockRootNavigate }) }),
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: mockRouteParams }),
  useNavigation: () => mockNavigation,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIsWatchOnly = false;
  mockTx.isToUsTransaction.mockResolvedValue(true);
  mockTx.isOurTransaction.mockResolvedValue(true);
  mockTx.isSequenceReplaceable.mockResolvedValue(true);
  mockTx.canCancelTx.mockResolvedValue(true);
  mockTx.getRemoteConfirmationsNum.mockResolvedValue(0);
  mockTx.getInfo.mockResolvedValue({ feeRate: 5 });
  mockTx.createCPFPbumpFee.mockResolvedValue(mockCreated);
  mockTx.createRBFbumpFee.mockResolvedValue(mockCreated);
  mockTx.createRBFcancelTx.mockResolvedValue(mockCreated);
});

const renderScreen = (
  Screen: React.ComponentType,
  { isElectrumDisabled = false, txMetadata = {}, wallet = new HDSegwitBech32Wallet() as TWallet } = {},
) => {
  wallet.broadcastTx = jest.fn(() => Promise.resolve(true));
  mockRouteParams = { txid: 'txid', wallet };
  const storage = { txMetadata, sleep: () => Promise.resolve(), fetchAndSaveWalletTransactions: jest.fn() };
  const view = render(
    <StorageContext.Provider value={storage as unknown as React.ContextType<typeof StorageContext>}>
      <SettingsContext.Provider value={{ isElectrumDisabled } as React.ContextType<typeof SettingsContext>}>
        <ThemeProvider value={BlueDefaultTheme}>
          <Screen />
        </ThemeProvider>
      </SettingsContext.Provider>
    </StorageContext.Provider>,
  );
  return { view, wallet, storage };
};

const toSendNow = async (view: ReturnType<typeof render>) => {
  await waitFor(() => expect(view.getByText('Create')).toBeTruthy(), { timeout: 5000 });
  fireEvent.press(view.getByText('Create'));
  await waitFor(() => expect(view.getByText('Send now')).toBeTruthy());
  return view.getByRole('button', { name: 'Send now' });
};

describe('CPFP', () => {
  it('disables Send now when electrum is disabled', async () => {
    const { view } = renderScreen(Cpfp, { isElectrumDisabled: true });
    expect(await toSendNow(view)).toBeDisabled();
  });

  it('bumps with the selected rate, broadcasts, labels the tx and opens Success', async () => {
    const txMetadata: Record<string, { memo?: string }> = {};
    const { view, wallet, storage } = renderScreen(Cpfp, { txMetadata });
    const button = await toSendNow(view);
    expect(mockTx.createCPFPbumpFee).toHaveBeenCalledWith(10);
    fireEvent.press(button);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Success', expect.objectContaining({ walletID: wallet.getID() })));
    expect(wallet.broadcastTx).toHaveBeenCalledWith('deadbeef');
    expect(txMetadata.newtxid.memo).toBe('Child pays for parent (CPFP)');
    expect(majorTomToGroundControl).toHaveBeenCalledWith([], [], ['newtxid']);
    await waitFor(() => expect(storage.fetchAndSaveWalletTransactions).toHaveBeenCalledWith(wallet.getID()));
  });

  it('stays on Send now and alerts when broadcast fails', async () => {
    const { view, wallet } = renderScreen(Cpfp);
    const button = await toSendNow(view);
    (wallet.broadcastTx as jest.Mock).mockResolvedValue(false);
    fireEvent.press(button);
    await waitFor(() => expect(presentAlert).toHaveBeenCalled());
    expect(view.getByText('Send now')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('alerts and stays on fee selection when the replacement is not signed', async () => {
    mockTx.createCPFPbumpFee.mockResolvedValue({ tx: undefined });
    const { view } = renderScreen(Cpfp);
    await waitFor(() => expect(view.getByText('Create')).toBeTruthy());
    fireEvent.press(view.getByText('Create'));
    await waitFor(() => expect(presentAlert).toHaveBeenCalled());
    expect(view.getByText('Create')).toBeTruthy();
  });
});

describe('RBFBumpFee', () => {
  it('alerts and goes back when the check throws', async () => {
    mockTx.isOurTransaction.mockRejectedValue(new Error('electrum down'));
    const { view } = renderScreen(RbfBumpFee);
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(presentAlert).toHaveBeenCalledWith({ message: 'electrum down' });
    expect(view.queryByText(loc.transactions.cpfp_no_bump)).toBeNull();
  });

  it('stays silent when the user left before the check failed', async () => {
    let fail: (e: Error) => void = () => {};
    mockTx.getInfo.mockReturnValue(new Promise((_resolve, reject) => (fail = reject)));
    const { view } = renderScreen(RbfBumpFee);
    await waitFor(() => expect(mockTx.getInfo).toHaveBeenCalled());
    view.unmount();
    fail(new Error('electrum down'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(presentAlert).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('ports the memo and does not register notifications', async () => {
    const txMetadata: Record<string, { memo?: string }> = { txid: { memo: 'rent' } };
    const { view } = renderScreen(RbfBumpFee, { txMetadata });
    const button = await toSendNow(view);
    expect(mockTx.createRBFbumpFee).toHaveBeenCalledWith(10);
    fireEvent.press(button);
    await waitFor(() => expect(txMetadata.newtxid?.memo).toBe('rent'));
    expect(txMetadata.newtxid).not.toBe(txMetadata.txid);
    expect(majorTomToGroundControl).not.toHaveBeenCalled();
  });

  it('sends a watch-only wallet to PSBT signing with the old memo', async () => {
    mockIsWatchOnly = true;
    const { view, wallet } = renderScreen(RbfBumpFee, { txMetadata: { txid: { memo: 'rent' } }, wallet: new WatchOnlyWallet() });
    await waitFor(() => expect(view.getByText('Create')).toBeTruthy());
    fireEvent.press(view.getByText('Create'));
    await waitFor(() =>
      expect(mockRootNavigate).toHaveBeenCalledWith('SendDetailsRoot', {
        screen: 'PsbtWithHardwareWallet',
        params: { memo: 'rent', walletID: wallet.getID(), psbt: 'psbt' },
      }),
    );
  });
});

describe('RBFCancel', () => {
  it('ports the memo of the cancelled tx', async () => {
    const txMetadata: Record<string, { memo?: string }> = { txid: { memo: 'rent' } };
    const { view } = renderScreen(RbfCancel, { txMetadata });
    fireEvent.press(await toSendNow(view));
    await waitFor(() => expect(txMetadata.newtxid?.memo).toBe('Cancelled: rent'));
    expect(txMetadata.txid.memo).toBe('rent');
  });

  it('labels a cancel of a tx without memo', async () => {
    const txMetadata: Record<string, { memo?: string }> = {};
    const { view } = renderScreen(RbfCancel, { txMetadata });
    fireEvent.press(await toSendNow(view));
    await waitFor(() => expect(txMetadata.newtxid?.memo).toBe('Cancelled transaction'));
    expect(txMetadata.txid).toBeUndefined();
  });

  it('shows the cannot-cancel text when the tx cannot be cancelled', async () => {
    mockTx.canCancelTx.mockResolvedValue(false);
    const { view } = renderScreen(RbfCancel);
    await waitFor(() => expect(view.getByText(loc.transactions.cancel_no)).toBeTruthy());
  });
});

describe('TxHex', () => {
  it('copies and verifies the signed hex', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { view } = renderScreen(Cpfp);
    await toSendNow(view);
    expect(view.getByText('deadbeef')).toBeTruthy();
    fireEvent.press(view.getByText(loc.send.create_copy));
    expect(Clipboard.setString).toHaveBeenCalledWith('deadbeef');
    fireEvent.press(view.getByText(loc.send.create_verify));
    expect(openURL).toHaveBeenCalledWith('https://coinb.in/?verify=deadbeef');
  });
});
