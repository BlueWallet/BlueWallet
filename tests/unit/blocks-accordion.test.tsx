import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockGetConfirmedBlockHeight = jest.fn();
const mockGetCurrentBlockTip = jest.fn();
const mockGetBlockTimestamps = jest.fn();

jest.mock('../../blue_modules/BlueElectrum', () => ({
  getConfirmedBlockHeight: (...args: unknown[]) => mockGetConfirmedBlockHeight(...args),
  getCurrentBlockTip: (...args: unknown[]) => mockGetCurrentBlockTip(...args),
  getBlockTimestamps: (...args: unknown[]) => mockGetBlockTimestamps(...args),
}));

jest.mock('lottie-react-native', () => 'LottieView');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      transactionSentColor: '#d0021b',
      transactionReceivedColor: '#1e8a6a',
      outgoingForegroundColor: '#d0021b',
      incomingForegroundColor: '#1e8a6a',
    },
  }),
}));

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    formatString: (template: string, params: Record<string, string>) =>
      Object.entries(params).reduce((acc, [key, value]) => acc.replace(`{${key}}`, String(value)), template),
    transactions: {
      blocks_load_error: 'Could not load block details. Tap to try again.',
      blocks_confirmed_latest: 'Confirmed in the latest block ({blockHeight}).',
      blocks_confirmed_summary: 'Confirmed {count} blocks ago, on block {blockHeight}.',
      blocks_confirmed_fee_summary: 'With a size of {vsize} and a fee rate of {feeRate}, paying {fee} fee.',
    },
  },
  formatBalanceWithoutSuffix: (value: number | string) => String(value),
}));

import BlocksAccordion from '../../components/BlocksAccordion';

const defaultProps = {
  txHash: 'abc123',
  isSent: false,
  isExpanded: false,
  confirmations: 3,
  vsize: 140,
  feeSats: 1000,
  feeRate: 7.1,
};

describe('BlocksAccordion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConfirmedBlockHeight.mockResolvedValue(800000);
    mockGetCurrentBlockTip.mockResolvedValue(800000);
    mockGetBlockTimestamps.mockImplementation((heights: number[]) =>
      Promise.resolve(Object.fromEntries(heights.map(h => [h, 1700000000]))),
    );
  });

  it('does not fetch Electrum while collapsed', async () => {
    render(<BlocksAccordion {...defaultProps} isExpanded={false} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetConfirmedBlockHeight).not.toHaveBeenCalled();
    expect(mockGetCurrentBlockTip).not.toHaveBeenCalled();
  });

  it('fetches when expanded and shows latest-block summary when tip equals tx height', async () => {
    const { getByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(mockGetConfirmedBlockHeight).toHaveBeenCalledWith('abc123');
    });
    await waitFor(() => {
      expect(getByText(/Confirmed in the latest block \(800000\)/)).toBeTruthy();
    });
  });

  it('shows blocks-ago summary when tx is behind tip', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValue(800000);
    mockGetCurrentBlockTip.mockResolvedValue(800003);
    const { getByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(getByText(/Confirmed 3 blocks ago, on block 800000/)).toBeTruthy();
    });
  });

  it('shows error message when block height lookup fails', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValue(null);
    const { getByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(getByText('Could not load block details. Tap to try again.')).toBeTruthy();
    });
  });

  it('retries fetch after error tap', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValueOnce(null).mockResolvedValueOnce(800000);
    mockGetCurrentBlockTip.mockResolvedValue(800000);
    const { getByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(getByText('Could not load block details. Tap to try again.')).toBeTruthy();
    });
    fireEvent.press(getByText('Could not load block details. Tap to try again.'));
    await waitFor(() => {
      expect(mockGetConfirmedBlockHeight).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(getByText(/Confirmed in the latest block \(800000\)/)).toBeTruthy();
    });
  });

  it('ignores stale fetch results after txHash changes mid-flight', async () => {
    const pending: Record<string, { resolve: (value: number | null) => void }> = {};
    mockGetConfirmedBlockHeight.mockImplementation(
      (hash: string) =>
        new Promise<number | null>(resolve => {
          pending[hash] = { resolve };
        }),
    );
    mockGetCurrentBlockTip.mockResolvedValue(800005);

    const { rerender, getByText, queryByText } = render(
      <BlocksAccordion {...defaultProps} isExpanded txHash="first-tx" />,
    );

    await waitFor(() => {
      expect(mockGetConfirmedBlockHeight).toHaveBeenCalledWith('first-tx');
    });

    rerender(<BlocksAccordion {...defaultProps} isExpanded txHash="second-tx" />);

    await act(async () => {
      pending['first-tx'].resolve(800001);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockGetConfirmedBlockHeight).toHaveBeenCalledWith('second-tx');
    });

    await act(async () => {
      pending['second-tx'].resolve(800002);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getByText(/Confirmed 3 blocks ago, on block 800002/)).toBeTruthy();
    });
    expect(queryByText(/Confirmed 3 blocks ago, on block 800001/)).toBeNull();
  });
});
