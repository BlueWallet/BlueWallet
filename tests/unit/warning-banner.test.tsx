import React from 'react';
import { render } from '@testing-library/react-native';

import WarningBanner from '../../components/WarningBanner';

const mockColors = {
  warningBannerBackground: '#BG',
  warningBannerBorder: '#BORDER',
  warningBannerText: '#TEXT',
};

jest.mock('../../components/themes', () => ({
  useTheme: () => ({ colors: mockColors }),
}));

describe('WarningBanner', () => {
  it('renders the given text inside the banner', () => {
    const { getByTestId, getByText } = render(<WarningBanner text="Keep them separate" testID="Banner" />);

    expect(getByTestId('Banner')).toBeTruthy();
    expect(getByText('Keep them separate')).toBeTruthy();
  });

  it('uses the theme warning colors for background, border and text', () => {
    const { getByTestId, getByText } = render(<WarningBanner text="Keep them separate" testID="Banner" />);

    expect(getByTestId('Banner').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#BG', borderColor: '#BORDER' })]),
    );
    expect(getByText('Keep them separate').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#TEXT' })]));
  });
});
