import React from 'react';
import { act, render } from '@testing-library/react-native';

import { TxVerificationError } from '../../class/hd-segwit-bech32-transaction';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import loc from '../../loc';
import CPFP from '../../screen/transactions/CPFP';
import RBFBumpFee from '../../screen/transactions/RBFBumpFee';
import RBFCancel from '../../screen/transactions/RBFCancel';

const mockTx: Record<string, jest.Mock> = {};

jest.mock('../../class/hd-segwit-bech32-transaction', () => {
  const actual = jest.requireActual('../../class/hd-segwit-bech32-transaction');
  return {
    ...actual,
    HDSegwitBech32Transaction: jest.fn().mockImplementation(() => mockTx),
  };
});
jest.mock('../../blue_modules/BlueElectrum', () => ({}));
jest.mock('../../blue_modules/notifications', () => ({
  majorTomToGroundControl: jest.fn(),
}));
jest.mock('../../components/ReplaceFeeSuggestions', () => () => null);
jest.mock('../../components/SafeArea', () => {
  const { View } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
});
jest.mock('../../components/SafeAreaScrollView', () => {
  const { View } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => <View>{children}</View>;
});
jest.mock('../../components/themes', () => {
  const actual = jest.requireActual('../../components/themes');
  return { ...actual, useTheme: () => actual.BlueDefaultTheme };
});
jest.mock('../../hooks/useKeyboard', () => ({
  useKeyboard: () => ({ height: 0, isVisible: false }),
}));

const screens = [
  {
    name: 'RBFBumpFee',
    Screen: RBFBumpFee as any,
    notPossible: loc.transactions.cpfp_no_bump,
    create: 'createRBFbumpFee',
  },
  {
    name: 'RBFCancel',
    Screen: RBFCancel as any,
    notPossible: loc.transactions.cancel_no,
    create: 'createRBFcancelTx',
  },
  {
    name: 'CPFP',
    Screen: CPFP as any,
    notPossible: loc.transactions.cpfp_no_bump,
    create: 'createCPFPbumpFee',
  },
];

const makeWallet = () => {
  const wallet = new HDSegwitBech32Wallet();
  wallet.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
  return wallet;
};

const renderScreen = async (Screen: any) => {
  const ref = React.createRef<any>();
  const route = { params: { txid: 'a'.repeat(64), wallet: makeWallet() } };
  const utils = render(<Screen ref={ref} route={route} navigation={{ navigate: jest.fn() }} />);
  await act(async () => {}); // let componentDidMount finish
  return { ...utils, ref };
};

describe.each(screens)('$name screen', ({ Screen, notPossible, create }) => {
  beforeEach(() => {
    for (const k of Object.keys(mockTx)) delete mockTx[k];
    Object.assign(mockTx, {
      isOurTransaction: jest.fn().mockResolvedValue(true),
      isToUsTransaction: jest.fn().mockResolvedValue(true),
      getRemoteConfirmationsNum: jest.fn().mockResolvedValue(0),
      isSequenceReplaceable: jest.fn().mockResolvedValue(true),
      canCancelTx: jest.fn().mockResolvedValue(true),
      getInfo: jest.fn().mockResolvedValue({ feeRate: 1 }),
      createRBFbumpFee: jest.fn(),
      createRBFcancelTx: jest.fn(),
      createCPFPbumpFee: jest.fn(),
    });
  });

  it('shows fee selection for a transaction that checks out', async () => {
    const { ref, queryByText } = await renderScreen(Screen);
    expect(ref.current.state.isLoading).toBe(false);
    expect(ref.current.state.nonReplaceable).toBe(false);
    expect(queryByText(loc.transactions.rbf_unverified)).toBeNull();
  });

  it('shows "could not be verified" instead of spinning forever when verification fails', async () => {
    mockTx.getInfo.mockRejectedValue(new TxVerificationError('invalid signature'));
    const { ref, getByText } = await renderScreen(Screen);
    expect(ref.current.state.isLoading).toBe(false);
    expect(ref.current.state.tx).toBeUndefined();
    getByText(loc.transactions.rbf_unverified);
  });

  it('shows the usual "not replaceable" message on other errors', async () => {
    mockTx.getInfo.mockRejectedValue(new Error('network down'));
    const { ref, getByText, queryByText } = await renderScreen(Screen);
    expect(ref.current.state.isLoading).toBe(false);
    getByText(notPossible);
    expect(queryByText(loc.transactions.rbf_unverified)).toBeNull();
  });

  it('stops and refuses to continue when verification fails while creating the replacement', async () => {
    mockTx[create].mockRejectedValue(new TxVerificationError('invalid signature'));
    const { ref, getByText } = await renderScreen(Screen);
    await act(async () => {
      ref.current.setState({ newFeeRate: 5 });
    });
    await act(async () => {
      await ref.current.createTransaction();
    });
    expect(mockTx[create]).toHaveBeenCalledWith(5);
    expect(ref.current.state.isLoading).toBe(false);
    expect(ref.current.state.stage).toBe(1);
    expect(ref.current.state.tx).toBeUndefined();
    getByText(loc.transactions.rbf_unverified);
  });
});
