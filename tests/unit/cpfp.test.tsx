import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@react-navigation/native';

import { StorageContext } from '../../components/Context/StorageProvider';
import { SettingsContext } from '../../components/Context/SettingsProvider';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { TWallet } from '../../class/wallets/types';
import { BlueDefaultTheme } from '../../components/themes';
import presentAlert from '../../components/Alert';
import { majorTomToGroundControl } from '../../blue_modules/notifications';
import loc from '../../loc';
import { TxVerificationError } from '../../class/hd-segwit-bech32-transaction';
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
  TxVerificationError: class extends Error {},
}));

jest.mock('../../util/isWatchOnlySegwitBech32', () => ({
  isWatchOnlySegwitBech32: () => false,
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
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: mockRouteParams }),
  useNavigation: () => mockNavigation,
}));

beforeEach(() => {
  jest.clearAllMocks();
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
});

describe('RBFBumpFee', () => {
  it('alerts and goes back when the check throws', async () => {
    mockTx.isOurTransaction.mockRejectedValue(new Error('electrum down'));
    const { view } = renderScreen(RbfBumpFee);
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(presentAlert).toHaveBeenCalledWith({ message: 'electrum down' });
    expect(view.queryByText(loc.transactions.cpfp_no_bump)).toBeNull();
  });

  it('shows the unverified text when the server tx fails verification', async () => {
    mockTx.isOurTransaction.mockRejectedValue(new TxVerificationError('bad tx'));
    const { view } = renderScreen(RbfBumpFee);
    await waitFor(() => expect(view.getByText(loc.transactions.rbf_unverified)).toBeTruthy());
    expect(presentAlert).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
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
});

describe('RBFCancel', () => {
  it('ports the memo of the cancelled tx', async () => {
    const txMetadata: Record<string, { memo?: string }> = { txid: { memo: 'rent' } };
    const { view } = renderScreen(RbfCancel, { txMetadata });
    fireEvent.press(await toSendNow(view));
    await waitFor(() => expect(txMetadata.newtxid?.memo).toBe('Cancelled: rent'));
    expect(txMetadata.txid.memo).toBe('rent');
  });
});
