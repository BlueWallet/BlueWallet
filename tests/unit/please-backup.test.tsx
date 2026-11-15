import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Modal } from 'react-native';

import loc from '../../loc';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import PleaseBackup from '../../screen/wallets/PleaseBackup';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

let mockWallets: HDSegwitBech32Wallet[] = [];
let mockIsPrivacyBlurEnabled = false;
const mockEnableScreenProtect = jest.fn();
const mockDisableScreenProtect = jest.fn();

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ wallets: mockWallets }),
}));

jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ isPrivacyBlurEnabled: mockIsPrivacyBlurEnabled }),
}));

jest.mock('../../hooks/useScreenProtect', () => ({
  useScreenProtect: () => ({
    enableScreenProtect: mockEnableScreenProtect,
    disableScreenProtect: mockDisableScreenProtect,
  }),
}));

jest.mock('../../components/SeedWords', () => 'SeedWords');
jest.mock('../../components/Button', () => 'Button');

jest.mock('../../components/themes', () => ({
  useTheme: () => ({ colors: { elevated: '#fff', foregroundColor: '#000' } }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({ params: { walletID: mockWallets[0]?.getID() } }),
    useNavigation: () => ({ getParent: () => ({ goBack: jest.fn() }) }),
    useFocusEffect: jest.fn(),
    useLocale: () => ({ direction: 'ltr' }),
  };
});

const buildWallet = (passphrase?: string) => {
  const wallet = new HDSegwitBech32Wallet();
  wallet.setSecret(MNEMONIC);
  if (passphrase !== undefined) wallet.setPassphrase(passphrase);
  return wallet;
};

describe('PleaseBackup passphrase text', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPrivacyBlurEnabled = false;
  });

  it('shows the passphrase reminder for an HD wallet created with a passphrase', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByText, queryByText } = render(<PleaseBackup />);

    expect(getByText(loc.pleasebackup.text_passphrase)).toBeTruthy();
    expect(queryByText(loc.pleasebackup.text)).toBeNull();
  });

  it('keeps the passphrase hidden until the view passphrase button is pressed', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByTestId, queryByTestId } = render(<PleaseBackup />);

    expect(queryByTestId('BackupPassphrase')).toBeNull();
    fireEvent.press(getByTestId('ViewPassphraseButton'));
    expect(getByTestId('BackupPassphrase').props.children).toBe('my passphrase');
  });

  it('shows the separation warning for an HD wallet with a passphrase', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByTestId, getByText } = render(<PleaseBackup />);

    expect(getByTestId('PassphraseWarning')).toBeTruthy();
    expect(getByText(loc.pleasebackup.passphrase_warning)).toBeTruthy();
  });

  it('hides the passphrase again when the dialog is closed', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByTestId, queryByTestId } = render(<PleaseBackup />);

    fireEvent.press(getByTestId('ViewPassphraseButton'));
    fireEvent.press(getByTestId('ClosePassphraseButton'));
    expect(queryByTestId('BackupPassphrase')).toBeNull();
  });

  it('enables screen protection when the passphrase is revealed', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByTestId } = render(<PleaseBackup />);

    fireEvent.press(getByTestId('ViewPassphraseButton'));
    expect(mockEnableScreenProtect).toHaveBeenCalledTimes(1);
    expect(mockDisableScreenProtect).not.toHaveBeenCalled();
  });

  it('disables screen protection when the dialog is closed and privacy blur is off', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByTestId } = render(<PleaseBackup />);

    fireEvent.press(getByTestId('ViewPassphraseButton'));
    fireEvent.press(getByTestId('ClosePassphraseButton'));
    expect(mockDisableScreenProtect).toHaveBeenCalledTimes(1);
  });

  it('closes the passphrase dialog and disables screen protection on Android back (requestClose)', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByTestId, queryByTestId, UNSAFE_getByType } = render(<PleaseBackup />);

    fireEvent.press(getByTestId('ViewPassphraseButton'));
    expect(getByTestId('BackupPassphrase')).toBeTruthy();

    fireEvent(UNSAFE_getByType(Modal), 'requestClose');
    expect(queryByTestId('BackupPassphrase')).toBeNull();
    expect(mockDisableScreenProtect).toHaveBeenCalledTimes(1);
  });

  it('keeps screen protection on after closing the dialog when privacy blur is on', () => {
    mockIsPrivacyBlurEnabled = true;
    mockWallets = [buildWallet('my passphrase')];

    const { getByTestId } = render(<PleaseBackup />);

    fireEvent.press(getByTestId('ViewPassphraseButton'));
    fireEvent.press(getByTestId('ClosePassphraseButton'));
    expect(mockDisableScreenProtect).not.toHaveBeenCalled();
  });

  it('renders all seed words in one grid for a 24-word seed', () => {
    const words24 = Array(23).fill('abandon').concat('art').join(' ');
    mockWallets = [buildWallet('my passphrase')];
    mockWallets[0].setSecret(words24);

    const { UNSAFE_getAllByType } = render(<PleaseBackup />);
    const seeds = UNSAFE_getAllByType('SeedWords' as unknown as React.ComponentType);

    expect(seeds).toHaveLength(1);
    expect(seeds[0].props.seed.split(' ')).toHaveLength(24);
  });

  it('shows the passphrase without a seed word number prefix', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByTestId, getByText } = render(<PleaseBackup />);

    fireEvent.press(getByTestId('ViewPassphraseButton'));
    expect(getByText(loc.wallets.import_passphrase_title)).toBeTruthy();
    expect(getByTestId('BackupPassphrase').props.children).toBe('my passphrase');
  });

  it('shows the default backup text for an HD wallet without a passphrase', () => {
    mockWallets = [buildWallet()];

    const { getByText, queryByText, queryByTestId } = render(<PleaseBackup />);

    expect(getByText(loc.pleasebackup.text)).toBeTruthy();
    expect(queryByText(loc.pleasebackup.text_passphrase)).toBeNull();
    expect(queryByTestId('BackupPassphrase')).toBeNull();
    expect(queryByTestId('PassphraseWarning')).toBeNull();
  });
});
