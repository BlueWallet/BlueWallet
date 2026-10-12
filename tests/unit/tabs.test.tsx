import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Tabs } from '../../components/Tabs';

jest.mock('../../components/themes', () => ({
  useTheme: () => ({ colors: { buttonAlternativeTextColor: '#fff' } }),
}));

const CoinTab = () => <Text>Coin icon</Text>;
const SixSidedDieTab = () => <Text>Six-sided die icon</Text>;
const TwentySidedDieTab = () => <Text>Twenty-sided die icon</Text>;

describe('Tabs accessibility', () => {
  it('exposes named tabs, their selected state, and switches by accessible control', () => {
    const onSwitch = jest.fn();
    const { getByRole } = render(
      <Tabs
        active={1}
        onSwitch={onSwitch}
        tabs={[CoinTab, SixSidedDieTab, TwentySidedDieTab]}
        accessibilityLabels={['Flip coin', 'Roll six-sided die', 'Roll twenty-sided die']}
      />,
    );

    expect(getByRole('button', { name: 'Flip coin', selected: false })).toBeTruthy();
    expect(getByRole('button', { name: 'Roll six-sided die', selected: true })).toBeTruthy();

    fireEvent.press(getByRole('button', { name: 'Roll twenty-sided die', selected: false }));

    expect(onSwitch).toHaveBeenCalledWith(2);
  });
});
