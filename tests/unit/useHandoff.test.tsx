import assert from 'assert';
import React from 'react';
import { render } from '@testing-library/react-native';
import { NativeModules, View } from 'react-native';
import { HandOffActivityType } from '../../components/types';

// Import *after* mocks are in place
import useHandoff from '../../hooks/useHandoff';

// --- mocks ---

const mockBecomeCurrent = jest.fn();
const mockInvalidate = jest.fn();

NativeModules.BWHandoff = {
  becomeCurrent: mockBecomeCurrent,
  invalidate: mockInvalidate,
};

let mockHandOffEnabled = true;
jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ isHandOffUseEnabled: mockHandOffEnabled }),
}));

// Helper component that exercises the hook
// eslint-disable-next-line react/no-unused-prop-types
function HookRunner(props: { title?: string; type: HandOffActivityType; url?: string; userInfo?: object }) {
  useHandoff(props);
  return <View />;
}

describe('useHandoff', () => {
  beforeEach(() => {
    mockBecomeCurrent.mockClear();
    mockInvalidate.mockClear();
    mockHandOffEnabled = true;
  });

  it('calls becomeCurrent when given a url', () => {
    render(<HookRunner title="View Transaction" type={HandOffActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
    const call = mockBecomeCurrent.mock.calls[0];
    assert.strictEqual(typeof call[0], 'number'); // activityId
    assert.strictEqual(call[1], HandOffActivityType.ViewInBlockExplorer);
    assert.strictEqual(call[2], 'View Transaction');
    assert.strictEqual(call[3], null); // no userInfo
    assert.strictEqual(call[4], 'https://mempool.space/tx/abc123');
  });

  it('calls becomeCurrent when given userInfo', () => {
    render(<HookRunner title="Receive" type={HandOffActivityType.ReceiveOnchain} userInfo={{ address: 'bc1q...' }} />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
    const call = mockBecomeCurrent.mock.calls[0];
    assert.strictEqual(call[1], HandOffActivityType.ReceiveOnchain);
    assert.deepStrictEqual(call[3], { address: 'bc1q...' });
    assert.strictEqual(call[4], null); // no url
  });

  it('does not call becomeCurrent when handoff is disabled', () => {
    mockHandOffEnabled = false;

    render(<HookRunner title="View Transaction" type={HandOffActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('does not call becomeCurrent when url and userInfo are both empty', () => {
    render(<HookRunner title="Empty" type={HandOffActivityType.ViewInBlockExplorer} />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('does not call becomeCurrent for blank url without userInfo', () => {
    render(<HookRunner title="Blank" type={HandOffActivityType.ViewInBlockExplorer} url="   " />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('does not call becomeCurrent for empty userInfo object', () => {
    render(<HookRunner title="Empty Object" type={HandOffActivityType.ReceiveOnchain} userInfo={{}} />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('calls invalidate on unmount', () => {
    const { unmount } = render(
      <HookRunner title="View Transaction" type={HandOffActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />,
    );

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
    const activityId = mockBecomeCurrent.mock.calls[0][0];

    unmount();

    assert.strictEqual(mockInvalidate.mock.calls.length, 1);
    assert.strictEqual(mockInvalidate.mock.calls[0][0], activityId);
  });

  it('invalidates previous activity when url changes', () => {
    const { rerender } = render(
      <HookRunner title="View Transaction" type={HandOffActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />,
    );

    const firstId = mockBecomeCurrent.mock.calls[0][0];

    rerender(<HookRunner title="View Transaction" type={HandOffActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/def456" />);

    // Should have invalidated the first activity
    assert.strictEqual(mockInvalidate.mock.calls.length, 1);
    assert.strictEqual(mockInvalidate.mock.calls[0][0], firstId);

    // Should have created a new activity
    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 2);
    assert.strictEqual(mockBecomeCurrent.mock.calls[1][4], 'https://mempool.space/tx/def456');
  });

  it('invalidates when handoff becomes disabled', () => {
    const { rerender } = render(
      <HookRunner title="View Transaction" type={HandOffActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />,
    );

    const firstId = mockBecomeCurrent.mock.calls[0][0];
    mockHandOffEnabled = false;

    rerender(<HookRunner title="View Transaction" type={HandOffActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />);

    // Should invalidate the old activity
    assert.strictEqual(mockInvalidate.mock.calls.length, 1);
    assert.strictEqual(mockInvalidate.mock.calls[0][0], firstId);

    // Should NOT create a new activity
    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
  });

  it('uses empty string for title when not provided', () => {
    render(<HookRunner type={HandOffActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
    assert.strictEqual(mockBecomeCurrent.mock.calls[0][2], '');
  });

  it('assigns incrementing activity IDs', () => {
    const { unmount: unmount1 } = render(
      <HookRunner title="First" type={HandOffActivityType.ViewInBlockExplorer} url="https://example.com/1" />,
    );
    const id1 = mockBecomeCurrent.mock.calls[0][0];
    unmount1();

    const { unmount: unmount2 } = render(
      <HookRunner title="Second" type={HandOffActivityType.ViewInBlockExplorer} url="https://example.com/2" />,
    );
    const id2 = mockBecomeCurrent.mock.calls[1][0];
    unmount2();

    assert.ok(id2 > id1, `Second ID (${id2}) should be greater than first ID (${id1})`);
  });
});
