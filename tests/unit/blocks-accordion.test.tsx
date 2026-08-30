import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ActivityIndicator } from 'react-native';

import BlocksAccordion from '../../components/BlocksAccordion';

const mockGetConfirmedBlockHeight = jest.fn();
const mockGetBlockTimestamps = jest.fn();

jest.mock('../../blue_modules/BlueElectrum', () => ({
  getConfirmedBlockHeight: (...args: unknown[]) => mockGetConfirmedBlockHeight(...args),
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
      blocks_confirmed_summary: 'Included in block {blockHeight}.',
      blocks_confirmed_fee_summary: 'With a size of {vsize} and a fee rate of {feeRate}, paying {fee} fee.',
    },
  },
  formatBalanceWithoutSuffix: (value: number | string) => String(value),
}));

const defaultProps = {
  txHash: 'abc123',
  isSent: false,
  isExpanded: false,
  vsize: 140,
  feeSats: 1000,
  feeRate: 7.1,
};

describe('BlocksAccordion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConfirmedBlockHeight.mockResolvedValue({ height: 800000, tip: 800000 });
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

  it('shows block inclusion summary when tx is behind tip', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValue({ height: 800000, tip: 800003 });
    const { getByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(getByText(/Included in block 800000\./)).toBeTruthy();
    });
  });

  it('renders fee summary alongside block inclusion text', async () => {
    const { getAllByText, getByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(getByText(/Confirmed in the latest block/)).toBeTruthy();
      expect(getAllByText('800000').length).toBeGreaterThan(0);
      expect(getByText(/With a size of/)).toBeTruthy();
      expect(getByText('140 vb')).toBeTruthy();
      expect(getByText('7.1 sats/vb')).toBeTruthy();
      expect(getByText('1000 sats')).toBeTruthy();
    });
  });

  it('renders block heights and timestamps in the carousel', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValue({ height: 800000, tip: 800003 });
    const { getByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(mockGetBlockTimestamps).toHaveBeenCalledWith([799998, 799999, 800000, 800001, 800002]);
    });
    await waitFor(() => {
      expect(getByText('799998')).toBeTruthy();
      expect(getByText('800002')).toBeTruthy();
    });
  });

  it('requests timestamps for the latest-block window when tip equals tx height', async () => {
    render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(mockGetBlockTimestamps).toHaveBeenCalledWith([799996, 799997, 799998, 799999, 800000]);
    });
  });

  it('treats negative tip lag as inclusion summary', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValue({ height: 800001, tip: 800000 });
    const { getByText, queryByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(getByText(/Included in block 800001\./)).toBeTruthy();
    });
    expect(queryByText(/Confirmed in the latest block/)).toBeNull();
  });

  it('centers carousel on confirmed block when tip lags behind height', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValue({ height: 800001, tip: 800000 });
    const { getAllByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(mockGetBlockTimestamps).toHaveBeenCalledWith([799999, 800000, 800001, 800002, 800003]);
    });
    await waitFor(() => {
      expect(getAllByText('800001').length).toBeGreaterThan(0);
    });
  });

  it('still renders summary when block timestamps fetch fails', async () => {
    mockGetBlockTimestamps.mockRejectedValueOnce(new Error('network'));
    const { getByText, queryByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(getByText(/Confirmed in the latest block/)).toBeTruthy();
    });
    expect(queryByText('Could not load block details. Tap to try again.')).toBeNull();
  });

  it('shows error message when block height lookup fails', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValue(null);
    const { getByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(getByText('Could not load block details. Tap to try again.')).toBeTruthy();
    });
  });

  it('retries fetch after error tap', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValueOnce(null).mockResolvedValueOnce({ height: 800000, tip: 800000 });
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

  it('retries fetch when re-expanded after collapse during error', async () => {
    mockGetConfirmedBlockHeight.mockResolvedValueOnce(null).mockResolvedValueOnce({ height: 800000, tip: 800000 });
    const { getByText, rerender, queryByText } = render(<BlocksAccordion {...defaultProps} isExpanded />);
    await waitFor(() => {
      expect(getByText('Could not load block details. Tap to try again.')).toBeTruthy();
    });

    rerender(<BlocksAccordion {...defaultProps} isExpanded={false} />);
    rerender(<BlocksAccordion {...defaultProps} isExpanded />);

    await waitFor(() => {
      expect(mockGetConfirmedBlockHeight).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(getByText(/Confirmed in the latest block \(800000\)/)).toBeTruthy();
    });
    expect(queryByText('Could not load block details. Tap to try again.')).toBeNull();
  });

  it('keeps loading indicator when txHash changes mid-flight', async () => {
    const pending: Record<string, { resolve: (value: { height: number; tip: number } | null) => void }> = {};
    mockGetConfirmedBlockHeight.mockImplementation(
      (hash: string) =>
        new Promise<{ height: number; tip: number } | null>(resolve => {
          pending[hash] = { resolve };
        }),
    );

    const { rerender, getByText, UNSAFE_getAllByType } = render(<BlocksAccordion {...defaultProps} isExpanded txHash="first-tx" />);

    await waitFor(() => {
      expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    });

    rerender(<BlocksAccordion {...defaultProps} isExpanded txHash="second-tx" />);

    await waitFor(() => {
      expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    });

    await act(async () => {
      pending['first-tx'].resolve({ height: 800001, tip: 800005 });
      await Promise.resolve();
    });

    // The first (stale) request must not clear the loading state of the second request.
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    expect(mockGetBlockTimestamps).not.toHaveBeenCalled();

    await act(async () => {
      pending['second-tx'].resolve({ height: 800002, tip: 800005 });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getByText(/Included in block 800002\./)).toBeTruthy();
    });
  });

  it('ignores stale fetch results after txHash changes mid-flight', async () => {
    const pending: Record<string, { resolve: (value: { height: number; tip: number } | null) => void }> = {};
    mockGetConfirmedBlockHeight.mockImplementation(
      (hash: string) =>
        new Promise<{ height: number; tip: number } | null>(resolve => {
          pending[hash] = { resolve };
        }),
    );

    const { rerender, getByText, queryByText } = render(<BlocksAccordion {...defaultProps} isExpanded txHash="first-tx" />);

    await waitFor(() => {
      expect(mockGetConfirmedBlockHeight).toHaveBeenCalledWith('first-tx');
    });

    rerender(<BlocksAccordion {...defaultProps} isExpanded txHash="second-tx" />);

    await act(async () => {
      pending['first-tx'].resolve({ height: 800001, tip: 800005 });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockGetConfirmedBlockHeight).toHaveBeenCalledWith('second-tx');
    });

    await act(async () => {
      pending['second-tx'].resolve({ height: 800002, tip: 800005 });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getByText(/Included in block 800002\./)).toBeTruthy();
    });
    expect(queryByText(/Included in block 800001\./)).toBeNull();
  });
});
