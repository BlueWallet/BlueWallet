import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { SettingsFootnote, SettingsListItem, SettingsSection } from '../../components/SettingsSection';

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    dark: false,
    colors: {
      foregroundColor: '#000000',
      alternativeTextColor: '#9aa0aa',
      cardSectionHeaderBackground: '#f2f2f7',
      cardSectionBackground: '#ffffff',
      background: '#ffffff',
    },
  }),
}));

describe('SettingsSection', () => {
  it('renders title and children', () => {
    const { getByText } = render(
      <SettingsSection title="Advanced">
        <Text>child row</Text>
      </SettingsSection>,
    );
    expect(getByText('Advanced')).toBeTruthy();
    expect(getByText('child row')).toBeTruthy();
  });

  it('renders no header when title and headerRight are absent', () => {
    const { queryByRole, getByText } = render(
      <SettingsSection>
        <Text>body only</Text>
      </SettingsSection>,
    );
    expect(queryByRole('button')).toBeNull();
    expect(getByText('body only')).toBeTruthy();
  });

  it('renders headerRight content', () => {
    const { getByTestId } = render(
      <SettingsSection title="Details" headerRight={<View testID="header-right" />}>
        <Text>row</Text>
      </SettingsSection>,
    );
    expect(getByTestId('header-right')).toBeTruthy();
  });

  it('calls onHeaderPress when the header is pressed', () => {
    const onHeaderPress = jest.fn();
    const { getByRole } = render(
      <SettingsSection title="Advanced" onHeaderPress={onHeaderPress}>
        <Text>row</Text>
      </SettingsSection>,
    );
    fireEvent.press(getByRole('button'));
    expect(onHeaderPress).toHaveBeenCalledTimes(1);
  });

  it('does not wrap the header in a button without onHeaderPress', () => {
    const { queryByRole } = render(
      <SettingsSection title="Plain">
        <Text>row</Text>
      </SettingsSection>,
    );
    expect(queryByRole('button')).toBeNull();
  });
});

describe('SettingsListItem', () => {
  it('renders title and forwards presses', () => {
    const onPress = jest.fn();
    const { getByText } = render(<SettingsListItem title="Currency" iconName="currency" onPress={onPress} testID="CurrencyItem" />);
    fireEvent.press(getByText('Currency'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsFootnote', () => {
  it('renders its text', () => {
    const { getByText } = render(<SettingsFootnote>explanation</SettingsFootnote>);
    expect(getByText('explanation')).toBeTruthy();
  });
});
