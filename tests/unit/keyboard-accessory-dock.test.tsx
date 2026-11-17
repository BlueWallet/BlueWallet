import React from 'react';
import { Keyboard, KeyboardEvent, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';

import KeyboardAccessoryDock from '../../components/KeyboardAccessoryDock';

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: { elevated: '#111111', inputBackgroundColor: '#222222', formBorder: '#333333', background: '#000000' },
  }),
}));

describe('KeyboardAccessoryDock', () => {
  const listeners: Partial<Record<string, (event: KeyboardEvent) => void>> = {};

  beforeEach(() => {
    for (const key of Object.keys(listeners)) delete listeners[key];
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
      listeners[event] = callback as (keyboardEvent: KeyboardEvent) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const showKeyboard = (height = 300) => {
    act(() => {
      listeners.keyboardDidShow?.({ endCoordinates: { height } } as KeyboardEvent);
    });
  };

  it('keeps the iOS keyboard height when focus moves to another field', () => {
    const screen = render(
      <KeyboardAccessoryDock active accessory={<Text>DoneBar</Text>}>
        <Text>Body</Text>
      </KeyboardAccessoryDock>,
    );

    expect(screen.queryByText('DoneBar')).toBeNull();
    showKeyboard();
    expect(screen.getByText('DoneBar')).toBeTruthy();

    screen.rerender(
      <KeyboardAccessoryDock active={false} accessory={<Text>DoneBar</Text>}>
        <Text>Body</Text>
      </KeyboardAccessoryDock>,
    );
    expect(screen.queryByText('DoneBar')).toBeNull();

    screen.rerender(
      <KeyboardAccessoryDock active accessory={<Text>DoneBar</Text>}>
        <Text>Body</Text>
      </KeyboardAccessoryDock>,
    );
    expect(screen.getByText('DoneBar')).toBeTruthy();
  });

  it('hides the bar when the keyboard closes', () => {
    const screen = render(
      <KeyboardAccessoryDock active accessory={<Text>DoneBar</Text>}>
        <Text>Body</Text>
      </KeyboardAccessoryDock>,
    );
    showKeyboard();
    expect(screen.getByText('DoneBar')).toBeTruthy();

    act(() => {
      listeners.keyboardDidHide?.({ endCoordinates: { height: 0 } } as KeyboardEvent);
    });
    expect(screen.queryByText('DoneBar')).toBeNull();
  });
});
