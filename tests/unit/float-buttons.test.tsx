import React from 'react';
import { act, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { FButton, FContainer } from '../../components/FloatButtons';

jest.mock('../../components/themes', () => {
  const actual = jest.requireActual('../../components/themes');
  return { ...actual, useTheme: () => actual.BlueDefaultTheme };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-linear-gradient', () => {
  const { View: RNView } = require('react-native');
  return { __esModule: true, default: RNView };
});

jest.mock('../../blue_modules/sizeClass', () => {
  const actual = jest.requireActual('../../blue_modules/sizeClass');
  return { ...actual, useSizeClass: () => ({ sizeClass: actual.SizeClass.Large }) };
});

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 1600, height: 1000, fontScale: 1, scale: 2 }),
}));

// Mirrors LAYOUT in FloatButtons.tsx
const PADDINGS = 30;
const BUTTON_MARGIN = 10;
const SIDE_MARGIN = 16;

const buttons = (count: number) => (
  <FContainer>
    {Array.from({ length: count }, (_, i) => (
      <FButton key={i} onPress={() => {}} text={`Button ${i}`} icon={<View />} />
    ))}
  </FContainer>
);

const renderButtons = (count: number) => render(buttons(count));

const buttonWidths = (result: ReturnType<typeof renderButtons>) => result.UNSAFE_getAllByType(FButton).map(b => b.props.width as number);

const measureParent = (result: ReturnType<typeof renderButtons>, width: number) =>
  act(() => {
    result.getByTestId('FContainerMeasure').props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 800 } } });
  });

const expectedWidth = (parentWidth: number, count: number) =>
  Math.floor((parentWidth - SIDE_MARGIN * 2 - BUTTON_MARGIN * (count - 1)) / count) - PADDINGS * 2;

describe('FContainer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it('sizes buttons from the measured parent width, not the window width', () => {
    const result = renderButtons(2);

    measureParent(result, 600);
    act(() => jest.advanceTimersByTime(200));

    expect(buttonWidths(result)).toEqual([219, 219]);
    expect(expectedWidth(600, 2)).toBe(219);
  });

  it('ignores a layout pass scheduled for a previous width', () => {
    const result = renderButtons(2);
    measureParent(result, 600);
    act(() => jest.advanceTimersByTime(200));

    // Re-arm the debounced pass on the 600px width and let its timer fire so its animation frames are pending.
    result.rerender(buttons(3));
    act(() => jest.advanceTimersByTime(16));

    // Narrower parent arrives while the stale frames are still queued.
    measureParent(result, 500);
    act(() => jest.advanceTimersByTime(32));
    expect(buttonWidths(result)).toEqual(Array(3).fill(expectedWidth(500, 3)));

    act(() => jest.advanceTimersByTime(200));
    expect(buttonWidths(result)).toEqual(Array(3).fill(expectedWidth(500, 3)));
  });
});
