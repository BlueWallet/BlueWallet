import React from 'react';
import { act, render } from '@testing-library/react-native';
import { View } from 'react-native';
import { FButton, FContainer, getFloatingButtonReservedHeight } from '../../components/FloatButtons.native';

const mockSetItems = jest.fn();
const mockClearItems = jest.fn();
const mockRemove = jest.fn();
let mockActionListener: ((event: { ownerId: string; itemId: string; kind: 'press' | 'longPress' }) => void) | undefined;

jest.mock('../../blue_modules/environment', () => ({ isDesktop: true }));
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useIsFocused: () => true };
});
jest.mock('../../codegen/NativeCatalystToolbar', () => ({
  __esModule: true,
  default: {
    setItems: mockSetItems,
    clearItems: mockClearItems,
    onPress: (listener: typeof mockActionListener) => {
      mockActionListener = listener;
      return { remove: mockRemove };
    },
  },
}));

describe('Catalyst FloatButtons toolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActionListener = undefined;
  });

  it('publishes buttons as native toolbar items and dispatches their actions', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const result = render(
      <FContainer>
        <FButton
          icon={<View />}
          onLongPress={onLongPress}
          onPress={onPress}
          systemImageName="arrow.up.circle"
          testID="SendButton"
          text="Send"
        />
      </FContainer>,
    );

    expect(mockSetItems).toHaveBeenCalledTimes(1);
    const [ownerId, itemsJson] = mockSetItems.mock.calls[0];
    expect(JSON.parse(itemsJson)).toEqual([
      {
        id: 'SendButton',
        title: 'Send',
        systemImageName: 'arrow.up.circle',
        disabled: false,
        hasSecondaryAction: true,
      },
    ]);
    expect(getFloatingButtonReservedHeight(1, 20)).toBe(0);

    act(() => mockActionListener?.({ ownerId, itemId: 'SendButton', kind: 'press' }));
    act(() => mockActionListener?.({ ownerId, itemId: 'SendButton', kind: 'longPress' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    result.unmount();
    expect(mockClearItems).toHaveBeenCalledWith(ownerId);
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
