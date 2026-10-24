import { createAlertConfig, getActionSheetAnchor } from '../../screen/ActionSheet.common';

it('uses the native event target when currentTarget is a host instance', () => {
  const event = { currentTarget: {}, nativeEvent: { target: 42 } } as any;
  expect(getActionSheetAnchor(event)).toBe(42);
});

it('makes a zero-index cancel button dismissible and completes it once', () => {
  const completion = jest.fn();
  const { buttons, alertOptions } = createAlertConfig({ options: ['Cancel', 'OK'], cancelButtonIndex: 0, anchor: 42 }, completion);

  expect(alertOptions.cancelable).toBe(true);

  alertOptions.onDismiss?.();
  buttons[0].onPress();
  expect(completion).toHaveBeenCalledTimes(1);
  expect(completion).toHaveBeenCalledWith(0);
});
