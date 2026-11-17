import React from 'react';
import assert from 'assert';
import { Keyboard, ScrollView, SectionList, Text } from 'react-native';
import { act, render } from '@testing-library/react-native';

import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import SafeAreaSectionList from '../../components/SafeAreaSectionList';

let mockFocused = true;

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({ colors: { background: '#fff', elevated: '#fff' } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

type Listener = () => void;

describe('keyboard inset focus gate', () => {
  const listeners: Record<string, Listener[]> = {};
  let metrics: {
    height: number;
    screenY: number;
    width: number;
    screenX: number;
  } | null = null;

  beforeEach(() => {
    mockFocused = true;
    metrics = null;
    for (const key of Object.keys(listeners)) delete listeners[key];
    jest.spyOn(Keyboard, 'addListener').mockImplementation((type, listener) => {
      const bucket = listeners[type] ?? [];
      bucket.push(listener as Listener);
      listeners[type] = bucket;
      return {
        remove: () => {
          listeners[type] = bucket.filter(item => item !== listener);
        },
      };
    });
    jest.spyOn(Keyboard, 'metrics').mockImplementation(() => metrics as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const scroll = (focused = mockFocused) => {
    mockFocused = focused;
    return render(
      <SafeAreaScrollView automaticallyAdjustKeyboardInsets>
        <Text>field</Text>
      </SafeAreaScrollView>,
    );
  };

  const insetProp = (screen: ReturnType<typeof scroll>) => screen.UNSAFE_getByType(ScrollView).props.automaticallyAdjustKeyboardInsets;

  it('passes the flag through while the screen is focused and drops it when nothing is showing', () => {
    const screen = scroll(true);
    assert.strictEqual(insetProp(screen), true);

    mockFocused = false;
    screen.rerender(
      <SafeAreaScrollView automaticallyAdjustKeyboardInsets>
        <Text>field</Text>
      </SafeAreaScrollView>,
    );
    assert.strictEqual(insetProp(screen), false);
  });

  it('keeps the flag until keyboardDidHide so a covered screen can clear its inset', () => {
    const screen = scroll(true);
    metrics = { height: 320, screenY: 400, width: 390, screenX: 0 };
    mockFocused = false;
    screen.rerender(
      <SafeAreaScrollView automaticallyAdjustKeyboardInsets>
        <Text>field</Text>
      </SafeAreaScrollView>,
    );

    assert.strictEqual(insetProp(screen), true);

    act(() => {
      for (const listener of listeners.keyboardDidHide ?? []) listener();
    });

    assert.strictEqual(insetProp(screen), false);
  });

  it('leaves the flag off when the screen did not opt in', () => {
    mockFocused = true;
    const screen = render(
      <SafeAreaScrollView>
        <Text>field</Text>
      </SafeAreaScrollView>,
    );
    assert.strictEqual(insetProp(screen), false);
  });

  it('gates SafeAreaSectionList the same way', () => {
    mockFocused = false;
    const screen = render(<SafeAreaSectionList automaticallyAdjustKeyboardInsets sections={[]} renderItem={() => null} />);
    assert.strictEqual(screen.UNSAFE_getByType(SectionList).props.automaticallyAdjustKeyboardInsets, false);

    mockFocused = true;
    screen.rerender(<SafeAreaSectionList automaticallyAdjustKeyboardInsets sections={[]} renderItem={() => null} />);
    assert.strictEqual(screen.UNSAFE_getByType(SectionList).props.automaticallyAdjustKeyboardInsets, true);
  });
});
