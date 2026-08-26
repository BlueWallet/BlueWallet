import React from 'react';
import { configure, render } from '@testing-library/react-native';
import Icon from '../../components/Icon';

configure({ defaultIncludeHiddenElements: true });

jest.mock('@react-native-vector-icons/fontawesome', () => {
  const ReactLocal = require('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => ReactLocal.createElement('Text', props),
  };
});

describe('Icon accessibility', () => {
  it('hides unlabeled decorative icons from accessibility', () => {
    const { getByTestId } = render(<Icon name="star" testID="icon" />);
    const icon = getByTestId('icon');

    expect(icon.props.accessible).toBe(false);
    expect(icon.props.accessibilityElementsHidden).toBe(true);
    expect(icon.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('exposes labeled non-interactive icons', () => {
    const { getByTestId } = render(<Icon name="star" accessibilityLabel="Favorite" testID="icon" />);
    const icon = getByTestId('icon');

    expect(icon.props.accessible).toBe(true);
    expect(icon.props.accessibilityElementsHidden).toBe(false);
    expect(icon.props.importantForAccessibility).toBe('yes');
    expect(icon.props.accessibilityLabel).toBe('Favorite');
  });

  it('puts the label on the pressable for interactive icons', () => {
    const { getByRole } = render(<Icon name="star" accessibilityLabel="Favorite" onPress={jest.fn()} />);

    expect(getByRole('imagebutton').props.accessibilityLabel).toBe('Favorite');
  });
});
