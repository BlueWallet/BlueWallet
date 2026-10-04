import React from 'react';
import { fireEvent, isHiddenFromAccessibility, render } from '@testing-library/react-native';
import Icon from '../../components/Icon';

describe('Icon accessibility', () => {
  it('hides unlabeled decorative icons from accessibility', () => {
    const { getByTestId } = render(<Icon name="star" testID="icon" />);
    const icon = getByTestId('icon', { includeHiddenElements: true });

    expect(isHiddenFromAccessibility(icon)).toBe(true);
  });

  it('exposes labeled non-interactive icons', () => {
    const { getByLabelText } = render(<Icon name="star" accessibilityLabel="Favorite" />);
    const icon = getByLabelText('Favorite');

    expect(isHiddenFromAccessibility(icon)).toBe(false);
  });

  it('exposes and activates a labeled interactive icon', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Icon name="star" accessibilityLabel="Favorite" onPress={onPress} />);

    fireEvent.press(getByRole('imagebutton', { name: 'Favorite' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
