import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import WalletExport from '../../screen/wallets/WalletExport';
import loc from '../../loc';

const mockEnableScreenProtect = jest.fn();
const mockDisableScreenProtect = jest.fn();
const mockWallets: HDSegwitBech32Wallet[] = [];

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { walletID: mockWallets[0].getID() } }),
}));
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: () => ({ wallets: mockWallets }) }));
jest.mock('../../hooks/context/useSettings', () => ({ useSettings: () => ({ isPrivacyBlurEnabled: false }) }));
jest.mock('../../hooks/useScreenProtect', () => ({
  useScreenProtect: () => ({ enableScreenProtect: mockEnableScreenProtect, disableScreenProtect: mockDisableScreenProtect }),
}));
jest.mock('../../hooks/useAppState', () => () => ({ currentAppState: 'active', previousAppState: 'active' }));
jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      elevated: '#fff',
      changeText: '#F38C47',
      inputBackgroundColor: '#f5f5f5',
      labelText: '#000',
      foregroundColor: '#000',
      lightButton: '#eee',
    },
  }),
}));
jest.mock('../../components/Button', () => 'Button');
jest.mock('../../components/Icon', () => () => null);
jest.mock('../../components/QRCode', () => 'QRCode');
jest.mock('../../components/HandOffComponent', () => () => null);
jest.mock('../../components/SeedWords', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ seed }: { seed: string }) => <Text testID="ExportSeedWords">{seed}</Text>;
});

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PASSPHRASE = 'my test passphrase';

const makeWallet = (passphrase?: string) => {
  const wallet = new HDSegwitBech32Wallet();
  wallet.setSecret(MNEMONIC);
  if (passphrase !== undefined) wallet.setPassphrase(passphrase);
  return wallet;
};

describe('WalletExport with a BIP39 passphrase', () => {
  beforeEach(() => {
    mockWallets.length = 0;
    mockEnableScreenProtect.mockClear();
    mockDisableScreenProtect.mockClear();
  });

  it('shows the QR code, the words, a passphrase warning and the reveal button', () => {
    mockWallets.push(makeWallet(PASSPHRASE));
    const screen = render(<WalletExport />);

    expect(screen.queryByText(loc.wallets.scan_import)).toBeNull();
    expect(screen.getByText(loc.wallets.export_passphrase_qr_unavailable)).toBeTruthy();
    expect(screen.getByTestId('ExportPassphraseWarning')).toBeTruthy();
    expect(screen.getByTestId('ExportSeedWords').props.children).toBe(MNEMONIC);
    expect(screen.getByTestId('ExportViewPassphraseButton')).toBeTruthy();
    // passphrase is not rendered until the user asks for it
    expect(screen.queryByText(PASSPHRASE)).toBeNull();
  });

  it('reveals the passphrase only after the view button is pressed and hides it again on close', () => {
    mockWallets.push(makeWallet(PASSPHRASE));
    const screen = render(<WalletExport />);

    act(() => fireEvent.press(screen.getByTestId('ExportViewPassphraseButton')));
    expect(mockEnableScreenProtect).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ExportBackupPassphrase').props.children).toBe(PASSPHRASE);

    act(() => fireEvent.press(screen.getByTestId('ExportClosePassphraseButton')));
    expect(mockDisableScreenProtect).toHaveBeenCalled();
    expect(screen.queryByTestId('ExportBackupPassphrase')).toBeNull();
  });

  it('skips the passphrase UI for wallets without a passphrase', () => {
    mockWallets.push(makeWallet());
    const screen = render(<WalletExport />);

    expect(screen.getByText(loc.wallets.scan_import)).toBeTruthy();
    expect(screen.queryByTestId('ExportPassphraseWarning')).toBeNull();
    expect(screen.queryByTestId('ExportViewPassphraseButton')).toBeNull();
  });
});
