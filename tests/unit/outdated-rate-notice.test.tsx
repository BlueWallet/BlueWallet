import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import OutdatedRateNotice from '../../components/OutdatedRateNotice';

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      buttonAlternativeTextColor: '#123456',
    },
  }),
}));

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    formatString: (template: string, params: Record<string, string>) => template.replace('{date}', params.date),
    send: {
      outdated_rate: 'Rate was last updated: {date}',
    },
    _: {
      refresh: 'Refresh',
    },
  },
}));

jest.mock('../../components/Badge', () => ({
  __esModule: true,
  default: ({ badgeStyle }: { badgeStyle?: object }) => <View testID="warning-badge" style={badgeStyle} />,
}));

jest.mock('../../components/BlueText', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
}));

jest.mock('../../components/Icon', () => ({
  __esModule: true,
  default: () => null,
}));

describe('OutdatedRateNotice', () => {
  it('renders the outdated-rate message and calls the refresh handler', () => {
    const onRefresh = jest.fn();
    const { getByText, getByLabelText } = render(
      <OutdatedRateNotice lastUpdated={new Date('2024-01-02T03:04:05.000Z')} onRefresh={onRefresh} isRefreshing={false} />,
    );

    expect(getByText(/Rate was last updated:/)).toBeTruthy();

    fireEvent.press(getByLabelText('Refresh'));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables the refresh action while the rate update is in flight', () => {
    const onRefresh = jest.fn();
    const { getByLabelText } = render(
      <OutdatedRateNotice lastUpdated={new Date('2024-01-02T03:04:05.000Z')} onRefresh={onRefresh} isRefreshing />,
    );

    const refreshButton = getByLabelText('Refresh');

    expect(refreshButton.props.style).toEqual({ opacity: 0.5 });

    fireEvent.press(refreshButton);

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
