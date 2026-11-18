import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Pressable } from 'react-native';
import { Header } from '../../components/Header';

jest.mock('../../components/themes', () => ({
  useTheme: () => ({ colors: { background: '#fff', elevated: '#fff', foregroundColor: '#000' } }),
}));
jest.mock('../../components/AddWalletButton', () => 'AddWalletButton');
jest.mock('../../components/Icon', () => 'Icon');
jest.mock('../../components/icons/SettingsButton', () => ({ onPress }: { onPress: () => void }) => (
  <Pressable testID="SettingsButton" onPress={onPress} />
));

describe('Header', () => {
  it('exposes Settings from the persistent sidebar header', () => {
    const onSettingsPress = jest.fn();
    const screen = render(<Header leftText="Wallets" isDrawerList onSettingsPress={onSettingsPress} onManageWalletsPress={jest.fn()} />);

    fireEvent.press(screen.getByTestId('SettingsButton'));

    expect(onSettingsPress).toHaveBeenCalledTimes(1);
  });
});
