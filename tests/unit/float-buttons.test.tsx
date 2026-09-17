import React from 'react';
import { AccessibilityInfo, Animated, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { FButton, FContainer, FloatButtonsBottomFade } from '../../components/FloatButtons';

let mockInsets = { top: 0, bottom: 34, left: 44, right: 0 };
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => mockInsets }));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    dark: false,
    colors: { buttonBackgroundColor: '#123456', buttonAlternativeTextColor: '#ffffff', background: '#eeeeee' },
  }),
}));

const listeners = new Map<string, (value: boolean) => void>();
const remove = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockInsets = { top: 0, bottom: 34, left: 44, right: 0 };
  listeners.clear();
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((event: string, handler: any) => {
    listeners.set(event, handler);
    return { remove } as any;
  });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, 'isBoldTextEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'isDarkerSystemColorsEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(false);
});

afterEach(() => jest.restoreAllMocks());

it('reports actual wrapped height and updates reserved space when the safe area changes', () => {
  const onHeight = jest.fn();
  const tree = render(
    <FContainer onReservedHeightChange={onHeight}>
      <Text>Actions</Text>
    </FContainer>,
  );
  const measured = tree.UNSAFE_getAllByType(View).find(view => view.props.onLayout)!;
  fireEvent(measured, 'layout', { nativeEvent: { layout: { width: 280, height: 150 } } });
  expect(onHeight).toHaveBeenLastCalledWith(178);
  const outer = tree.UNSAFE_getAllByType(View)[0];
  expect(StyleSheet.flatten(outer.props.style)).toMatchObject({ paddingLeft: 60, paddingRight: 16, bottom: 44 });
  mockInsets = { top: 0, bottom: 0, left: 0, right: 44 };
  tree.rerender(
    <FContainer onReservedHeightChange={onHeight}>
      <Text>Actions</Text>
    </FContainer>,
  );
  expect(onHeight).toHaveBeenLastCalledWith(198);
  expect(StyleSheet.flatten(tree.UNSAFE_getAllByType(View)[0].props.style)).toMatchObject({
    paddingLeft: 16,
    paddingRight: 60,
    bottom: 30,
  });
});

it('keeps full scalable labels, gives images dimensions, and exposes disabled and long-press semantics', async () => {
  const onPress = jest.fn();
  const onLongPress = jest.fn();
  const tree = render(
    <FButton text="Send coins" icon={<Image source={{ uri: 'scan' }} />} disabled onPress={onPress} onLongPress={onLongPress} />,
  );
  await act(async () => {});
  const button = tree.getByRole('button', { name: 'Send coins' });
  expect(button.props.accessibilityState).toEqual({ disabled: true });
  fireEvent.press(button);
  fireEvent(button, 'accessibilityAction', { nativeEvent: { actionName: 'longpress' } });
  expect(onPress).not.toHaveBeenCalled();
  expect(onLongPress).not.toHaveBeenCalled();
  expect(tree.getByText('Send coins').props).toMatchObject({ allowFontScaling: true, maxFontSizeMultiplier: 0 });
  expect(tree.getByText('Send coins').props.numberOfLines).toBeUndefined();
  expect(StyleSheet.flatten(tree.UNSAFE_getByType(Image).props.style)).toMatchObject({ width: 24, height: 24 });
  tree.rerender(<FButton text="Send coins" icon={null} onPress={onPress} onLongPress={onLongPress} />);
  fireEvent(tree.getByRole('button'), 'accessibilityAction', { nativeEvent: { actionName: 'longpress' } });
  expect(onLongPress).toHaveBeenCalledTimes(1);
});

it('responds to bold text and increased contrast, and removes preference listeners', async () => {
  const tree = render(<FButton text="Receive" icon={<View testID="icon" />} onPress={jest.fn()} />);
  await act(async () => {});
  act(() => listeners.get('boldTextChanged')!(true));
  expect(StyleSheet.flatten(tree.getByText('Receive').props.style).fontWeight).toBe('800');
  act(() => listeners.get('darkerSystemColorsChanged')!(true));
  expect(StyleSheet.flatten(tree.getByRole('button').props.style).backgroundColor).toBe('#000000');
  expect(StyleSheet.flatten(tree.getByText('Receive').props.style).color).toBe('#ffffff');
  expect(tree.queryByTestId('icon')).toBeNull();
  remove.mockClear();
  tree.unmount();
  expect(remove).toHaveBeenCalledTimes(4);
});

it('skips press animations for reduced motion and responds when it changes', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const tree = render(<FButton text="Scan" icon={null} onPress={jest.fn()} />);
  await act(async () => {});
  fireEvent(tree.getByRole('button'), 'pressIn');
  expect(timing).not.toHaveBeenCalled();
  act(() => listeners.get('reduceMotionChanged')!(false));
  fireEvent(tree.getByRole('button'), 'pressIn');
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0.96 }));
});

it('replaces the decorative gradient with an opaque background for reduced transparency', async () => {
  const tree = render(<FloatButtonsBottomFade />);
  await waitFor(() =>
    expect(tree.toJSON()).toEqual(expect.objectContaining({ children: [expect.objectContaining({ type: 'LinearGradient' })] })),
  );
  act(() => listeners.get('reduceTransparencyChanged')!(true));
  expect(tree.toJSON()).toEqual(expect.objectContaining({ children: [expect.objectContaining({ type: 'View' })] }));
});

it('uses the Android high-text-contrast preference', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(AccessibilityInfo, 'isHighTextContrastEnabled').mockResolvedValue(true);
  const tree = render(<FButton text="Send" icon={null} onPress={jest.fn()} />);
  await waitFor(() => expect(StyleSheet.flatten(tree.getByRole('button').props.style).backgroundColor).toBe('#000000'));
  expect(AccessibilityInfo.isBoldTextEnabled).not.toHaveBeenCalled();
  act(() => listeners.get('highTextContrastChanged')!(false));
  expect(StyleSheet.flatten(tree.getByRole('button').props.style).backgroundColor).toBe('#123456');
});

it('does not overwrite a new accessibility preference with a stale initial query', async () => {
  let resolveMotion!: (value: boolean) => void;
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(
    new Promise(resolve => {
      resolveMotion = resolve;
    }),
  );
  const timing = jest.spyOn(Animated, 'timing');
  const tree = render(<FButton text="Scan" icon={null} onPress={jest.fn()} />);
  act(() => listeners.get('reduceMotionChanged')!(true));
  await act(async () => resolveMotion(false));
  fireEvent(tree.getByRole('button'), 'pressIn');
  expect(timing).not.toHaveBeenCalled();
});
