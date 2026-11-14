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
  useScreenProtect: () => ({ enableScreenProtect: jest.fn(), disableScreenProtect: jest.fn() }),
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

  it('shows the default backup text for an HD wallet without a passphrase', () => {
    mockWallets = [buildWallet()];

    const { getByText, queryByText } = render(<PleaseBackup />);

    expect(getByText(loc.pleasebackup.text)).toBeTruthy();
    expect(queryByText(loc.pleasebackup.text_passphrase)).toBeNull();
  });
});
