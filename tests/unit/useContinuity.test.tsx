import assert from 'assert';
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { ContinuityActivityType } from '../../components/types';

// Import *after* mocks are in place
import useContinuity from '../../hooks/useContinuity';

// --- mocks ---

const mockBecomeCurrent = jest.fn();
const mockInvalidate = jest.fn();

jest.mock('../../codegen/NativeReactNativeContinuity', () => ({
  __esModule: true,
  default: {
    becomeCurrent: (...args: any[]) => mockBecomeCurrent(...args),
    invalidate: (...args: any[]) => mockInvalidate(...args),
  },
}));

let mockContinuityEnabled = true;
jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ isContinuityEnabled: mockContinuityEnabled }),
}));

// Helper component that exercises the hook
// eslint-disable-next-line react/no-unused-prop-types
function HookRunner(props: { title?: string; type: ContinuityActivityType; url?: string; userInfo?: object }) {
  useContinuity(props);
  return <View />;
}

describe('useContinuity', () => {
  beforeEach(() => {
    mockBecomeCurrent.mockClear();
    mockInvalidate.mockClear();
    mockContinuityEnabled = true;
  });

  it('calls becomeCurrent when given a url', () => {
    render(<HookRunner title="View Transaction" type={ContinuityActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
    const call = mockBecomeCurrent.mock.calls[0];
    assert.strictEqual(typeof call[0], 'number'); // activityId
    assert.strictEqual(call[1], ContinuityActivityType.ViewInBlockExplorer);
    assert.strictEqual(call[2], 'View Transaction');
    assert.strictEqual(call[3], null); // no userInfo
    assert.strictEqual(call[4], 'https://mempool.space/tx/abc123');
  });

  it('calls becomeCurrent when given userInfo', () => {
    render(<HookRunner title="Receive" type={ContinuityActivityType.ReceiveOnchain} userInfo={{ address: 'bc1q...' }} />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
    const call = mockBecomeCurrent.mock.calls[0];
    assert.strictEqual(call[1], ContinuityActivityType.ReceiveOnchain);
    assert.deepStrictEqual(call[3], { address: 'bc1q...' });
    assert.strictEqual(call[4], null); // no url
  });

  it('does not call becomeCurrent when continuity is disabled', () => {
    mockContinuityEnabled = false;

    render(<HookRunner title="View Transaction" type={ContinuityActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('does not call becomeCurrent when url and userInfo are both empty', () => {
    render(<HookRunner title="Empty" type={ContinuityActivityType.ViewInBlockExplorer} />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('does not call becomeCurrent for blank url without userInfo', () => {
    render(<HookRunner title="Blank" type={ContinuityActivityType.ViewInBlockExplorer} url="   " />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('does not call becomeCurrent for empty userInfo object', () => {
    render(<HookRunner title="Empty Object" type={ContinuityActivityType.ReceiveOnchain} userInfo={{}} />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('does not call becomeCurrent when all userInfo values are empty strings', () => {
    render(<HookRunner title="All Empty" type={ContinuityActivityType.SendOnchain} userInfo={{ address: '', memo: '' }} />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('does not call becomeCurrent when all userInfo values are null or empty arrays', () => {
    render(
      <HookRunner
        title="SendDetails initial state"
        type={ContinuityActivityType.SendOnchain}
        userInfo={{ address: '', amount: null, recipients: [], walletID: null }}
      />,
    );

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('does not call becomeCurrent when recipients array contains only empty-value objects', () => {
    render(
      <HookRunner
        title="SendDetails blank recipient"
        type={ContinuityActivityType.SendOnchain}
        userInfo={{ recipients: [{ address: '', amount: '' }] }}
      />,
    );

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 0);
  });

  it('calls becomeCurrent when at least one userInfo value is meaningful', () => {
    render(
      <HookRunner
        title="SendDetails with address"
        type={ContinuityActivityType.SendOnchain}
        userInfo={{ address: 'bc1qxxx', amount: '', recipients: [], walletID: null }}
      />,
    );

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
    assert.deepStrictEqual(mockBecomeCurrent.mock.calls[0][3], { address: 'bc1qxxx', amount: '', recipients: [], walletID: null });
  });

  it('calls invalidate on unmount', () => {
    const { unmount } = render(
      <HookRunner title="View Transaction" type={ContinuityActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />,
    );

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
    const activityId = mockBecomeCurrent.mock.calls[0][0];

    unmount();

    assert.strictEqual(mockInvalidate.mock.calls.length, 1);
    assert.strictEqual(mockInvalidate.mock.calls[0][0], activityId);
  });

  it('invalidates previous activity when url changes', () => {
    const { rerender } = render(
      <HookRunner title="View Transaction" type={ContinuityActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />,
    );

    const firstId = mockBecomeCurrent.mock.calls[0][0];

    rerender(
      <HookRunner title="View Transaction" type={ContinuityActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/def456" />,
    );

    // Should have invalidated the first activity
    assert.strictEqual(mockInvalidate.mock.calls.length, 1);
    assert.strictEqual(mockInvalidate.mock.calls[0][0], firstId);

    // Should have created a new activity
    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 2);
    assert.strictEqual(mockBecomeCurrent.mock.calls[1][4], 'https://mempool.space/tx/def456');
  });

  it('invalidates when continuity becomes disabled', () => {
    const { rerender } = render(
      <HookRunner title="View Transaction" type={ContinuityActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />,
    );

    const firstId = mockBecomeCurrent.mock.calls[0][0];
    mockContinuityEnabled = false;

    rerender(
      <HookRunner title="View Transaction" type={ContinuityActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />,
    );

    // Should invalidate the old activity
    assert.strictEqual(mockInvalidate.mock.calls.length, 1);
    assert.strictEqual(mockInvalidate.mock.calls[0][0], firstId);

    // Should NOT create a new activity
    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
  });

  it('uses empty string for title when not provided', () => {
    render(<HookRunner type={ContinuityActivityType.ViewInBlockExplorer} url="https://mempool.space/tx/abc123" />);

    assert.strictEqual(mockBecomeCurrent.mock.calls.length, 1);
    assert.strictEqual(mockBecomeCurrent.mock.calls[0][2], '');
  });

  it('assigns incrementing activity IDs', () => {
    const { unmount: unmount1 } = render(
      <HookRunner title="First" type={ContinuityActivityType.ViewInBlockExplorer} url="https://example.com/1" />,
    );
    const id1 = mockBecomeCurrent.mock.calls[0][0];
    unmount1();

    const { unmount: unmount2 } = render(
      <HookRunner title="Second" type={ContinuityActivityType.ViewInBlockExplorer} url="https://example.com/2" />,
    );
    const id2 = mockBecomeCurrent.mock.calls[1][0];
    unmount2();

    assert.ok(id2 > id1, `Second ID (${id2}) should be greater than first ID (${id1})`);
  });
});
