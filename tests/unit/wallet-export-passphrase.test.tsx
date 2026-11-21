import React from 'react';
import { render } from '@testing-library/react-native';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import WalletExport from '../../screen/wallets/WalletExport';
import loc from '../../loc';

const mockDisableScreenProtect = jest.fn();
const mockWallets: HDSegwitBech32Wallet[] = [];
const mockSettings = { isPrivacyBlurEnabled: false };
const mockAppState = { currentAppState: 'active', previousAppState: 'active' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: { walletID: mockWallets[0].getID() } }),
}));
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: () => ({ wallets: mockWallets }) }));
jest.mock('../../hooks/context/useSettings', () => ({ useSettings: () => mockSettings }));
jest.mock('../../hooks/useScreenProtect', () => ({
  useScreenProtect: () => ({ enableScreenProtect: jest.fn(), disableScreenProtect: mockDisableScreenProtect }),
}));
jest.mock('../../hooks/useAppState', () => () => mockAppState);
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
jest.mock('../../components/Icon', () => () => null);
jest.mock('../../components/QRCode', () => 'QRCode');
jest.mock('../../components/HandOffComponent', () => () => null);
jest.mock('../../components/SeedWords', () => {
  const { Text } = jest.requireActual('react-native');
  return ({ seed }: { seed: string }) => <Text testID="ExportSeedWords">{seed}</Text>;
});

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PASSPHRASE = 'my test passphrase';

const makeWallet = (passphrase?: string, secret: string = MNEMONIC) => {
  const wallet = new HDSegwitBech32Wallet();
  wallet.setSecret(secret);
  if (passphrase !== undefined) wallet.setPassphrase(passphrase);
  return wallet;
};

describe('WalletExport with a BIP39 passphrase', () => {
  beforeEach(() => {
    mockWallets.length = 0;
    mockSettings.isPrivacyBlurEnabled = false;
    mockAppState.currentAppState = 'active';
    mockAppState.previousAppState = 'active';
    mockDisableScreenProtect.mockClear();
  });

  it('shows the QR code, the words and a passphrase warning', () => {
    mockWallets.push(makeWallet(PASSPHRASE));
    const screen = render(<WalletExport />);

    expect(screen.queryByText(loc.wallets.scan_import)).toBeNull();
    expect(screen.getByText(loc.wallets.export_passphrase_qr_unavailable)).toBeTruthy();
    expect(screen.getByTestId('ExportPassphraseWarning')).toBeTruthy();
    expect(screen.getByTestId('ExportSeedWords').props.children).toBe(MNEMONIC);
  });

  it('never renders the passphrase', () => {
    mockWallets.push(makeWallet(PASSPHRASE));
    const screen = render(<WalletExport />);

    expect(screen.queryByText(PASSPHRASE)).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain(PASSPHRASE);
  });

  it('skips the passphrase UI for wallets without a passphrase', () => {
    mockWallets.push(makeWallet());
    const screen = render(<WalletExport />);

    expect(screen.getByText(loc.wallets.scan_import)).toBeTruthy();
    expect(screen.queryByTestId('ExportPassphraseWarning')).toBeNull();
  });

  it('skips the passphrase UI for an empty passphrase', () => {
    mockWallets.push(makeWallet(''));
    const screen = render(<WalletExport />);

    expect(screen.getByText(loc.wallets.scan_import)).toBeTruthy();
    expect(screen.queryByTestId('ExportPassphraseWarning')).toBeNull();
  });

  it('skips the passphrase UI when the secret is not a BIP39 mnemonic', () => {
    mockWallets.push(makeWallet(PASSPHRASE, 'not a valid mnemonic phrase at all'));
    const screen = render(<WalletExport />);

    expect(screen.getByText(loc.wallets.scan_import)).toBeTruthy();
    expect(screen.queryByTestId('ExportPassphraseWarning')).toBeNull();
  });
});
