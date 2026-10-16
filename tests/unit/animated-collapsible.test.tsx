import React from 'react';
import assert from 'assert';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';

import AnimatedCollapsible from '../../components/AnimatedCollapsible';

const renderItem = (expanded: boolean) => (
  <AnimatedCollapsible expanded={expanded}>{isLive => <Text testID={isLive ? 'LiveButton' : undefined}>button</Text>}</AnimatedCollapsible>
);

describe('AnimatedCollapsible', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders expanded content immediately and nothing when collapsed', () => {
    assert.strictEqual(render(renderItem(true)).queryByTestId('LiveButton') !== null, true);
    assert.strictEqual(render(renderItem(false)).queryByText('button') === null, true);
  });

  it('always ends expanded with the live content, whatever happened during the animation', () => {
    const screen = render(renderItem(false));
    screen.rerender(renderItem(true));
    assert.strictEqual(screen.queryByTestId('LiveButton') !== null, true); // live while opening
    act(() => jest.advanceTimersByTime(1000));
    assert.strictEqual(screen.queryByTestId('LiveButton') !== null, true);
  });

  it('drops the testID while collapsing and unmounts when done', () => {
    const screen = render(renderItem(true));
    screen.rerender(renderItem(false));
    assert.strictEqual(screen.queryByTestId('LiveButton') === null, true);
    assert.strictEqual(screen.queryByText('button') !== null, true); // still visible while it collapses
    act(() => jest.advanceTimersByTime(1000));
    assert.strictEqual(screen.queryByText('button') === null, true);
  });

  it('settles on the latest state when toggled mid-animation', () => {
    const screen = render(renderItem(false));
    screen.rerender(renderItem(true));
    act(() => jest.advanceTimersByTime(200));
    screen.rerender(renderItem(false));
    act(() => jest.advanceTimersByTime(200));
    screen.rerender(renderItem(true));
    act(() => jest.advanceTimersByTime(1000));
    assert.strictEqual(screen.queryByTestId('LiveButton') !== null, true);
  });
});
