import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PasswordInput } from '../../components/PasswordInput';
import { BlueDefaultTheme } from '../../components/themes';

describe('PasswordInput', () => {
  it('is not editable and does not submit while disabled', () => {
    const onSubmit = jest.fn();
    const { getByTestId, rerender } = render(
      <NavigationContainer theme={BlueDefaultTheme}>
        <PasswordInput onSubmit={onSubmit} />
      </NavigationContainer>,
    );
    const input = getByTestId('PasswordInput');

    fireEvent.changeText(input, 'password');
    expect(input.props.editable).toBe(true);

    rerender(
      <NavigationContainer theme={BlueDefaultTheme}>
        <PasswordInput onSubmit={onSubmit} disabled />
      </NavigationContainer>,
    );
    const disabledInput = getByTestId('PasswordInput');
    expect(disabledInput.props.editable).toBe(false);

    fireEvent(disabledInput, 'submitEditing');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
