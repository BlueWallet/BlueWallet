import React from 'react';
import { render } from '@testing-library/react-native';

import loc from '../../loc';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import PleaseBackup from '../../screen/wallets/PleaseBackup';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

let mockWallets: HDSegwitBech32Wallet[] = [];

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ wallets: mockWallets }),
}));

jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ isPrivacyBlurEnabled: false }),
}));

jest.mock('../../hooks/useScreenProtect', () => ({
  useScreenProtect: () => ({
    enableScreenProtect: jest.fn(),
    disableScreenProtect: jest.fn(),
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
  it('shows the passphrase reminder for an HD wallet created with a passphrase', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByText, queryByText } = render(<PleaseBackup />);

    expect(getByText(loc.pleasebackup.text_passphrase)).toBeTruthy();
    expect(queryByText(loc.pleasebackup.text)).toBeNull();
  });

  it('shows the passphrase and the separation warning for an HD wallet with a passphrase', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByTestId, getByText } = render(<PleaseBackup />);

    expect(getByTestId('BackupPassphrase').props.children).toBe('my passphrase');
    expect(getByTestId('PassphraseWarning')).toBeTruthy();
    expect(getByText(loc.pleasebackup.passphrase_warning)).toBeTruthy();
  });

  it('renders all seed words in one grid for a 24-word seed and numbers the passphrase 25', () => {
    const words24 = Array(23).fill('abandon').concat('art').join(' ');
    mockWallets = [buildWallet('my passphrase')];
    mockWallets[0].setSecret(words24);

    const { UNSAFE_getAllByType, getByText } = render(<PleaseBackup />);
    const seeds = UNSAFE_getAllByType('SeedWords' as unknown as React.ComponentType);

    expect(seeds).toHaveLength(1);
    expect(seeds[0].props.seed.split(' ')).toHaveLength(24);
    expect(getByText('25. ')).toBeTruthy();
  });

  it('numbers the passphrase 13 for a 12-word seed', () => {
    mockWallets = [buildWallet('my passphrase')];

    const { getByText } = render(<PleaseBackup />);

    expect(getByText('13. ')).toBeTruthy();
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
