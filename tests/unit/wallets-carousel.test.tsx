import React from 'react';
import { render } from '@testing-library/react-native';
import WalletsCarousel from '../../components/WalletsCarousel';

jest.mock('../../components/themes', () => {
  const actual = jest.requireActual('../../components/themes');
  return { ...actual, useTheme: () => actual.BlueDefaultTheme };
});

jest.mock('react-native-linear-gradient', () => {
  const { View: RNView } = require('react-native');
  return { __esModule: true, default: RNView };
});

jest.mock('../../blue_modules/sizeClass', () => {
  const actual = jest.requireActual('../../blue_modules/sizeClass');
  return { ...actual, useSizeClass: () => ({ sizeClass: actual.SizeClass.Large }) };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useLocale: () => ({ direction: 'ltr' }),
}));

describe('WalletsCarousel', () => {
  it('exposes testID on the large-screen (non-FlatList) container', () => {
    const { getByTestId } = render(
      <WalletsCarousel data={[]} onPress={() => {}} isFlatList={false} horizontal={false} testID="WalletsList" />,
    );
    expect(getByTestId('WalletsList')).toBeTruthy();
  });

  it('exposes testID on the FlatList', () => {
    const { getByTestId } = render(<WalletsCarousel data={[]} onPress={() => {}} testID="WalletsList" />);
    expect(getByTestId('WalletsList')).toBeTruthy();
  });
});
